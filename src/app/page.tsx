'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import RegistrationForm from '@/components/RegistrationForm';
import PassLogin from '@/components/PassLogin';
import { EventSettings } from '@/lib/types';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'register' | 'lookup'>('register');
  const [stats, setStats] = useState<{ total: number; capacity: number; checkedIn: number }>({
    total: 0,
    capacity: 1000,
    checkedIn: 0,
  });
  const [settings, setSettings] = useState<EventSettings | null>(null);

  useEffect(() => {
    const loadStats = () => {
      fetch(`/api/attendees?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setStats(data.stats);
            setSettings(data.settings);
          }
        })
        .catch(err => console.error("Error fetching stats:", err));
    };

    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dbit-page-wrapper">
      {/* HERO SECTION */}
      <section id="about" className="dbit-hero-section">
        {/* Hero Left Column */}
        <div className="dbit-hero-left">
          {/* Logo & Meta Badge */}
          <div className="dbit-hero-badge-wrap">
            <img 
              src="/assets/1662177580bae749e245f3973661f37f.png" 
              alt="DBIT Alumni Association logo" 
              className="dbit-hero-assoc-logo"
            />
            <div className="dbit-hero-meta">
              <span className="dbit-hero-tag">
                ALUMNI MEET · MILAN 2026
              </span>
              <span className="dbit-gold-divider" />
              <span className="dbit-hero-venue">
                7 NOVEMBER 2026 · DBIT CRICKET GROUND, BANGALORE
              </span>
            </div>
          </div>

          {/* Main Headline */}
          <h1 className="dbit-hero-title">
            Reconnecting<br />
            <span className="dbit-hero-title-accent">Relations.</span>
          </h1>

          {/* Description */}
          <p className="dbit-hero-description">
            Every pass is matched against official alumni records. One identity, one verified pass — no screenshots, no transfers.
          </p>

          {/* Live Stats Cards */}
          <div className="dbit-hero-stats">
            <div className="dbit-stat-card">
              <div className="dbit-stat-number">{stats.total}</div>
              <div className="dbit-stat-label">PASSES CLAIMED</div>
            </div>
            <div className="dbit-stat-card">
              <div className="dbit-stat-number">100%</div>
              <div className="dbit-stat-label">VERIFIED ALUMNI</div>
            </div>
          </div>
        </div>

        {/* Hero Right Column (Claim & Find Portal Card) */}
        <div id="claim" className="dbit-hero-right">
          <div className="dbit-portal-card">
            {/* Top Switcher Tabs */}
            <div className="dbit-portal-tabs">
              <button
                type="button"
                onClick={() => setActiveTab('register')}
                className={`dbit-tab-button ${activeTab === 'register' ? 'active' : ''}`}
              >
                01 · CLAIM A PASS
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('lookup')}
                className={`dbit-tab-button ${activeTab === 'lookup' ? 'active' : ''}`}
              >
                02 · FIND MY PASS
              </button>
            </div>

            {/* Portal Body (Registration / Verification / Pass Lookup) */}
            <div className="dbit-portal-content">
              {activeTab === 'register' ? (
                <RegistrationForm onSwitchToLookup={() => setActiveTab('lookup')} />
              ) : (
                <PassLogin settings={settings || undefined} />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section id="how" className="dbit-how-section">
        <div className="dbit-section-tag-wrap">
          <span className="dbit-gold-divider-small" />
          <span className="dbit-section-tag">HOW IT WORKS</span>
        </div>

        <div className="dbit-how-grid">
          {/* Step 1 */}
          <div className="dbit-how-card">
            <span className="dbit-how-step-num">01</span>
            <h3 className="dbit-how-title">Enter your USN</h3>
            <p className="dbit-how-desc">
              Look yourself up using the university seat number from your college days.
            </p>
          </div>

          {/* Step 2 */}
          <div className="dbit-how-card">
            <span className="dbit-how-step-num">02</span>
            <h3 className="dbit-how-title">Confirm your record</h3>
            <p className="dbit-how-desc">
              We verify you against the official alumni directory. One identity, one pass.
            </p>
          </div>

          {/* Step 3 */}
          <div className="dbit-how-card">
            <span className="dbit-how-step-num">03</span>
            <h3 className="dbit-how-title">Get your QR pass</h3>
            <p className="dbit-how-desc">
              Generate your unique pass and show it at the entry gate on the day.
            </p>
          </div>
        </div>
      </section>

      {/* EVENT ATMOSPHERE / CONCERT SECTION */}
      <section className="dbit-event-preview-section">
        <div className="dbit-event-preview-left">
          <div className="dbit-event-meta-top">
            <span>ANNUAL ALUMNI GRAND REUNION</span>
            <span>BENGALURU • INDIA</span>
          </div>

          <div>
            <h2 className="dbit-event-title">
              ONE DAY.<br />
              ONE VIBE.
            </h2>
            <p className="dbit-event-desc">
              Milan 2026 is the annual return to campus — music, memories and thousands of alumni reconnecting under one roof.
            </p>
          </div>

          <a href="#claim" className="dbit-claim-action-btn">
            CLAIM ALUMNI PASS ↗
          </a>
        </div>

        <div className="dbit-event-preview-right">
          <div className="dbit-event-image-box">
            <img 
              src="/fest-banner.jpg" 
              alt="Milan 2026 Grand Celebration" 
              className="dbit-event-image"
            />
          </div>
          <div className="dbit-event-caption">
            <span>MILAN 2026 / MAIN CAMPUS STAGE</span>
            <span>ALUMNI ARCHIVE</span>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="dbit-footer no-print">
        <div className="dbit-footer-content">
          <div className="dbit-footer-branding">
            <div className="dbit-footer-logos-box">
              <img 
                src="/assets/66eff0e624600df79e9f69030275731c.png" 
                alt="Don Bosco Institute of Technology emblem" 
                className="dbit-footer-emblem"
              />
              <img 
                src="/assets/1662177580bae749e245f3973661f37f.png" 
                alt="DBIT Alumni Association logo" 
                className="dbit-footer-assoc"
              />
            </div>
            <div className="dbit-footer-text-group">
              <span className="dbit-footer-college">
                Don Bosco Institute of Technology, Bangalore
              </span>
              <span className="dbit-footer-sub">
                DBIT ALUMNI ASSOCIATION (R) · RECONNECTING RELATIONS
              </span>
            </div>
          </div>

          <div className="dbit-footer-right">
            <span className="dbit-footer-meet-tag">MILAN 2026 · ALUMNI MEET</span>
            <Link href="/admin" className="dbit-footer-admin-link">
              COMMITTEE LOGIN ↗
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
