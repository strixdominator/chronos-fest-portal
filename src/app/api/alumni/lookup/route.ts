import { NextRequest, NextResponse } from 'next/server';
import { findAlumnusByUsn, maskEmail, maskPhone } from '@/lib/alumni';
import { getAttendees } from '@/lib/db';
import { getClientIp, checkRateLimit } from '@/lib/rateLimit';

export async function GET(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    // Rate limit: Max 40 lookups per minute per IP to prevent scraping
    const ipCheck = checkRateLimit(`ip_lookup:${clientIp}`, 40, 60 * 1000);
    if (!ipCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many search requests. Please slow down.' },
        { status: 429, headers: { 'Retry-After': String(ipCheck.retryAfterSec) } }
      );
    }

    const { searchParams } = new URL(request.url);
    const usn = searchParams.get('usn');

    if (!usn || !usn.trim()) {
      return NextResponse.json({ success: false, error: 'USN is required' }, { status: 400 });
    }

    const cleanedUsn = usn.trim().toUpperCase();
    const alumnus = findAlumnusByUsn(cleanedUsn);

    if (!alumnus) {
      return NextResponse.json({
        success: true,
        found: false,
        message: `USN "${cleanedUsn}" was not found in the official university graduate directory. Please double-check your seat number or request manual addition.`
      });
    }

    // Check if this USN has already claimed their pass
    const attendees = await getAttendees();
    const existing = attendees.find(
      a => (a.usn || a.rollNumber).trim().toUpperCase() === cleanedUsn
    );

    return NextResponse.json({
      success: true,
      found: true,
      alreadyRegistered: Boolean(existing),
      claimedSummary: existing ? {
        fullName: existing.fullName,
        usn: existing.usn || existing.rollNumber,
        department: existing.department,
        registeredAt: existing.registeredAt,
        status: existing.status,
      } : null,
      alumnus: {
        usn: alumnus.usn,
        fullName: alumnus.fullName,
        department: alumnus.department,
        batchYear: alumnus.batchYear,
        maskedEmail: maskEmail(existing?.email || alumnus.officialEmail),
        maskedPhone: maskPhone(existing?.phone || alumnus.phone),
        hasEmail: Boolean(existing?.email || alumnus.officialEmail),
        hasPhone: Boolean(existing?.phone || alumnus.phone),
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Lookup failed' },
      { status: 500 }
    );
  }
}
