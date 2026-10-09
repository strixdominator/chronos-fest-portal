import { NextRequest, NextResponse } from 'next/server';
import { getAttendeeById, getAttendeeByTicketCode, deleteAttendee } from '@/lib/db';
import { clearAlumniSession } from '@/lib/alumni';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let attendee = getAttendeeById(id);

    if (!attendee) {
      attendee = getAttendeeByTicketCode(id);
    }

    if (!attendee) {
      return NextResponse.json(
        { success: false, error: 'Attendee or ticket not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      attendee,
    });
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
    const { id } = await params;
    const result = deleteAttendee(id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Attendee pass not found' },
        { status: 404 }
      );
    }

    const deleted = result.deletedAttendee;
    if (deleted) {
      clearAlumniSession(deleted.usn || deleted.rollNumber);
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
