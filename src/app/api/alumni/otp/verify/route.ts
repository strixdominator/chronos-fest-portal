import { NextRequest, NextResponse } from 'next/server';
import { verifyOtp, findAlumnusByUsn, createVerifiedSession, verifySessionToken, getSessionData } from '@/lib/alumni';
import { createAttendee } from '@/lib/db';
import { getClientIp, checkRateLimit, checkOtpVerifyAttempts, recordFailedOtpAttempt, resetFailedOtpAttempts } from '@/lib/rateLimit';
import QRCode from 'qrcode';
import { sendEmailPass } from '@/lib/notifications';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const cookieToken = request.cookies.get('milan_otp_token')?.value;
    const { 
      usn, 
      otp, 
      action, 
      verifyOnly, 
      sessionToken,
      otpToken,
      organization,
      designation,
      website,
    } = body;

    // Bot honeypot check
    if (website) {
      return NextResponse.json({ success: false, error: 'Suspicious bot activity detected.' }, { status: 400 });
    }

    const effectiveOtpToken = otpToken || cookieToken;

    if (!usn || typeof usn !== 'string') {
      return NextResponse.json(
        { success: false, error: 'University Seat Number (USN) is required.' },
        { status: 400 }
      );
    }

    const cleanedUsn = usn.trim().toUpperCase();
    const clientIp = getClientIp(request);

    // Global IP rate limit on verification attempts: max 30 attempts per minute per IP
    const ipCheck = checkRateLimit(`ip_otp_verify:${clientIp}`, 30, 60 * 1000);
    if (!ipCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many verification attempts from your IP. Please slow down.' },
        { status: 429, headers: { 'Retry-After': String(ipCheck.retryAfterSec) } }
      );
    }

    // Check if USN has been locked due to 5 failed attempts
    const lockCheck = checkOtpVerifyAttempts(cleanedUsn);
    if (!lockCheck.allowed) {
      return NextResponse.json({ success: false, error: lockCheck.error }, { status: 429 });
    }

    const alumnus = findAlumnusByUsn(cleanedUsn);
    if (!alumnus) {
      return NextResponse.json({ success: false, error: 'Graduate record not found.' }, { status: 404 });
    }

    // MODE 1: VERIFY OTP ONLY (Unlocks Step 3: Professional details)
    if (action === 'VERIFY_ONLY' || verifyOnly) {
      if (!otp || typeof otp !== 'string') {
        return NextResponse.json(
          { success: false, error: '6-digit OTP verification code is required.' },
          { status: 400 }
        );
      }

      const verification = verifyOtp(cleanedUsn, otp.trim(), effectiveOtpToken);
      if (!verification.valid) {
        const attemptResult = recordFailedOtpAttempt(cleanedUsn);
        const finalError = attemptResult.locked 
          ? attemptResult.error 
          : (attemptResult.error || verification.error);
        return NextResponse.json({ success: false, error: finalError }, { status: attemptResult.locked ? 429 : 400 });
      }

      // Successful verification: clear failed attempts
      resetFailedOtpAttempts(cleanedUsn);

      const token = createVerifiedSession(cleanedUsn, {
        email: verification.channel === 'EMAIL' ? verification.target : (alumnus.officialEmail || undefined),
        phone: verification.channel === 'PHONE' ? verification.target : (alumnus.phone || undefined),
      });

      return NextResponse.json({
        success: true,
        verified: true,
        sessionToken: token,
        alumnus: {
          usn: alumnus.usn,
          fullName: alumnus.fullName,
          department: alumnus.department,
          batchYear: alumnus.batchYear,
        },
        message: 'Identity confirmed via OTP! Please provide your organisation and designation to complete pass issuance.',
      });
    }

    // MODE 2: COMPLETE PASS WITH SESSION TOKEN
    let directVerification: { target?: string; channel?: 'EMAIL' | 'PHONE' } | null = null;
    if (sessionToken) {
      const isValidSession = verifySessionToken(cleanedUsn, sessionToken);
      if (!isValidSession) {
        return NextResponse.json(
          { success: false, error: 'Verification session expired. Please verify OTP again.' },
          { status: 401 }
        );
      }
    } else {
      // Direct pass generation with OTP provided directly
      if (!otp) {
        return NextResponse.json(
          { success: false, error: 'Either OTP or verified session token is required.' },
          { status: 400 }
        );
      }

      const verification = verifyOtp(cleanedUsn, otp.trim(), effectiveOtpToken);
      if (!verification.valid) {
        return NextResponse.json({ success: false, error: verification.error }, { status: 400 });
      }
      directVerification = { target: verification.target, channel: verification.channel };
    }

    const sessionData = sessionToken ? getSessionData(sessionToken) : null;
    const finalEmail = sessionData?.email || (directVerification?.channel === 'EMAIL' ? directVerification.target : null) || alumnus.officialEmail || 'alumni@chronosfest.com';
    const finalPhone = sessionData?.phone || (directVerification?.channel === 'PHONE' ? directVerification.target : null) || alumnus.phone || '+91 99999 99999';

    const result = createAttendee({
      fullName: alumnus.fullName,
      email: finalEmail,
      phone: finalPhone,
      rollNumber: alumnus.usn,
      usn: alumnus.usn,
      department: alumnus.department,
      year: alumnus.batchYear,
      isVerifiedOtp: true,
      organization: organization ? String(organization).trim() : undefined,
      designation: designation ? String(designation).trim() : undefined,
      familyCount: 0,
      familyMembers: [],
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    // Automatically deliver pass to email
    if (result.attendee?.email) {
      const attendee = result.attendee;
      const forwardedHost = request.headers.get('x-forwarded-host');
      const host = forwardedHost || request.headers.get('host');
      const proto = request.headers.get('x-forwarded-proto') || 'https';
      const liveOrigin = (process.env.NEXT_PUBLIC_APP_URL || (host && !host.includes('localhost') && !host.includes('127.0.0.1') ? `${proto}://${host}` : 'https://milan202622.onrender.com')).replace(/\/$/, '');
      const passUrl = `${liveOrigin}/ticket/${attendee.id}`;
      QRCode.toDataURL(passUrl, {
        width: 300,
        margin: 2,
        color: { dark: '#0a0a0a', light: '#ffffff' },
        errorCorrectionLevel: 'H',
      }).then((qrDataUrl) => {
        return sendEmailPass({
          toEmail: attendee.email,
          recipientName: attendee.fullName,
          usn: attendee.usn || attendee.rollNumber,
          ticketCode: attendee.ticketCode,
          department: attendee.department,
          year: attendee.year,
          qrDataUrl,
          passUrl,
        });
      }).catch(err => {
        console.error('Error auto-dispatching pass email:', err);
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Official Alumni Entry Pass generated successfully!',
      attendee: result.attendee,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Verification or pass generation failed' },
      { status: 500 }
    );
  }
}
