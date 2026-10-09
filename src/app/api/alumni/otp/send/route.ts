import { NextRequest, NextResponse } from 'next/server';
import { createOtp, findAlumnusByUsn, maskEmail, maskPhone } from '@/lib/alumni';
import { getAttendees } from '@/lib/db';
import { sendEmailOtp, sendSmsOtp } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { usn, channel = 'EMAIL', customTarget } = body;

    if (!usn || typeof usn !== 'string') {
      return NextResponse.json({ success: false, error: 'USN is required' }, { status: 400 });
    }

    const cleanedUsn = usn.trim().toUpperCase();
    const alumnus = findAlumnusByUsn(cleanedUsn);
    if (!alumnus) {
      return NextResponse.json({ success: false, error: 'Graduate record not found.' }, { status: 404 });
    }

    // Check if already registered
    const existing = getAttendees().find(
      a => (a.usn || a.rollNumber).trim().toUpperCase() === cleanedUsn
    );
    if (existing) {
      return NextResponse.json({
        success: false,
        error: `An entry pass has already been claimed for USN "${cleanedUsn}". Check your ticket page.`
      }, { status: 400 });
    }

    // Strictly retrieve target contact from official directory record to prevent identity theft / forgery
    const targetContact = channel === 'PHONE' ? alumnus.phone?.trim() : alumnus.officialEmail?.trim();

    if (!targetContact) {
      return NextResponse.json({
        success: false,
        error: `No official ${channel === 'PHONE' ? 'mobile number' : 'email address'} on record in the graduate archives for USN "${cleanedUsn}". To protect against identity theft, automatic OTP dispatch is restricted. Please request Manual Committee Approval with your ID proof.`
      }, { status: 400 });
    }

    const otpData = createOtp(cleanedUsn, channel === 'PHONE' ? 'PHONE' : 'EMAIL', targetContact);
    if (!otpData) {
      return NextResponse.json({ success: false, error: 'Failed to generate verification code. Please try again.' }, { status: 500 });
    }

    // Dispatch real email or SMS notification
    let dispatchResult;
    try {
      if (channel === 'PHONE') {
        dispatchResult = await sendSmsOtp({
          toPhone: otpData.target,
          otp: otpData.otp,
          recipientName: alumnus.fullName,
          usn: alumnus.usn,
        });
      } else {
        dispatchResult = await sendEmailOtp({
          toEmail: otpData.target,
          otp: otpData.otp,
          recipientName: alumnus.fullName,
          usn: alumnus.usn,
        });
      }
    } catch (dispatchErr: any) {
      console.error('[DISPATCH ERROR]', dispatchErr);
    }

    return NextResponse.json({
      success: true,
      message: dispatchResult?.isReal 
        ? `Real verification code sent to ${otpData.maskedTarget}!`
        : `A 6-digit verification code was sent to ${otpData.maskedTarget}`,
      maskedTarget: otpData.maskedTarget,
      channel: channel === 'PHONE' ? 'SMS' : 'Email',
      isRealDelivery: dispatchResult?.isReal || false,
      deliveryProvider: dispatchResult?.provider || 'SIMULATION',
      dispatchError: dispatchResult?.error,
      simulationNotice: dispatchResult?.provider === 'SIMULATION' ? dispatchResult.message : undefined,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to dispatch OTP' },
      { status: 500 }
    );
  }
}
