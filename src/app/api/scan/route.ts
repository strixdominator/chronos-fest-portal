import { NextRequest, NextResponse } from 'next/server';
import { checkInAttendee, getScanPreview } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { 
      code, 
      volunteerName = "Gate Volunteer", 
      action = "CHECKIN", 
      admittingCount 
    } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, error: 'QR Code or Ticket identifier is required.' },
        { status: 400 }
      );
    }

    // Clean input and handle full URL if scanned from another device
    code = code.trim();
    if (code.includes('/ticket/')) {
      const parts = code.split('/ticket/');
      code = parts[1].split('?')[0].split('/')[0];
    } else if (code.includes('code=')) {
      const match = code.match(/code=([^&]+)/);
      if (match) code = match[1];
    }

    // ACTION: PREVIEW (Check quota and registered members before admitting)
    if (action === 'PREVIEW') {
      const preview = getScanPreview(code);
      return NextResponse.json({
        success: preview.status === 'READY',
        status: preview.status,
        message: preview.message,
        attendee: preview.attendee,
        totalQuota: preview.totalQuota,
        admittedCount: preview.admittedCount,
        remaining: preview.remaining,
      });
    }

    // ACTION: CHECKIN (Execute partial or full quota admission)
    const count = admittingCount !== undefined ? Number(admittingCount) : undefined;
    const result = checkInAttendee(code, volunteerName, count);

    return NextResponse.json({
      success: result.status === 'SUCCESS' || result.status === 'PARTIAL_ENTRY',
      status: result.status,
      message: result.message,
      attendee: result.attendee,
      admittedNow: result.admittedNow,
      remaining: result.remaining,
      totalQuota: result.totalQuota,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Check-in failed' },
      { status: 500 }
    );
  }
}
