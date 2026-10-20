import { NextRequest, NextResponse } from 'next/server';
import { checkInAttendee, getScanPreview, normalizeScanCode } from '@/lib/db';
import { verifyScannerPin, getScannerPinFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { 
      code, 
      volunteerName = "Gate Security", 
      action = "CHECKIN", 
      admittingCount,
      pin
    } = body;

    const providedPin = getScannerPinFromRequest(request, pin);
    if (!verifyScannerPin(providedPin)) {
      return NextResponse.json(
        { success: false, status: 'UNAUTHORIZED', error: 'Access Denied: Invalid or missing Gate Authorization PIN.' },
        { status: 401 }
      );
    }

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, error: 'QR Code or Ticket identifier is required.' },
        { status: 400 }
      );
    }

    code = normalizeScanCode(code);

    if (!code) {
      return NextResponse.json(
        { success: false, status: 'NOT_FOUND', message: 'Empty or invalid QR code payload.' },
        { status: 400 }
      );
    }

    if (action === 'PREVIEW') {
      const preview = await getScanPreview(code);
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

    const count = admittingCount !== undefined ? Number(admittingCount) : undefined;
    const result = await checkInAttendee(code, volunteerName, count);

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
