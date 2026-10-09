import { NextRequest, NextResponse } from 'next/server';
import { getAttendees, getSettings, deleteAllAttendees, deleteSelectedAttendees } from '@/lib/db';
import { clearAlumniSession } from '@/lib/alumni';

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
        a.id.toLowerCase().includes(search)
      );
    }

    const stats = {
      total: allAttendees.length,
      capacity: settings.totalCapacity,
      pending: allAttendees.filter(a => a.status === 'PENDING').length,
      approved: allAttendees.filter(a => a.status === 'APPROVED').length,
      checkedIn: allAttendees.filter(a => a.checkedIn).length,
      rejected: allAttendees.filter(a => a.status === 'REJECTED').length,
      remainingAtGate: allAttendees.filter(a => a.status === 'APPROVED' && !a.checkedIn).length,
    };

    return NextResponse.json({
      success: true,
      attendees: filtered,
      stats,
      settings,
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
