'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import PassLogin from '@/components/PassLogin';

export default function TicketSearchPage() {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '30px 20px 80px' }}>
      <div style={{ marginBottom: 20 }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          <ArrowLeft size={16} />
          Back to Event Home
        </Link>
      </div>

      <PassLogin />
    </div>
  );
}
