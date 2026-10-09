'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import RegistrationForm from '@/components/RegistrationForm';
import PassLogin from '@/components/PassLogin';
import { EventSettings } from '@/lib/types';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'register' | 'lookup'>('register');
  const [stats, setStats] = useState<{ total: number; capacity: number; checkedIn: number }>({
    total: 850,
    capacity: 1000,
    checkedIn: 345,
  });
  const [settings, setSettings] = useState<EventSettings | null>(null);

  useEffect(() => {
    fetch('/api/attendees')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStats(data.stats);
          setSettings(data.settings);
        }
      })
      .catch(err => console.error("Error fetching stats:", err));
  }, []);

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>
      {/* SECTION 1: HERO SPLIT GRID (FIGMA MAKE SPEC) */}
      <section id="portal" className="neo-hero-grid">
        {/* Hero Left Column */}
        <div className="neo-hero-left">
          <div className="neo-hero-left-content">
            <div className="mono-tag">01 / ACCESS</div>
            <h1 className="neo-hero-title">
              RECONNECTING<br />
              RELATIONS.
            </h1>
            <p className="neo-hero-desc">
              Every pass is matched against official alumni records. One identity, one verified pass — no screenshots, no transfers.
            </p>
          </div>

          <div className="neo-hero-stats">
            <div className="neo-hero-stat-cell">
              <div className="neo-hero-stat-value">OPEN</div>
              <div className="neo-hero-stat-label">PASSES CLAIMED</div>
            </div>
            <div className="neo-hero-stat-cell">
              <div className="neo-hero-stat-value">+4</div>
              <div className="neo-hero-stat-label">FAMILY ACCESS</div>
            </div>
          </div>
        </div>

        {/* Hero Right Column (Tabs + Registration / Pass Login Card) */}
        <div className="neo-hero-right">
          <div className="neo-hero-portal-card">
            {/* Top Tabs Strip */}
            <div className="neo-tabs-header">
              <button
                type="button"
                onClick={() => setActiveTab('register')}
                className={`neo-tab-btn ${activeTab === 'register' ? 'active' : ''}`}
              >
                01 • CLAIM A PASS
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('lookup')}
                className={`neo-tab-btn ${activeTab === 'lookup' ? 'active' : ''}`}
              >
                02 • FIND MY PASS
              </button>
            </div>

            {/* Portal Card Content */}
            <div className="neo-portal-body">
              {activeTab === 'register' ? (
                <RegistrationForm onSwitchToLookup={() => setActiveTab('lookup')} />
              ) : (
                <PassLogin settings={settings || undefined} />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: "BEFORE YOU ARRIVE." 3-CARD GRID (FIGMA MAKE SPEC) */}
      <section id="about" className="before-arrive-section">
        <div className="before-arrive-header">
          <h2 className="before-arrive-title">
            BEFORE YOU ARRIVE.
          </h2>
          <p className="before-arrive-desc">
            Bring a government-issued photo ID. Your digital pass activates your entry quota at the security gate.
          </p>
        </div>

        <div className="before-arrive-cards">
          {/* Card 1: Sage */}
          <div className="before-arrive-card card-sage">
            <span className="before-arrive-card-num">01</span>
            <div>
              <h3 className="before-arrive-card-heading">VERIFIED ENTRY</h3>
              <p className="before-arrive-card-body">
                Passes are tied to your alumni record and cannot be transferred.
              </p>
            </div>
          </div>

          {/* Card 2: Lilac */}
          <div className="before-arrive-card card-lilac">
            <span className="before-arrive-card-num">02</span>
            <div>
              <h3 className="before-arrive-card-heading">FAMILY ACCESS</h3>
              <p className="before-arrive-card-body">
                Add up to four family members after identity verification.
              </p>
            </div>
          </div>

          {/* Card 3: Ochre */}
          <div className="before-arrive-card card-ochre">
            <span className="before-arrive-card-num">03</span>
            <div>
              <h3 className="before-arrive-card-heading">GATE CHECK-IN</h3>
              <p className="before-arrive-card-body">
                Keep your QR pass ready with a matching physical photo ID.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: "ONE NIGHT. EVERY ERA." MANIFESTO & CONCERT PHOTO (FIGMA MAKE SPEC) */}
      <section className="manifesto-section">
        <div className="manifesto-left">
          <div className="manifesto-top-meta">
            <span>UNIVERSITY GRAND FINALE</span>
            <span>BENGALURU • INDIA</span>
          </div>

          <div>
            <h2 className="manifesto-title">
              ONE DAY.<br />
              ONE VIBE.
            </h2>
            <p className="manifesto-text">
              Milan 2026 is the annual return to campus — music, memory and a thousand stories meeting under one roof.
            </p>
          </div>

          <a href="#portal" className="btn-neo-black" style={{ alignSelf: 'flex-start', padding: '16px 32px' }}>
            CLAIM ALUMNI PASS ↗
          </a>
        </div>

        <div className="manifesto-right">
          <div className="manifesto-image-wrapper">
            <img 
              src="/fest-banner.jpg" 
              alt="Milan 2026 Concert Grand Finale" 
              className="manifesto-image"
            />
          </div>
          <div className="manifesto-caption-bar">
            <span>MILAN ARCHIVE / MAIN STAGE</span>
            <span>001-026</span>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="neo-footer no-print">
        <div className="neo-footer-main">
          <div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.25rem' }}>
              MILAN <span style={{ color: 'var(--accent-coral)' }}>2026</span>
            </span>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
              DON BOSCO INSTITUTE OF TECHNOLOGY • ANNUAL ALUMNI PASS PORTAL
            </div>
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            <a href="#portal" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', textDecoration: 'none' }}>
              PASS PORTAL
            </a>
            <a href="#about" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', textDecoration: 'none' }}>
              GUIDELINES
            </a>
            <Link href="/admin" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)', textDecoration: 'none' }}>
              COMMITTEE LOGIN
            </Link>
          </div>
        </div>
        <div className="neo-footer-bottom">
          <span>© 2026 MILAN FESTIVAL COMMITTEE. ALL RIGHTS RESERVED.</span>
          <span>STRICT PHOTO ID VERIFICATION AT GATE</span>
        </div>
      </footer>
    </div>
  );
}
