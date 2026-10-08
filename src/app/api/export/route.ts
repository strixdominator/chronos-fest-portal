import { NextResponse } from 'next/server';
import { getAttendees } from '@/lib/db';

export async function GET() {
  try {
    const attendees = getAttendees();

    // CSV header
    const headers = [
      'Attendee ID',
      'Full Name',
      'Roll Number',
      'Department',
      'Year',
      'Email',
      'Phone',
      'Ticket Code',
      'Approval Status',
      'Checked In',
      'Check-in Timestamp',
      'Gate Officer',
      'Wristband',
      'Registration Time',
      'Rejection Reason'
    ];

    const escapeCsv = (str?: string) => {
      if (!str) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = attendees.map(a => [
      escapeCsv(a.id),
      escapeCsv(a.fullName),
      escapeCsv(a.rollNumber),
      escapeCsv(a.department),
      escapeCsv(a.year),
      escapeCsv(a.email),
      escapeCsv(a.phone),
      escapeCsv(a.ticketCode),
      escapeCsv(a.status),
      escapeCsv(a.checkedIn ? 'YES' : 'NO'),
      escapeCsv(a.checkedInAt || ''),
      escapeCsv(a.checkedInBy || ''),
      escapeCsv(a.wristbandColor || ''),
      escapeCsv(a.registeredAt),
      escapeCsv(a.rejectionReason || ''),
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="chronos_fest_attendees_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Export failed' },
      { status: 500 }
    );
  }
}
