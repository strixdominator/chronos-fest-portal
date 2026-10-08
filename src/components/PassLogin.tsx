'use client';

import React, { useState } from 'react';
import { 
  Lock, 
  KeyRound, 
  Mail, 
  Phone, 
  Loader2, 
  AlertCircle, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2,
  Search
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
        throw new Error(`No pass has been claimed yet for USN "${usn.toUpperCase()}". Please claim your pass first.`);
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
      <div style={{ textAlign: 'center' }}>
        <div style={{
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          padding: '14px 20px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          color: 'var(--status-approved)',
          fontSize: '0.9rem',
          fontWeight: 600
        }}>
          <CheckCircle2 size={18} />
          <span>Identity Confirmed via OTP · Pass Unlocked</span>
        </div>

        <TicketCard attendee={unlockedPass} settings={settings} />

        <div style={{ marginTop: 20 }}>
          <button
            onClick={() => {
              setUnlockedPass(null);
              setMatchedAttendee(null);
              setOtpSent(false);
              setOtpCode('');
            }}
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem' }}
          >
            Lock Pass / Switch User
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ padding: '32px', maxWidth: 640, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'rgba(0, 242, 254, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 12px'
        }}>
          <Lock size={26} color="var(--accent-cyan)" />
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, color: '#fff' }}>
          Secure Pass Login & Verification
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 4 }}>
          To prevent unauthorized access and screenshot theft, enter your USN and verify with an OTP sent to your registered contact.
        </p>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          color: '#fca5a5',
          fontSize: '0.9rem',
          marginBottom: 20
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: ENTER USN */}
      {!matchedAttendee && (
        <form onSubmit={handleFindPass}>
          <div className="form-group">
            <label className="form-label">University Seat Number (USN)</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="text"
                required
                placeholder="e.g. 1DB20CS001"
                className="form-input"
                style={{ textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700 }}
                value={usn}
                onChange={e => setUsn(e.target.value)}
              />
              <button
                type="submit"
                disabled={searching}
                className="btn btn-primary"
                style={{ whiteSpace: 'nowrap' }}
              >
                {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                Search Pass
              </button>
            </div>
          </div>
        </form>
      )}

      {/* STEP 2: PASS FOUND -> REQUIRE OTP TO UNLOCK */}
      {matchedAttendee && !otpSent && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-focus)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
            PASS FOUND & SECURELY LOCKED
          </span>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff' }}>
            {matchedAttendee.fullName}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>
            USN: <strong style={{ color: 'var(--accent-cyan)', fontFamily: 'monospace' }}>{matchedAttendee.usn || matchedAttendee.rollNumber}</strong> · {matchedAttendee.department}
          </p>

          <p style={{ fontSize: '0.85rem', color: '#cbd5e1', margin: '16px 0 12px' }}>
            Select where to send your 6-digit unlock code:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: maskedPhone ? '1fr 1fr' : '1fr', gap: 12 }}>
            <button
              type="button"
              onClick={() => handleSendOtp('EMAIL')}
              disabled={sendingOtp}
              className="btn btn-primary"
              style={{ fontSize: '0.85rem', padding: '12px' }}
            >
              <Mail size={16} />
              Send to Email ({maskedEmail || 'Registered'})
            </button>
            {maskedPhone && (
              <button
                type="button"
                onClick={() => handleSendOtp('PHONE')}
                disabled={sendingOtp}
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem', padding: '12px' }}
              >
                <Phone size={16} />
                Send to Mobile ({maskedPhone})
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => { setMatchedAttendee(null); setUsn(''); }}
            style={{ background: 'none', border: 'none', color: 'var(--text-sub)', fontSize: '0.8rem', marginTop: 14, cursor: 'pointer' }}
          >
            ← Enter different USN
          </button>
        </div>
      )}

      {/* STEP 3: ENTER OTP CODE */}
      {matchedAttendee && otpSent && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-focus)',
          borderRadius: 'var(--radius-md)',
          padding: '24px'
        }}>
          <form onSubmit={handleVerifyOtp}>
            <div className="form-group" style={{ textAlign: 'center' }}>
              <label className="form-label">
                Enter 6-Digit OTP sent to {otpTarget}
              </label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="e.g. 849201"
                className="form-input"
                style={{
                  fontFamily: 'monospace',
                  fontSize: '1.4rem',
                  letterSpacing: '0.35em',
                  textAlign: 'center',
                  fontWeight: 700
                }}
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={verifyingOtp || otpCode.length < 6}
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', marginTop: 10 }}
            >
              {verifyingOtp ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
              Verify OTP & Unlock My QR Pass
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: '0.8rem' }}>
              <button
                type="button"
                onClick={() => handleSendOtp(otpChannel)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                Resend Code
              </button>
              <button
                type="button"
                onClick={() => setOtpSent(false)}
                style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer' }}
              >
                Change channel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
