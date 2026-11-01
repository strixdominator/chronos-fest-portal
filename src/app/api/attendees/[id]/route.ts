import { NextRequest, NextResponse } from 'next/server';
import { getAttendeeById, getAttendeeByTicketCode, deleteAttendee } from '@/lib/db';
import { clearAlumniSession } from '@/lib/alumni';
import { verifyAdminPasscode, getAdminPasscodeFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cleanId = (id || '').trim();

    // SECURITY: The /api/attendees/[id] endpoint returns full unmasked attendee records (including base64 ID/degree proofs, phone, email).
    // It is an internal administrative endpoint and must ALWAYS require administrator authorization.
    const isAdmin = verifyAdminPasscode(getAdminPasscodeFromRequest(_request));
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin authorization required to access attendee details.' },
        { status: 401 }
      );
    }

    let attendee = await getAttendeeById(cleanId);

    if (!attendee) {
      attendee = await getAttendeeByTicketCode(cleanId);
    }

    if (!attendee) {
      return NextResponse.json(
        { success: false, error: 'Attendee or ticket not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, attendee });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = verifyAdminPasscode(getAdminPasscodeFromRequest(_request));
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin passcode required.' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const result = await deleteAttendee(id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Attendee pass not found' },
        { status: 404 }
      );
    }

    const deleted = result.deletedAttendee;
    if (deleted) {
      await clearAlumniSession(deleted.usn || deleted.rollNumber);
    }

    return NextResponse.json({
      success: true,
      message: `Pass for ${deleted?.fullName || id} (${deleted?.usn || deleted?.rollNumber}) successfully deleted. QR code invalidated and registration unlocked for this USN.`,
      deletedAttendee: deleted,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Server error' },
      { status: 500 }
    );
  }
}
