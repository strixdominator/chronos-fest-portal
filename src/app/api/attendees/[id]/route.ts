import { NextRequest, NextResponse } from 'next/server';
import { getAttendeeById, getAttendeeByTicketCode } from '@/lib/db';

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
