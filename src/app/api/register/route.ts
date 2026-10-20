import { NextRequest, NextResponse } from 'next/server';
import { createAttendee, getSettings } from '@/lib/db';
import { getClientIp, checkRateLimit } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const ipCheck = checkRateLimit(`ip_register:${clientIp}`, 5, 10 * 60 * 1000);
    if (!ipCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many registration requests. Please wait a few minutes before trying again.' },
        { status: 429, headers: { 'Retry-After': String(ipCheck.retryAfterSec) } }
      );
    }

    const settings = await getSettings();
    if (!settings.isRegistrationOpen) {
      return NextResponse.json(
        { success: false, error: 'Registration is currently closed by the event organizers.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { fullName, email, phone, rollNumber, department, year, idCardUrl, website } = body;

    if (website) {
      return NextResponse.json({ success: false, error: 'Suspicious bot submission detected.' }, { status: 400 });
    }

    if (!fullName || !email || !phone || !rollNumber || !department || !year) {
      return NextResponse.json(
        { success: false, error: 'All fields (Name, Email, Phone, Roll No, Department, Year) are required.' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    const result = await createAttendee({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      rollNumber: rollNumber.trim().toUpperCase(),
      usn: rollNumber.trim().toUpperCase(),
      department: department.trim(),
      year: year.trim(),
      idCardUrl: idCardUrl || undefined,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Registration submitted successfully! Your application is in queue for review.',
      attendee: result.attendee,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Registration failed' },
      { status: 500 }
    );
  }
}
