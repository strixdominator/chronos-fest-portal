'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  const hideNav = pathname?.startsWith('/admin') || pathname?.startsWith('/scanner');

  return (
    <header className="dbit-header no-print">
      <Link href="/" className="dbit-header-brand" onClick={() => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('generate-fresh-pass'));
        }
      }}>
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

      {!hideNav && (
        <nav className="dbit-header-nav">
          <a href="#claim" className="dbit-nav-link">
            REGISTRATION
          </a>
          <a href="#how" className="dbit-nav-link">
            HOW IT WORKS
          </a>
          <a href="#faq" className="dbit-nav-link">
            FAQ
          </a>
          <a href="#contact" className="dbit-nav-link">
            CONTACT
          </a>
        </nav>
      )}
    </header>
  );
}
