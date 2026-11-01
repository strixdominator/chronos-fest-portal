import { NextRequest, NextResponse } from 'next/server';
import { getAttendeeById, getAttendeeByTicketCode } from '@/lib/db';
import { sendEmailPass } from '@/lib/notifications';
import { verifyAdminPasscode, getAdminPasscodeFromRequest } from '@/lib/auth';
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { attendeeId, email, qrDataUrl } = body;

    if (!attendeeId || typeof attendeeId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Attendee ID or Ticket code is required' },
        { status: 400 }
      );
    }

    const cleanId = attendeeId.trim();
    const isAdmin = verifyAdminPasscode(getAdminPasscodeFromRequest(request));

    // SECURITY: Prevent sequential ATT- enumeration for non-admins
    if (!isAdmin && /^ATT-\d+$/i.test(cleanId)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Pass email delivery requires verified ticket code.' },
        { status: 401 }
      );
    }

    let attendee = await getAttendeeByTicketCode(cleanId);
    if (!attendee && isAdmin) {
      attendee = await getAttendeeById(cleanId);
    }

    if (!attendee) {
      return NextResponse.json(
        { success: false, error: 'Attendee record not found' },
        { status: 404 }
      );
    }

    // SECURITY: Non-admins can ONLY send passes to the verified email on record for this attendee.
    // Prevent IDOR pass redirection to arbitrary third-party attacker inboxes.
    let targetEmail = attendee.email?.trim().toLowerCase();
    if (isAdmin && email && typeof email === 'string') {
      targetEmail = email.trim().toLowerCase();
    } else if (email && attendee.email && email.trim().toLowerCase() !== attendee.email.trim().toLowerCase()) {
      return NextResponse.json(
        { success: false, error: 'Security restriction: Entry passes can only be delivered to the verified email address on record.' },
        { status: 403 }
      );
    }

    if (!targetEmail) {
      return NextResponse.json(
        { success: false, error: 'No registered recipient email address found for this attendee.' },
        { status: 400 }
      );
    }

    const forwardedHost = request.headers.get('x-forwarded-host');
    const host = forwardedHost || request.headers.get('host');
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const liveOrigin = (process.env.NEXT_PUBLIC_APP_URL || (host && !host.includes('localhost') && !host.includes('127.0.0.1') ? `${proto}://${host}` : 'https://milan202622.onrender.com')).replace(/\/$/, '');
    const passUrl = `${liveOrigin}/ticket/${attendee.ticketCode}`;

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
