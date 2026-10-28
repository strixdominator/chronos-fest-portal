import { NextRequest, NextResponse } from 'next/server';
import { createOtp, findAlumnusByUsn, maskEmail, maskPhone } from '@/lib/alumni';
import { getAttendees } from '@/lib/db';
import { sendEmailOtp, sendSmsOtp, sendWhatsAppOtp } from '@/lib/notifications';
import { getClientIp, checkOtpDispatchLimits, checkOtpVerifyAttempts } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { usn, channel = 'EMAIL', customTarget, website } = body;

    if (website) {
      return NextResponse.json({ success: false, error: 'Suspicious bot activity detected.' }, { status: 400 });
    }

    if (!usn || typeof usn !== 'string') {
      return NextResponse.json({ success: false, error: 'USN is required' }, { status: 400 });
    }

    const cleanedUsn = usn.trim().toUpperCase();
    const clientIp = getClientIp(request);

    const lockCheck = checkOtpVerifyAttempts(cleanedUsn);
    if (!lockCheck.allowed) {
      return NextResponse.json({ success: false, error: lockCheck.error }, { status: 429 });
    }

    const rateCheck = checkOtpDispatchLimits(cleanedUsn, clientIp);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: rateCheck.error, retryAfter: rateCheck.retryAfterSec },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfterSec || 60) } }
      );
    }

    const alumnus = findAlumnusByUsn(cleanedUsn);
    if (!alumnus) {
      return NextResponse.json({ success: false, error: 'Graduate record not found.' }, { status: 404 });
    }

    // Check if already registered
    const allAttendees = await getAttendees();
    const existing = allAttendees.find(
      a => (a.usn || a.rollNumber).trim().toUpperCase() === cleanedUsn
    );
    if (existing) {
      return NextResponse.json({
        success: false,
        error: `An entry pass has already been claimed for USN "${cleanedUsn}". Check your ticket page.`
      }, { status: 400 });
    }

    const isWhatsApp = channel === 'WHATSAPP' || channel === 'PHONE';
    const targetContact = isWhatsApp ? alumnus.phone?.trim() : alumnus.officialEmail?.trim();
    if (!targetContact) {
      return NextResponse.json({
        success: false,
        error: `No official ${isWhatsApp ? 'WhatsApp mobile number' : 'email address'} on record in the graduate archives for USN "${cleanedUsn}". To protect against identity theft, automatic OTP dispatch is restricted. Please request Manual Committee Approval with your ID proof.`
      }, { status: 400 });
    }

    const otpData = await createOtp(cleanedUsn, isWhatsApp ? 'WHATSAPP' : 'EMAIL', targetContact);
    if (!otpData) {
      return NextResponse.json({ success: false, error: 'Failed to generate verification code. Please try again.' }, { status: 500 });
    }

    let dispatchResult;
    try {
      if (isWhatsApp) {
        dispatchResult = await sendWhatsAppOtp({ toPhone: otpData.target, otp: otpData.otp, recipientName: alumnus.fullName, usn: alumnus.usn });
      } else {
        dispatchResult = await sendEmailOtp({ toEmail: otpData.target, otp: otpData.otp, recipientName: alumnus.fullName, usn: alumnus.usn });
      }
    } catch (dispatchErr: any) {
      console.error('[DISPATCH ERROR]', dispatchErr);
    }

    if (dispatchResult && !dispatchResult.success && dispatchResult.provider !== 'SIMULATION') {
      return NextResponse.json({
        success: false,
        error: dispatchResult.error ? `${isWhatsApp ? 'WhatsApp' : 'Delivery'} failed: ${dispatchResult.error}` : 'Could not deliver verification code to registered contact.',
        dispatchError: dispatchResult.error,
      }, { status: 502 });
    }

    const response = NextResponse.json({
      success: true,
      message: dispatchResult?.isReal ? `Real verification code sent to ${otpData.maskedTarget}!` : `Simulation Mode: Verification code is ${otpData.otp}`,
      maskedTarget: otpData.maskedTarget,
      channel: isWhatsApp ? 'WhatsApp' : 'Email',
      isRealDelivery: dispatchResult?.isReal || false,
      deliveryProvider: dispatchResult?.provider || 'SIMULATION',
      simulationCode: !dispatchResult?.isReal ? otpData.otp : undefined,
      dispatchError: dispatchResult?.error,
      simulationNotice: dispatchResult?.provider === 'SIMULATION' ? dispatchResult.message : undefined,
      otpToken: otpData.statelessToken,
    });

    if (otpData.statelessToken) {
      response.cookies.set('milan_otp_token', otpData.statelessToken, {
        path: '/', httpOnly: true, sameSite: 'lax', maxAge: 600,
      });
    }

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to dispatch OTP' },
      { status: 500 }
    );
  }
}
