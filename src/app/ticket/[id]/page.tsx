import React from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import TicketCard from '@/components/TicketCard';
import { getAttendeeByTicketCode, getAttendeeById, getAttendeeByUsn, getSettings } from '@/lib/db';
import { verifyAdminPasscode } from '@/lib/auth';
import { ArrowLeft, Sparkles, ShieldCheck } from 'lucide-react';
import { Attendee } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TicketDetailsPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sParams = searchParams ? await searchParams : {};

  // Check admin authorization from query params or cookies
  let cookiePasscode: string | undefined;
  try {
    const cookieStore = await cookies();
    cookiePasscode = cookieStore.get('dbit_admin_passcode')?.value || cookieStore.get('admin_passcode')?.value;
  } catch {
    // Fallback if cookies() is inaccessible
  }

  const rawAdminPasscode = (typeof sParams.adminPasscode === 'string' ? sParams.adminPasscode : '')
    || (typeof sParams.passcode === 'string' ? sParams.passcode : '')
    || cookiePasscode
    || '';

  const isAdmin = verifyAdminPasscode(rawAdminPasscode);
  const cleanId = (id || '').trim();

  // If cleanId is empty or explicitly invalid, return to pass portal
  if (!cleanId || cleanId === 'undefined' || cleanId === 'null') {
    redirect('/ticket');
  }

  let attendee: Attendee | undefined;

  if (isAdmin) {
    // Admin access: can view pass by ticketCode, Attendee ID (ATT-XXXX), or USN
    attendee = await getAttendeeByTicketCode(cleanId);
    if (!attendee) {
      attendee = await getAttendeeById(cleanId);
    }
    if (!attendee) {
      attendee = await getAttendeeByUsn(cleanId);
    }
  } else {
    // SECURITY: Prevent IDOR enumeration via sequential IDs (e.g. ATT-1001, ATT-1002).
    // If a public user modifies the URL to an ATT-XXXX ID, redirect them to the secure Pass Portal
    // where they must enter their USN and verify identity via OTP.
    if (/^ATT-\d+$/i.test(cleanId)) {
      redirect('/ticket');
    }

    // Public users can only view tickets via unguessable ticketCode
    attendee = await getAttendeeByTicketCode(cleanId);
  }

  if (!attendee) {
    notFound();
  }

  const settings = await getSettings();

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '30px 20px 80px' }}>
      <div className="no-print" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link
          href={isAdmin ? "/admin" : "/"}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.9rem' }}
        >
          <ArrowLeft size={16} />
          {isAdmin ? 'Back to Admin Console' : 'Back to Event Portal'}
        </Link>
        {isAdmin && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: '0.75rem',
              color: '#D4AF37',
              background: 'rgba(212,175,55,0.1)',
              border: '1px solid rgba(212,175,55,0.3)',
              padding: '3px 8px',
              borderRadius: 6,
            }}
          >
            <ShieldCheck size={14} /> Admin Verified Preview
          </span>
        )}
      </div>

      <TicketCard attendee={attendee} settings={settings} />

      <div className="glass-panel no-print" style={{ marginTop: 24, padding: '20px 24px', textAlign: 'left' }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={16} color="var(--accent-cyan)" />
          Gate Entry Instructions
        </h4>
        <ul style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.6, paddingLeft: 18 }}>
          <li>Present this QR code on your mobile screen at Gate Security.</li>
          <li>Keep your physical or digital College Student ID card ready for spot-checking.</li>
          <li>Once scanned, volunteers will attach your security wristband. Wristbands cannot be transferred or removed.</li>
          <li>Screenshots are monitored: each QR code grants admission exactly ONE time.</li>
        </ul>
      </div>
    </div>
  );
}
