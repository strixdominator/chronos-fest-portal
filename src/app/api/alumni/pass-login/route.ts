import { NextRequest, NextResponse } from 'next/server';
import { createOtp, verifyOtp, findAlumnusByUsn, maskEmail, maskPhone } from '@/lib/alumni';
import { getAttendees } from '@/lib/db';
import { sendEmailOtp, sendSmsOtp } from '@/lib/notifications';

// POST: Handles both 'SEND_OTP' and 'VERIFY_OTP' for logging into already claimed passes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, usn, channel = 'EMAIL', otp } = body;

    if (!usn || typeof usn !== 'string') {
      return NextResponse.json({ success: false, error: 'USN is required' }, { status: 400 });
    }

    const cleanedUsn = usn.trim().toUpperCase();
    const attendees = getAttendees();
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
      // Find master or attendee contact
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

      const otpResult = createOtp(cleanedUsn, channel === 'PHONE' ? 'PHONE' : 'EMAIL', target);
      if (!otpResult) {
        return NextResponse.json({ success: false, error: 'Failed to create OTP' }, { status: 500 });
      }

      // Dispatch real email or SMS notification
      let dispatchResult;
      if (channel === 'PHONE') {
        dispatchResult = await sendSmsOtp({
          toPhone: target,
          otp: otpResult.otp,
          recipientName: attendee.fullName,
          usn: cleanedUsn,
        });
      } else {
        dispatchResult = await sendEmailOtp({
          toEmail: target,
          otp: otpResult.otp,
          recipientName: attendee.fullName,
          usn: cleanedUsn,
        });
      }

      return NextResponse.json({
        success: true,
        message: dispatchResult?.isReal
          ? `Real unlock code delivered to ${channel === 'PHONE' ? maskPhone(phone) : maskEmail(email)}!`
          : `Security code sent to ${channel === 'PHONE' ? maskPhone(phone) : maskEmail(email)}`,
        maskedTarget: channel === 'PHONE' ? maskPhone(phone) : maskEmail(email),
        isRealDelivery: dispatchResult?.isReal || false,
        deliveryProvider: dispatchResult?.provider || 'SIMULATION',
      });
    }

    // ACTION 2: VERIFY OTP AND UNLOCK PASS
    if (action === 'VERIFY_OTP') {
      if (!otp || typeof otp !== 'string') {
        return NextResponse.json({ success: false, error: '6-digit OTP code is required' }, { status: 400 });
      }

      const verification = verifyOtp(cleanedUsn, otp.trim());
      if (!verification.valid) {
        return NextResponse.json({ success: false, error: verification.error }, { status: 400 });
      }

      // Security check passed! Return the full unlocked attendee pass
      return NextResponse.json({
        success: true,
        message: 'Identity verified successfully! Pass unlocked.',
        attendee,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Pass login failed' },
      { status: 500 }
    );
  }
}
