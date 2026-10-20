'use client';

import React, { useState, useEffect } from 'react';
import { Phone, Mail, MapPin } from 'lucide-react';
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
    a: 'Check your USN for typos first. If it still does not match, write to the alumni association at alumni.relations@dbit.co.in and we will look into it.'
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

    // Ensure page opens at the very top including the header banner
    if (typeof window !== 'undefined' && !window.location.hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }

    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dbit-page-wrapper">
      {/* HEADER BANNER POSTER */}
      <div className="dbit-header-banner-container no-print">
        <div className="dbit-header-banner-inner">
          <img
            src="/header-banner.png"
            alt="Milan 2026 DBIT Alumni Grand Reunion"
            className="dbit-header-banner-img"
          />
        </div>
      </div>

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
                7 NOVEMBER 2026 · 2:30 PM · GATES OPEN 2:00 PM · DBIT CRICKET GROUND, BANGALORE
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
              <span className="dbit-glance-value">2:00 PM</span>
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
        <div className="dbit-event-preview-full">
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
            GENERATE ALUMNI PASS ↗
          </a>
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
            <a href="mailto:alumni.relations@dbit.co.in" style={{ color: 'var(--color-blue)', textDecoration: 'underline' }}>
              alumni.relations@dbit.co.in
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

      {/* FOOTER & CONTACT US */}
      <footer id="contact" className="dbit-footer no-print">
        {/* Full-width Branding Header Row */}
        <div className="dbit-footer-header-container">
          <img
            src="/assets/66eff0e624600df79e9f69030275731c.png"
            alt="Don Bosco Institute of Technology emblem"
            className="dbit-footer-brand-logo"
          />

          <div className="dbit-footer-text-group">
            <span className="dbit-footer-college">
              Don Bosco Institute of Technology, Bangalore
            </span>
            <span className="dbit-footer-sub">
              DBIT ALUMNI ASSOCIATION (R) · RECONNECTING RELATIONS
            </span>
          </div>

          <div className="dbit-footer-logo-badge">
            <img
              src="/assets/1662177580bae749e245f3973661f37f.png"
              alt="DBIT Alumni Association logo"
              className="dbit-footer-brand-logo"
            />
          </div>
        </div>

        <div className="dbit-footer-content">

          {/* CONTACT US */}
          <div className="dbit-footer-contact">
            <div className="dbit-contact-header">
              <h3 className="dbit-contact-title">Contact Us</h3>
              <span className="dbit-contact-gold-bar" />
            </div>

            <div className="dbit-contact-list">
              <div className="dbit-contact-item">
                <Phone size={19} className="dbit-contact-icon" />
                <a href="tel:9606236236" className="dbit-contact-link">
                  +9606236236
                </a>
              </div>

              <div className="dbit-contact-item">
                <Mail size={19} className="dbit-contact-icon" />
                <a href="mailto:alumni.relations@dbit.co.in" className="dbit-contact-link">
                  alumni.relations@dbit.co.in
                </a>
              </div>

              <div className="dbit-contact-item">
                <MapPin size={19} className="dbit-contact-icon" />
                <div className="dbit-contact-address">
                  <span>Don Bosco Institute of Technology</span>
                  <span>Kumbalagodu, Mysore Road</span>
                  <span>Bengaluru – 560074, India</span>
                </div>
              </div>
            </div>
          </div>

          {/* CONNECT US ON */}
          <div className="dbit-footer-connect">
            <div className="dbit-contact-header">
              <h3 className="dbit-contact-title">Connect us on</h3>
              <span className="dbit-contact-gold-bar" />
            </div>

            <div className="dbit-social-row">
              {/* Facebook */}
              <a
                href="https://www.facebook.com/people/Don-Bosco-Institute-Of-Technology-Alumni-Association-Bangalore/100087399470927/?mibextid=ZbWKwL"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                title="Facebook"
                className="dbit-social-circle dbit-social-facebook"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFFFFF">
                  <path d="M13.397 20.997v-8.196h2.765l.411-3.209h-3.176V7.548c0-.926.258-1.56 1.587-1.56h1.684V3.127A22.336 22.336 0 0 0 14.201 3c-2.444 0-4.122 1.492-4.122 4.231v2.355H7.332v3.209h2.753v8.202h3.312z" />
                </svg>
              </a>

              {/* X */}
              <a
                href="https://x.com/donboscoblr"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X (formerly Twitter)"
                title="X (formerly Twitter)"
                className="dbit-social-circle dbit-social-x"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#FFFFFF">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>

              {/* Instagram */}
              <a
                href="https://www.instagram.com/dbit.aa/?hl=en"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                title="Instagram"
                className="dbit-social-circle dbit-social-instagram"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFFFFF">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>

              {/* LinkedIn */}
              <a
                href="https://www.linkedin.com/in/don-bosco-institute-of-technology-alumni-association-dbitaa-bangalore-2975a4210/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                title="LinkedIn"
                className="dbit-social-circle dbit-social-linkedin"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#FFFFFF">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452z"/>
                </svg>
              </a>

              {/* YouTube */}
              <a
                href="https://www.youtube.com/channel/UC7oDORVrTwyYgEGupzb97vg"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                title="YouTube"
                className="dbit-social-circle dbit-social-youtube"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFFFFF">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>

        <div className="dbit-footer-bottom">
          <span className="dbit-footer-meet-tag">MILAN 2026 · ALUMNI MEET</span>
          <span className="dbit-footer-copy">
            © 2026 Don Bosco Institute of Technology Alumni Association (R). All rights reserved.
          </span>
        </div>
      </footer>
    </div>
  );
}
