'use client';

import React, { useState } from 'react';
import { 
  Loader2, 
  AlertCircle, 
  KeyRound, 
  CheckCircle2,
  Mail,
  Phone
} from 'lucide-react';
import TicketCard from './TicketCard';
import { Attendee, EventSettings } from '@/lib/types';

interface PassLoginProps {
  initialUsn?: string;
  settings?: EventSettings;
  onUnlocked?: (attendee: Attendee) => void;
}

export default function PassLogin({ initialUsn = '', settings, onUnlocked }: PassLoginProps) {
  const [usn, setUsn] = useState(initialUsn);
  const [searching, setSearching] = useState(false);
  const [matchedAttendee, setMatchedAttendee] = useState<{ fullName: string; usn?: string; rollNumber?: string; department?: string; registeredAt?: string } | null>(null);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  // OTP state
  const [otpChannel, setOtpChannel] = useState<'EMAIL' | 'PHONE'>('EMAIL');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpTarget, setOtpTarget] = useState('');

  // Unlocked pass
  const [unlockedPass, setUnlockedPass] = useState<Attendee | null>(null);

  // 1. Find pass by USN
  const handleFindPass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usn.trim()) return;

    setSearching(true);
    setError(null);
    setMatchedAttendee(null);
    setOtpSent(false);

    try {
      const res = await fetch(`/api/alumni/lookup?usn=${encodeURIComponent(usn.trim())}`);
      const data = await res.json();

      if (!res.ok || !data.success || !data.found) {
        throw new Error(data.message || `No graduate record found for USN "${usn.toUpperCase()}".`);
      }

      if (!data.alreadyRegistered) {
        throw new Error(`No pass has been claimed yet for USN "${usn.toUpperCase()}". Please switch to tab 01 to claim.`);
      }

      setMatchedAttendee(data.claimedSummary || {
        fullName: data.alumnus.fullName,
        rollNumber: data.alumnus.usn,
        usn: data.alumnus.usn,
        department: data.alumnus.department,
      });
      setMaskedEmail(data.alumnus.maskedEmail);
      setMaskedPhone(data.alumnus.maskedPhone);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  };

  // 2. Dispatch Login OTP
  const handleSendOtp = async (channel: 'EMAIL' | 'PHONE') => {
    if (!matchedAttendee && !initialUsn) return;
    const targetUsn = matchedAttendee?.usn || matchedAttendee?.rollNumber || usn || initialUsn;

    setSendingOtp(true);
    setError(null);

    try {
      const res = await fetch('/api/alumni/pass-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SEND_OTP',
          usn: targetUsn,
          channel,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch security code.');
      }

      setOtpChannel(channel);
      setOtpSent(true);
      setOtpTarget(data.maskedTarget);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSendingOtp(false);
    }
  };

  // 3. Verify OTP & Unlock Pass
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetUsn = matchedAttendee?.usn || matchedAttendee?.rollNumber || usn || initialUsn;

    if (!targetUsn || !otpCode.trim()) return;
    setVerifyingOtp(true);
    setError(null);

    try {
      const res = await fetch('/api/alumni/pass-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'VERIFY_OTP',
          usn: targetUsn,
          otp: otpCode.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid OTP code.');
      }

      setUnlockedPass(data.attendee);
      if (onUnlocked) onUnlocked(data.attendee);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setVerifyingOtp(false);
    }
  };

  // If already unlocked
  if (unlockedPass) {
    return (
      <div className="animate-fade-in">
        <div style={{
          padding: '16px 20px',
          background: 'var(--accent-sage)',
          border: '1px solid var(--border-black)',
          marginBottom: 20
        }}>
          <span className="mono-tag" style={{ color: '#0a0a0a' }}>IDENTITY CONFIRMED</span>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 900, textTransform: 'uppercase', marginTop: 2 }}>
            Pass Unlocked
          </h3>
        </div>

        <TicketCard attendee={unlockedPass} settings={settings} />

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => {
              setUnlockedPass(null);
              setMatchedAttendee(null);
              setUsn('');
              setOtpSent(false);
            }}
            className="btn-neo-outline"
            style={{ width: '100%' }}
          >
            RETRIEVE ANOTHER PASS ↗
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header Strip */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span className="mono-tag">PASS RETRIEVAL</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
          {matchedAttendee ? '02/02' : '01/02'}
        </span>
      </div>

      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: 28 }}>
        {matchedAttendee ? 'Unlock your pass.' : 'Retrieve your pass.'}
      </h2>

      {/* Step 1: Search Form */}
      {!matchedAttendee && (
        <form onSubmit={handleFindPass}>
          <div style={{ marginBottom: 12 }}>
            <label className="mono-label" style={{ display: 'block', marginBottom: 8 }}>
              UNIVERSITY SEAT NUMBER
            </label>
            <div className="neo-input-group">
              <input
                type="text"
                required
                placeholder="E.G. 1DB20CS001"
                value={usn}
                onChange={e => setUsn(e.target.value.toUpperCase())}
                disabled={searching}
                autoFocus
              />
              <button type="submit" disabled={searching || !usn.trim()}>
                {searching ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    SEARCHING...
                  </>
                ) : (
                  'FIND PASS ↗'
                )}
              </button>
            </div>
          </div>

          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Enter the USN used during registration to pull up your digital pass.
          </p>

          {error && (
            <div style={{ marginTop: 18, padding: '12px 16px', background: '#fee2e2', border: '1px solid var(--border-black)', color: '#991b1b', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700 }}>
              {error}
            </div>
          )}
        </form>
      )}

      {/* Step 2: Matched Attendee & OTP Unlock */}
      {matchedAttendee && (
        <div>
          <div className="neo-box" style={{ padding: '18px 20px', marginBottom: 20, background: 'var(--bg-card-alt)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="mono-tag" style={{ fontSize: '0.68rem', marginBottom: 2 }}>MATCHED RECORD</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 800 }}>
                  {matchedAttendee.fullName}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  {matchedAttendee.department}
                </div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.95rem', background: 'var(--bg-black)', color: '#fff', padding: '4px 8px' }}>
                {matchedAttendee.usn || matchedAttendee.rollNumber}
              </span>
            </div>
          </div>

          {!otpSent ? (
            <div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                Select a verification channel to receive your secure unlock code:
              </p>

              {error && (
                <div style={{ padding: '10px 14px', background: '#fee2e2', border: '1px solid var(--border-black)', color: '#991b1b', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', marginBottom: 16 }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {maskedEmail && (
                  <button
                    type="button"
                    disabled={sendingOtp}
                    onClick={() => handleSendOtp('EMAIL')}
                    className="btn-neo-black"
                    style={{ width: '100%', justifyContent: 'space-between' }}
                  >
                    <span>SEND OTP TO {maskedEmail}</span>
                    <span>↗</span>
                  </button>
                )}

                {maskedPhone && (
                  <button
                    type="button"
                    disabled={sendingOtp}
                    onClick={() => handleSendOtp('PHONE')}
                    className="btn-neo-outline"
                    style={{ width: '100%', justifyContent: 'space-between' }}
                  >
                    <span>SEND OTP TO {maskedPhone}</span>
                    <span>↗</span>
                  </button>
                )}
              </div>

              <div style={{ marginTop: 20, textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    setMatchedAttendee(null);
                    setUsn('');
                  }}
                  style={{ background: 'none', border: 'none', fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  ENTER A DIFFERENT USN
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleVerifyOtp}>
              <div style={{ marginBottom: 16 }}>
                <label className="mono-label" style={{ display: 'block', marginBottom: 8 }}>
                  ENTER 6-DIGIT CODE SENT TO {otpTarget}
                </label>
                <div className="neo-input-group">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="6-DIGIT CODE"
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    autoFocus
                  />
                  <button type="submit" disabled={verifyingOtp || otpCode.length < 6}>
                    {verifyingOtp ? 'UNLOCKING...' : 'UNLOCK PASS ↗'}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{ padding: '10px 14px', background: '#fee2e2', border: '1px solid var(--border-black)', color: '#991b1b', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', marginBottom: 16 }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => handleSendOtp(otpChannel)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  RESEND CODE
                </button>
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-coral)', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  CHANGE METHOD
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
