import { NextRequest, NextResponse } from 'next/server';
import { createOtp, verifyOtp, findAlumnusByUsn, maskEmail, maskPhone } from '@/lib/alumni';
import { getAttendees } from '@/lib/db';
import { sendEmailOtp, sendSmsOtp, sendEmailPass } from '@/lib/notifications';
import QRCode from 'qrcode';
import { getClientIp, checkOtpDispatchLimits, checkOtpVerifyAttempts, recordFailedOtpAttempt, resetFailedOtpAttempts } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const cookieToken = request.cookies.get('milan_otp_token')?.value;
    const { action, usn, channel = 'EMAIL', otp, otpToken, website } = body;

    if (website) {
      return NextResponse.json({ success: false, error: 'Suspicious bot activity detected.' }, { status: 400 });
    }

    if (!usn || typeof usn !== 'string') {
      return NextResponse.json({ success: false, error: 'USN is required' }, { status: 400 });
    }

    const cleanedUsn = usn.trim().toUpperCase();
    const clientIp = getClientIp(request);
    const attendees = await getAttendees();
    const attendee = attendees.find(
      a => (a.usn || a.rollNumber).trim().toUpperCase() === cleanedUsn
    );

    if (!attendee) {
      return NextResponse.json({
        success: false,
        error: `No registered pass found for USN "${cleanedUsn}". Please register first.`
      }, { status: 404 });
    }

    // ACTION 1: SEND LOGIN OTP
    if (action === 'SEND_OTP') {
      const lockCheck = checkOtpVerifyAttempts(cleanedUsn);
      if (!lockCheck.allowed) {
        return NextResponse.json({ success: false, error: lockCheck.error }, { status: 429 });
      }

      const rateCheck = checkOtpDispatchLimits(cleanedUsn, clientIp);
      if (!rateCheck.allowed) {
        return NextResponse.json({ success: false, error: rateCheck.error }, { status: 429 });
      }

      const master = findAlumnusByUsn(cleanedUsn);
      const email = attendee.email || master?.officialEmail || '';
      const phone = attendee.phone || master?.phone || '';
      const target = channel === 'PHONE' ? phone : email;

      if (!target) {
        return NextResponse.json({
          success: false,
          error: `No registered ${channel.toLowerCase()} found for this pass. Please contact the organizers.`
        }, { status: 400 });
      }

      const otpResult = await createOtp(cleanedUsn, channel === 'PHONE' ? 'PHONE' : 'EMAIL', target);
      if (!otpResult) {
        return NextResponse.json({ success: false, error: 'Failed to create OTP' }, { status: 500 });
      }

      let dispatchResult;
      if (channel === 'PHONE') {
        dispatchResult = await sendSmsOtp({ toPhone: target, otp: otpResult.otp, recipientName: attendee.fullName, usn: cleanedUsn });
      } else {
        dispatchResult = await sendEmailOtp({ toEmail: target, otp: otpResult.otp, recipientName: attendee.fullName, usn: cleanedUsn });
      }

      if (dispatchResult && !dispatchResult.success && dispatchResult.provider !== 'SIMULATION') {
        return NextResponse.json({
          success: false,
          error: dispatchResult.error ? `Email delivery failed: ${dispatchResult.error}` : 'Could not deliver unlock code to registered contact.',
          dispatchError: dispatchResult.error,
        }, { status: 502 });
      }

      const response = NextResponse.json({
        success: true,
        message: dispatchResult?.isReal ? `Real unlock code delivered to ${channel === 'PHONE' ? maskPhone(phone) : maskEmail(email)}!` : `Simulation Mode: Unlock code is ${otpResult.otp}`,
        maskedTarget: channel === 'PHONE' ? maskPhone(phone) : maskEmail(email),
        isRealDelivery: dispatchResult?.isReal || false,
        deliveryProvider: dispatchResult?.provider || 'SIMULATION',
        simulationCode: !dispatchResult?.isReal ? otpResult.otp : undefined,
        dispatchError: dispatchResult?.error,
        simulationNotice: dispatchResult?.provider === 'SIMULATION' ? dispatchResult.message : undefined,
        otpToken: otpResult.statelessToken,
      });

      if (otpResult.statelessToken) {
        response.cookies.set('milan_otp_token', otpResult.statelessToken, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: 600 });
      }
      return response;
    }

    // ACTION 2: VERIFY OTP AND UNLOCK PASS
    if (action === 'VERIFY_OTP') {
      const lockCheck = checkOtpVerifyAttempts(cleanedUsn);
      if (!lockCheck.allowed) {
        return NextResponse.json({ success: false, error: lockCheck.error }, { status: 429 });
      }

      if (!otp || typeof otp !== 'string') {
        return NextResponse.json({ success: false, error: '6-digit OTP code is required' }, { status: 400 });
      }

      const effectiveToken = otpToken || cookieToken;
      const verification = await verifyOtp(cleanedUsn, otp.trim(), effectiveToken);
      if (!verification.valid) {
        const attemptResult = recordFailedOtpAttempt(cleanedUsn);
        const finalError = attemptResult.locked ? attemptResult.error : (attemptResult.error || verification.error);
        return NextResponse.json({ success: false, error: finalError }, { status: attemptResult.locked ? 429 : 400 });
      }

      resetFailedOtpAttempts(cleanedUsn);

      if (attendee?.email) {
        const forwardedHost = request.headers.get('x-forwarded-host');
        const host = forwardedHost || request.headers.get('host');
        const proto = request.headers.get('x-forwarded-proto') || 'https';
        const liveOrigin = (process.env.NEXT_PUBLIC_APP_URL || (host && !host.includes('localhost') && !host.includes('127.0.0.1') ? `${proto}://${host}` : 'https://milan202622.onrender.com')).replace(/\/$/, '');
        const passUrl = `${liveOrigin}/ticket/${attendee.id}`;
        QRCode.toDataURL(passUrl, { width: 300, margin: 2, color: { dark: '#0a0a0a', light: '#ffffff' }, errorCorrectionLevel: 'H' }).then(qrDataUrl => {
          return sendEmailPass({ toEmail: attendee.email, recipientName: attendee.fullName, usn: attendee.usn || attendee.rollNumber, ticketCode: attendee.ticketCode, department: attendee.department, year: attendee.year, qrDataUrl, passUrl });
        }).catch(err => { console.error('Error auto-dispatching pass email on unlock:', err); });
      }

      return NextResponse.json({ success: true, message: 'Identity verified successfully! Pass unlocked.', attendee });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Pass login failed' },
      { status: 500 }
    );
  }
}
