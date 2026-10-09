import { NextRequest, NextResponse } from 'next/server';
import { getAttendees, getSettings, deleteAllAttendees, deleteSelectedAttendees } from '@/lib/db';
import { clearAlumniSession } from '@/lib/alumni';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase() || '';
    const status = searchParams.get('status') || 'ALL';

    const allAttendees = getAttendees();
    const settings = getSettings();

    let filtered = allAttendees;

    if (status !== 'ALL') {
      if (status === 'CHECKED_IN') {
        filtered = filtered.filter(a => a.checkedIn);
      } else {
        filtered = filtered.filter(a => a.status === status);
      }
    }

    if (search) {
      filtered = filtered.filter(a =>
        a.fullName.toLowerCase().includes(search) ||
        a.rollNumber.toLowerCase().includes(search) ||
        a.email.toLowerCase().includes(search) ||
        a.department.toLowerCase().includes(search) ||
        a.ticketCode.toLowerCase().includes(search) ||
        (a.organization && a.organization.toLowerCase().includes(search)) ||
        (a.designation && a.designation.toLowerCase().includes(search)) ||
        a.id.toLowerCase().includes(search)
      );
    }

    const totalAlumni = allAttendees.length;
    const pendingAlumni = allAttendees.filter(a => a.status === 'PENDING');
    const approvedAlumni = allAttendees.filter(a => a.status === 'APPROVED');
    const rejectedAlumni = allAttendees.filter(a => a.status === 'REJECTED');
    const checkedInAlumni = allAttendees.filter(a => a.checkedIn);

    const stats = {
      total: totalAlumni,
      capacity: settings.totalCapacity,
      pending: pendingAlumni.length,
      approved: approvedAlumni.length,
      checkedIn: checkedInAlumni.length,
      remainingAtGate: Math.max(0, approvedAlumni.length - checkedInAlumni.length),
      rejected: rejectedAlumni.length,
    };

    return NextResponse.json({
      success: true,
      attendees: filtered,
      stats,
      settings,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch attendees' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { ids, resetAll } = body;

    if (resetAll === true) {
      const result = deleteAllAttendees();
      clearAlumniSession(); // Clear all active sessions and OTPs
      return NextResponse.json({
        success: true,
        count: result.count,
        message: `Successfully deleted all ${result.count} registered passes. All alumni can now register again fresh.`,
      });
    }

    if (Array.isArray(ids) && ids.length > 0) {
      const result = deleteSelectedAttendees(ids);
      for (const id of ids) {
        clearAlumniSession(id);
      }
      return NextResponse.json({
        success: true,
        count: result.count,
        message: `Successfully deleted ${result.count} selected pass(es). They can now register again.`,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Specify either "resetAll: true" or an array of "ids" to delete.' },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Bulk delete failed' },
      { status: 500 }
    );
  }
}
