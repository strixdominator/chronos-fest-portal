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
        { 
          success: false, 
          status: 'UNAUTHORIZED', 
          message: 'Access Denied: Invalid or missing Gate Authorization PIN.',
          error: 'Access Denied: Invalid or missing Gate Authorization PIN.' 
        },
        { status: 401 }
      );
    }

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { 
          success: false, 
          status: 'NOT_FOUND',
          message: 'QR Code or Ticket identifier is required.',
          error: 'QR Code or Ticket identifier is required.' 
        },
        { status: 400 }
      );
    }

    code = normalizeScanCode(code);

    if (!code) {
      return NextResponse.json(
        { 
          success: false, 
          status: 'NOT_FOUND', 
          message: 'Empty or unreadable QR code payload. Please try scanning again or enter USN manually.',
          error: 'Empty or invalid QR code payload.' 
        },
        { status: 400 }
      );
    }

    if (action === 'PREVIEW') {
      const preview = await getScanPreview(code);
      return NextResponse.json({
        success: preview.status === 'READY',
        status: preview.status,
        message: preview.message,
        error: preview.status !== 'READY' ? preview.message : undefined,
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
      error: (result.status !== 'SUCCESS' && result.status !== 'PARTIAL_ENTRY') ? result.message : undefined,
      attendee: result.attendee,
      admittedNow: result.admittedNow,
      remaining: result.remaining,
      totalQuota: result.totalQuota,
    });
  } catch (error: any) {
    console.error('[API /api/scan] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        status: 'SERVER_ERROR',
        message: error.message || 'Check-in server processing error. Please try again.',
        error: error.message || 'Check-in failed' 
      },
      { status: 500 }
    );
  }
}
