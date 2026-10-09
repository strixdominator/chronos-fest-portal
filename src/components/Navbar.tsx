'use client';

import React from 'react';
import Link from 'next/link';

export default function Navbar() {
  return (
    <header className="neo-nav no-print">
      <Link href="/" className="neo-nav-brand">
        CHRONOS<span className="brand-slash">/26</span>
      </Link>

      <div className="neo-nav-links">
        <a href="#about" className="neo-nav-item">
          EVENT
        </a>
        <a href="#portal" className="neo-nav-item">
          PASS PORTAL
        </a>
        <a href="#portal" className="neo-nav-cta">
          CLAIM PASS ↗
        </a>
      </div>
    </header>
  );
}
