import { NextRequest, NextResponse } from 'next/server';
import { findAlumnusByUsn } from '@/lib/alumni';
import { createAttendee, getAttendees } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { usn, newEmail, newPhone, reason, degreeProofUrl } = body;

    if (!usn || !newEmail || !newPhone) {
      return NextResponse.json(
        { success: false, error: 'USN, new active email, and phone number are required.' },
        { status: 400 }
      );
    }

    const cleanedUsn = usn.trim().toUpperCase();
    const alumnus = findAlumnusByUsn(cleanedUsn);

    if (!alumnus) {
      return NextResponse.json(
        { success: false, error: `USN "${cleanedUsn}" is not found in the graduate directory.` },
        { status: 404 }
      );
    }

    // Check if already registered
    const existing = getAttendees().find(
      a => (a.usn || a.rollNumber).trim().toUpperCase() === cleanedUsn
    );
    if (existing) {
      return NextResponse.json(
        { success: false, error: `A pass is already registered for USN "${cleanedUsn}".` },
        { status: 400 }
      );
    }

    // Create a PENDING attendee with updated contact details flag
    const result = createAttendee({
      fullName: alumnus.fullName,
      email: newEmail.trim().toLowerCase(),
      phone: newPhone.trim(),
      rollNumber: alumnus.usn,
      usn: alumnus.usn,
      department: alumnus.department,
      year: alumnus.batchYear,
      isVerifiedOtp: false,
      isContactUpdated: true,
      originalEmail: alumnus.officialEmail,
      originalPhone: alumnus.phone,
      reviewReason: reason || 'Graduate has changed contact email/phone number since graduation.',
      degreeProofUrl: degreeProofUrl || undefined,
      notes: `Contact changed from [${alumnus.officialEmail} / ${alumnus.phone}] to [${newEmail} / ${newPhone}]`,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Manual review request submitted successfully! The organizing committee will review your updated contact details.',
      attendee: result.attendee,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Review request failed' },
      { status: 500 }
    );
  }
}
