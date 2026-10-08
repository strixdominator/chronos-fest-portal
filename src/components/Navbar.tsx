'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { QrCode, ShieldCheck, Ticket, Users, Sparkles } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="navbar no-print">
      <Link href="/" className="nav-brand">
        <div style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #00f2fe, #9d4edd)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 16px rgba(0,242,254,0.4)'
        }}>
          <Sparkles size={22} color="#050b14" />
        </div>
        <div>
          <span style={{ fontWeight: 800, letterSpacing: '-0.03em', fontSize: '1.2rem' }}>
            CHRONOS<span style={{ color: 'var(--accent-cyan)' }}>'26</span>
          </span>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-sub)', fontWeight: 500, lineHeight: 1 }}>
            OFFICIAL ENTRY PASS
          </div>
        </div>
        <span className="brand-badge">COLLEGE FEST</span>
      </Link>

      <div className="nav-links">
        <Link 
          href="/" 
          className={`nav-item ${pathname === '/' ? 'active' : ''}`}
        >
          <Users size={16} />
          <span>Event & Register</span>
        </Link>

        <Link 
          href="/ticket" 
          className={`nav-item ${pathname.startsWith('/ticket') ? 'active' : ''}`}
        >
          <Ticket size={16} />
          <span>My Pass / Login</span>
        </Link>
      </div>
    </nav>
  );
}
