import { NextRequest, NextResponse } from 'next/server';
import { getAttendees } from '@/lib/db';
import { verifyAdminPasscode, getAdminPasscodeFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const isAdmin = verifyAdminPasscode(getAdminPasscodeFromRequest(request));
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin passcode required to export attendee records.' },
        { status: 401 }
      );
    }

    const attendees = await getAttendees();

    const headers = [
      'Pass ID', 'Full Name', 'USN / Seat No', 'Department', 'Batch Year',
      'Current Organisation', 'Designation / Role', 'Email', 'Phone',
      'Ticket Code', 'Verification Method', 'Approval Status', 'Gate Admitted',
      'Check-in Timestamp', 'Gate Checkpoint', 'Wristband', 'Registration Time',
      'Review Reason / Notes'
    ];

    const escapeCsv = (str?: string) => {
      if (!str) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = attendees.map(a => [
      escapeCsv(a.id),
      escapeCsv(a.fullName),
      escapeCsv(a.usn || a.rollNumber),
      escapeCsv(a.department),
      escapeCsv(a.year || a.batchYear),
      escapeCsv(a.organization || 'Not Provided'),
      escapeCsv(a.designation || 'Not Provided'),
      escapeCsv(a.email),
      escapeCsv(a.phone),
      escapeCsv(a.ticketCode),
      escapeCsv(a.verificationMethod || 'OTP_VERIFIED'),
      escapeCsv(a.status),
      escapeCsv(a.checkedIn ? 'YES' : 'NO'),
      escapeCsv(a.checkedInAt || ''),
      escapeCsv(a.checkedInBy || ''),
      escapeCsv(a.wristbandColor || ''),
      escapeCsv(a.registeredAt),
      escapeCsv(a.reviewReason || a.rejectionReason || a.notes || ''),
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="milan2026_registration_responses_${new Date().toISOString().split('T')[0]}.csv"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Export failed' },
      { status: 500 }
    );
  }
}
