'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Calendar, 
  MapPin, 
  ShieldCheck, 
  Sparkles, 
  QrCode, 
  Search, 
  ArrowRight, 
  Users, 
  CheckCircle2, 
  AlertCircle,
  Clock
} from 'lucide-react';
import RegistrationForm from '@/components/RegistrationForm';
import PassLogin from '@/components/PassLogin';
import TicketCard from '@/components/TicketCard';
import { Attendee, EventSettings } from '@/lib/types';

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

  const percentClaimed = Math.min(100, Math.round((stats.total / (stats.capacity || 1000)) * 100));

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 20px 80px' }}>
      {/* Hero Banner Section */}
      <div className="hero-wrapper">
        <img
          src="/fest-banner.jpg"
          alt="Chronos Fest 2026"
          className="hero-banner-img"
        />
        <div className="hero-overlay">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span className="brand-badge">OFFICIAL ALUMNI PASS PORTAL</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
              • GRADUATE VERIFICATION
            </span>
          </div>

          <h1 className="hero-title">
            {settings?.eventName || "CHRONOS FEST 2026"}
          </h1>
          <p style={{ color: '#cbd5e1', fontSize: '1.1rem', maxWidth: 650, lineHeight: 1.5 }}>
            {settings?.tagline || "The Future of Beats & Innovation | University Grand Finale"}
          </p>

          <div className="hero-meta-strip">
            <div className="hero-meta-item">
              <Calendar size={16} color="var(--accent-cyan)" />
              <span>{settings?.eventDate || "Saturday, Oct 24, 2026"}</span>
            </div>
            <div className="hero-meta-item">
              <Clock size={16} color="var(--accent-cyan)" />
              <span>{settings?.eventTime || "04:30 PM Onwards"}</span>
            </div>
            <div className="hero-meta-item">
              <MapPin size={16} color="var(--accent-cyan)" />
              <span>{settings?.eventVenue || "Grand Arena & Amphitheatre"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 12,
        margin: '32px 0 28px'
      }}>
        <button
          onClick={() => setActiveTab('register')}
          className={`btn ${activeTab === 'register' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '12px 28px', borderRadius: 999 }}
        >
          <Sparkles size={18} />
          New Student Registration
        </button>
        <button
          onClick={() => setActiveTab('lookup')}
          className={`btn ${activeTab === 'lookup' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '12px 28px', borderRadius: 999 }}
        >
          <Search size={18} />
          Check Pass Status / Login
        </button>
      </div>

      {/* Active Tab View */}
      {activeTab === 'register' ? (
        <RegistrationForm />
      ) : (
        <PassLogin settings={settings || undefined} />
      )}
    </div>
  );
}
