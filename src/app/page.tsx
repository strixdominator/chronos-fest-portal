'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import RegistrationForm from '@/components/RegistrationForm';
import PassLogin from '@/components/PassLogin';
import { EventSettings } from '@/lib/types';

const FAQS = [
  {
    q: 'Can I transfer my pass to someone else?',
    a: 'No. Each pass is tied to one verified alumni record, so it cannot be shared or transferred.'
  },
  {
    q: 'What if I cannot find my record?',
    a: 'Check your USN for typos first. If it still does not match, write to the alumni association at alumni@dbit.co.in and we will look into it.'
  },
  {
    q: 'What do I need to bring on the day?',
    a: 'Your QR pass on your phone or a printout. Each QR code works for a single entry, and you will receive a wristband at the gate.'
  },
  {
    q: 'Can I claim a pass more than once?',
    a: 'No. One alumni identity gets one pass. If you have lost yours, use the Find My Pass tab to retrieve it.'
  }
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'register' | 'lookup'>('register');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
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
                7 NOVEMBER 2026 · 3:00 PM · DBIT CRICKET GROUND, BANGALORE
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

      {/* EVENT AT A GLANCE BANNER */}
      <section className="dbit-glance-section">
        <div className="dbit-glance-grid">
          <div className="dbit-glance-item">
            <span className="dbit-glance-icon-box gold">
              <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
                <path d="M3.5 10h17M8 3v4M16 3v4" />
              </svg>
            </span>
            <div className="dbit-glance-text">
              <span className="dbit-glance-label">DATE</span>
              <span className="dbit-glance-value">7 NOVEMBER 2026</span>
            </div>
          </div>

          <div className="dbit-glance-item">
            <span className="dbit-glance-icon-box blue">
              <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
                <circle cx="12" cy="10" r="2.4" />
              </svg>
            </span>
            <div className="dbit-glance-text">
              <span className="dbit-glance-label">VENUE</span>
              <span className="dbit-glance-value">DBIT CRICKET GROUND, BANGALORE</span>
            </div>
          </div>

          <div className="dbit-glance-item">
            <span className="dbit-glance-icon-box cyan">
              <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="8.5" />
                <path d="M12 7.5V12l3 2" />
              </svg>
            </span>
            <div className="dbit-glance-text">
              <span className="dbit-glance-label">GATES OPEN</span>
              <span className="dbit-glance-value">3:00 PM</span>
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

      {/* FAQ SECTION */}
      <section id="faq" className="dbit-faq-section">
        <div className="dbit-faq-left">
          <div className="dbit-hero-meta">
            <span className="dbit-hero-tag">FAQ</span>
            <span className="dbit-gold-divider" />
            <span className="dbit-hero-venue">HELP & GUIDELINES</span>
          </div>
          <h2 className="dbit-faq-title">Good to know.</h2>
          <p className="dbit-faq-desc">
            Quick answers before you claim your pass. Still stuck? Write to us at{' '}
            <a href="mailto:alumni@dbit.co.in" style={{ color: 'var(--color-blue)', textDecoration: 'underline' }}>
              alumni@dbit.co.in
            </a>
            .
          </p>
        </div>

        <div className="dbit-faq-right">
          {FAQS.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div key={index} className="dbit-faq-item">
                <button
                  type="button"
                  className="dbit-faq-btn"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  aria-expanded={isOpen}
                >
                  <span>{faq.q}</span>
                  <span 
                    className="dbit-faq-toggle-icon" 
                    style={{ transform: isOpen ? 'rotate(45deg)' : 'none' }}
                  >
                    <svg 
                      width="16" 
                      height="16" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </span>
                </button>
                {isOpen && (
                  <p className="dbit-faq-answer">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
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
