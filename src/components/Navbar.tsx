'use client';

import React from 'react';
import Link from 'next/link';

export default function Navbar() {
  return (
    <header className="dbit-header no-print">
      <Link href="/" className="dbit-header-brand">
        <img 
          src="/assets/66eff0e624600df79e9f69030275731c.png" 
          alt="Don Bosco Institute of Technology emblem" 
          className="dbit-header-logo"
        />
        <div className="dbit-header-titles">
          <span className="dbit-header-name">
            MILAN<span className="dbit-accent-blue">2026</span>
          </span>
          <span className="dbit-header-subtitle">
            DBIT ALUMNI ASSOCIATION
          </span>
        </div>
      </Link>

      <nav className="dbit-header-nav">
        <a href="#about" className="dbit-nav-link">
          EVENT
        </a>
        <a href="#how" className="dbit-nav-link">
          PASS PORTAL
        </a>
        <a href="#claim" className="dbit-nav-cta">
          CLAIM PASS ↗
        </a>
      </nav>
    </header>
  );
}
