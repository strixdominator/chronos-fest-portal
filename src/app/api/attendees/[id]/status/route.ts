import { NextRequest, NextResponse } from 'next/server';
import { updateAttendeeStatus, resetCheckIn } from '@/lib/db';
import { verifyAdminPasscode, getAdminPasscodeFromRequest } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = verifyAdminPasscode(getAdminPasscodeFromRequest(request));
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin passcode required.' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { action, status, rejectionReason, wristbandColor } = body;

    if (action === 'RESET_CHECKIN') {
      const updated = await resetCheckIn(id);
      if (!updated) {
        return NextResponse.json({ success: false, error: 'Attendee not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, attendee: updated });
    }

    if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
    }

    const updated = await updateAttendeeStatus(id, status, rejectionReason, wristbandColor);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Attendee not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, attendee: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update attendee' },
      { status: 500 }
    );
  }
}
