import { NextRequest, NextResponse } from 'next/server';
import { findAlumnusByUsn } from '@/lib/alumni';
import { createAttendee, getAttendeeByUsn } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { usn, newEmail, newPhone, reason, degreeProofUrl, organization, designation } = body;

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

    let existing = null;
    try {
      existing = await getAttendeeByUsn(cleanedUsn);
    } catch {}
    if (existing) {
      return NextResponse.json(
        { success: false, error: `A pass is already registered for USN "${cleanedUsn}".` },
        { status: 400 }
      );
    }

    const result = await createAttendee({
      fullName: alumnus.fullName,
      email: newEmail.trim().toLowerCase(),
      phone: newPhone.trim(),
      rollNumber: alumnus.usn,
      usn: alumnus.usn,
      department: alumnus.department,
      year: alumnus.batchYear,
      organization: organization ? String(organization).trim() : undefined,
      designation: designation ? String(designation).trim() : undefined,
      isVerifiedOtp: false,
      isContactUpdated: true,
      originalEmail: alumnus.officialEmail,
      originalPhone: alumnus.phone,
      reviewReason: reason || 'Graduate has changed contact email/phone number since graduation.',
      degreeProofUrl: degreeProofUrl || undefined,
      notes: `Contact changed from [${alumnus.officialEmail} / ${alumnus.phone}] to [${newEmail} / ${newPhone}]`,
      familyCount: 0,
      familyMembers: [],
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
