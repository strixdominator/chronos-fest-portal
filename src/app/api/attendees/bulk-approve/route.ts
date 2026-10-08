import { NextRequest, NextResponse } from 'next/server';
import { bulkApproveAttendees, getAttendees } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let ids: string[] = body.ids;

    if (!ids || ids.length === 0) {
      // If no IDs provided, approve ALL pending
      const pending = getAttendees().filter(a => a.status === 'PENDING');
      ids = pending.map(a => a.id);
    }

    const count = bulkApproveAttendees(ids);

    return NextResponse.json({
      success: true,
      approvedCount: count,
      message: `Successfully approved ${count} attendee(s).`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Bulk approval failed' },
      { status: 500 }
    );
  }
}
