import { NextRequest, NextResponse } from 'next/server';
import { getAttendeeById, getAttendeeByTicketCode } from '@/lib/db';
import { sendEmailPass } from '@/lib/notifications';
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { attendeeId, email, qrDataUrl } = body;

    if (!attendeeId) {
      return NextResponse.json(
        { success: false, error: 'Attendee ID or Ticket code is required' },
        { status: 400 }
      );
    }

    let attendee = await getAttendeeById(attendeeId);
    if (!attendee) {
      attendee = await getAttendeeByTicketCode(attendeeId);
    }

    if (!attendee) {
      return NextResponse.json(
        { success: false, error: 'Attendee record not found' },
        { status: 404 }
      );
    }

    const targetEmail = (email || attendee.email)?.trim();
    if (!targetEmail) {
      return NextResponse.json(
        { success: false, error: 'Recipient email address is required' },
        { status: 400 }
      );
    }

    const forwardedHost = request.headers.get('x-forwarded-host');
    const host = forwardedHost || request.headers.get('host');
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const liveOrigin = (process.env.NEXT_PUBLIC_APP_URL || (host && !host.includes('localhost') && !host.includes('127.0.0.1') ? `${proto}://${host}` : 'https://milan202622.onrender.com')).replace(/\/$/, '');
    const passUrl = `${liveOrigin}/ticket/${attendee.id}`;

    // Generate QR Data URL if not provided by client
    let finalQrDataUrl = qrDataUrl;
    if (!finalQrDataUrl) {
      finalQrDataUrl = await QRCode.toDataURL(passUrl, {
        width: 300,
        margin: 2,
        color: { dark: '#0a0a0a', light: '#ffffff' },
        errorCorrectionLevel: 'H',
      });
    }

    const result = await sendEmailPass({
      toEmail: targetEmail,
      recipientName: attendee.fullName,
      usn: attendee.usn || attendee.rollNumber,
      ticketCode: attendee.ticketCode,
      department: attendee.department,
      year: attendee.year,
      qrDataUrl: finalQrDataUrl,
      passUrl,
    });

    return NextResponse.json({
      success: true,
      message: result.message || `Official entry pass with QR code delivered to ${targetEmail}!`,
      isReal: result.isReal,
      targetEmail,
    });
  } catch (error: any) {
    console.error('[SEND PASS EMAIL ERROR]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to dispatch pass to email' },
      { status: 500 }
    );
  }
}
