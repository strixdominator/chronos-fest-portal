import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import TicketCard from '@/components/TicketCard';
import { getAttendeeById, getAttendeeByTicketCode, getSettings } from '@/lib/db';
import { ArrowLeft, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TicketDetailsPage({ params }: PageProps) {
  const { id } = await params;
  let attendee = getAttendeeById(id);
  if (!attendee) {
    attendee = getAttendeeByTicketCode(id);
  }

  if (!attendee) {
    notFound();
  }

  const settings = getSettings();

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '30px 20px 80px' }}>
      <div className="no-print" style={{ marginBottom: 20 }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          <ArrowLeft size={16} />
          Back to Event Portal
        </Link>
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
