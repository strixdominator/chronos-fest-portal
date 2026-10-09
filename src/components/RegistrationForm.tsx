'use client';

import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  Mail, 
  Phone, 
  KeyRound, 
  ArrowRight, 
  Check, 
  Search,
  Lock,
  Users,
  UserPlus
} from 'lucide-react';
import TicketCard from './TicketCard';
import { Attendee } from '@/lib/types';

interface VerifiedAlumnus {
  usn: string;
  fullName: string;
  department: string;
  batchYear: string;
  maskedEmail: string;
  maskedPhone: string;
  hasEmail: boolean;
  hasPhone: boolean;
}

interface ClaimedSummary {
  fullName: string;
  usn: string;
  department?: string;
  registeredAt?: string;
  status?: string;
}

interface RegistrationFormProps {
  onSwitchToLookup?: () => void;
}

export default function RegistrationForm({ onSwitchToLookup }: RegistrationFormProps) {
  const [usnInput, setUsnInput] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [alumnus, setAlumnus] = useState<VerifiedAlumnus | null>(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [claimedSummary, setClaimedSummary] = useState<ClaimedSummary | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // OTP flow state for new registration
  const [otpChannel, setOtpChannel] = useState<'EMAIL' | 'PHONE'>('EMAIL');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [sendingChannel, setSendingChannel] = useState<'EMAIL' | 'PHONE' | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpTarget, setOtpTarget] = useState<string>('');

  // Step 3: Verified Session & Professional Details
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [sessionToken, setSessionToken] = useState('');
  const [organization, setOrganization] = useState('');
  const [designation, setDesignation] = useState('');
  const [generatingPass, setGeneratingPass] = useState(false);
  const [generatePassError, setGeneratePassError] = useState<string | null>(null);

  // Secure OTP unlock state for already-claimed pass
  const [claimedOtpChannel, setClaimedOtpChannel] = useState<'EMAIL' | 'PHONE'>('EMAIL');
  const [claimedOtpSent, setClaimedOtpSent] = useState(false);
  const [sendingClaimedOtp, setSendingClaimedOtp] = useState(false);
  const [claimedOtpCode, setClaimedOtpCode] = useState('');
  const [verifyingClaimedOtp, setVerifyingClaimedOtp] = useState(false);
  const [claimedOtpError, setClaimedOtpError] = useState<string | null>(null);
  const [claimedOtpTarget, setClaimedOtpTarget] = useState<string>('');

  // Fallback: manual review flow
  const [showManualReview, setShowManualReview] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [reviewReason, setReviewReason] = useState('');
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Delivery Confirmation Info (Real vs Simulation)
  const [deliveryInfo, setDeliveryInfo] = useState<{ isReal: boolean; message: string; simulationCode?: string } | null>(null);
  const [claimedDeliveryInfo, setClaimedDeliveryInfo] = useState<{ isReal: boolean; message: string; simulationCode?: string } | null>(null);

  // Completed Pass
  const [issuedPass, setIssuedPass] = useState<Attendee | null>(null);

  // 1. Look up USN in Alumni Master Database
  const handleLookupUsn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usnInput.trim()) return;

    setLookingUp(true);
    setLookupError(null);
    setAlumnus(null);
    setAlreadyRegistered(false);
    setClaimedSummary(null);
    setOtpSent(false);
    setOtpCode('');
    setOtpError(null);
    setSendingChannel(null);
    setIsOtpVerified(false);
    setSessionToken('');
    setOrganization('');
    setDesignation('');
    setGeneratePassError(null);
    setClaimedOtpSent(false);
    setClaimedOtpCode('');
    setClaimedOtpError(null);
    setShowManualReview(false);

    try {
      const res = await fetch(`/api/alumni/lookup?usn=${encodeURIComponent(usnInput.trim())}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to search graduate directory.');
      }

      if (!data.found) {
        setLookupError(data.message || `USN "${usnInput.toUpperCase()}" not found in alumni records.`);
        return;
      }

      if (data.alreadyRegistered) {
        setAlreadyRegistered(true);
        setClaimedSummary(data.claimedSummary || null);
        setAlumnus(data.alumnus);
        return;
      }

      setAlumnus(data.alumnus);
    } catch (err: any) {
      setLookupError(err.message);
    } finally {
      setLookingUp(false);
    }
  };

  // Dispatch OTP to unlock already claimed pass
  const handleSendClaimedOtp = async (channel: 'EMAIL' | 'PHONE') => {
    if (!alumnus) return;
    setSendingClaimedOtp(true);
    setClaimedOtpError(null);

    try {
      const res = await fetch('/api/alumni/pass-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SEND_OTP',
          usn: alumnus.usn,
          channel,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch unlock code.');
      }

      setClaimedOtpChannel(channel);
      setClaimedOtpSent(true);
      setClaimedOtpTarget(data.maskedTarget);
      setClaimedDeliveryInfo({
        isReal: !!data.isRealDelivery,
        message: data.message,
        simulationCode: data.simulationCode,
      });
    } catch (err: any) {
      setClaimedOtpError(err.message);
    } finally {
      setSendingClaimedOtp(false);
    }
  };

  // Verify OTP & Unlock Already Claimed Pass
  const handleVerifyClaimedOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alumnus || !claimedOtpCode.trim()) return;

    setVerifyingClaimedOtp(true);
    setClaimedOtpError(null);

    try {
      const res = await fetch('/api/alumni/pass-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'VERIFY_OTP',
          usn: alumnus.usn,
          otp: claimedOtpCode.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid verification code. Access denied.');
      }

      setIssuedPass(data.attendee);
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#d94a38', '#0a0a0a', '#ded9ee']
      });
    } catch (err: any) {
      setClaimedOtpError(err.message);
    } finally {
      setVerifyingClaimedOtp(false);
    }
  };

  // 2. Dispatch OTP strictly to verified directory contacts
  const handleSendOtp = async (channel: 'EMAIL' | 'PHONE') => {
    if (!alumnus) return;

    if (channel === 'EMAIL' && !alumnus.hasEmail) {
      setOtpError('No official email address on record for this USN. Please request manual committee approval below.');
      return;
    }

    if (channel === 'PHONE' && !alumnus.hasPhone) {
      setOtpError('No official mobile number on record for this USN. Please request manual committee approval below.');
      return;
    }

    setSendingOtp(true);
    setSendingChannel(channel);
    setOtpError(null);

    try {
      const res = await fetch('/api/alumni/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          usn: alumnus.usn, 
          channel,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch verification code.');
      }

      setOtpChannel(channel);
      setOtpSent(true);
      setOtpTarget(data.maskedTarget);
      setDeliveryInfo({
        isReal: !!data.isRealDelivery,
        message: data.message,
        simulationCode: data.simulationCode,
      });
    } catch (err: any) {
      setOtpError(err.message);
    } finally {
      setSendingOtp(false);
      setSendingChannel(null);
    }
  };

  // 3. Verify OTP -> Progress to Step 3 (Family Selection)
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alumnus || !otpCode.trim()) return;

    setVerifyingOtp(true);
    setOtpError(null);

    try {
      const res = await fetch('/api/alumni/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usn: alumnus.usn,
          otp: otpCode.trim(),
          verifyOnly: true,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid verification code.');
      }

      setIsOtpVerified(true);
      setSessionToken(data.sessionToken || '');
    } catch (err: any) {
      setOtpError(err.message);
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Complete Registration and Generate Final Pass with Organization & Designation
  const handleGenerateFinalPass = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!alumnus) return;

    if (!organization.trim()) {
      setGeneratePassError('Please enter your current organisation / company name.');
      return;
    }
    if (!designation.trim()) {
      setGeneratePassError('Please enter your current designation / role.');
      return;
    }

    setGeneratingPass(true);
    setGeneratePassError(null);

    try {
      const res = await fetch('/api/alumni/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usn: alumnus.usn,
          sessionToken,
          organization: organization.trim(),
          designation: designation.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate official pass.');
      }

      setIssuedPass(data.attendee);
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#d94a38', '#0a0a0a', '#ded9ee']
      });
    } catch (err: any) {
      setGeneratePassError(err.message);
    } finally {
      setGeneratingPass(false);
    }
  };

  // Manual Review Request
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alumnus || !newEmail || !newPhone) return;

    if (!organization.trim()) {
      setReviewError('Please enter your current organisation / company name.');
      return;
    }
    if (!designation.trim()) {
      setReviewError('Please enter your current designation / role.');
      return;
    }

    setSubmittingReview(true);
    setReviewError(null);

    try {
      const res = await fetch('/api/alumni/request-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usn: alumnus.usn,
          newEmail,
          newPhone,
          reason: reviewReason,
          degreeProofUrl: proofPreview || undefined,
          organization: organization.trim(),
          designation: designation.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit review request.');
      }

      setIssuedPass(data.attendee);
    } catch (err: any) {
      setReviewError(err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // IF PASS HAS BEEN ISSUED -> SHOW BOARDING PASS
  if (issuedPass) {
    const isPending = issuedPass.status === 'PENDING';
    return (
      <div className="animate-fade-in">
        <div style={{
          padding: '20px',
          background: isPending ? 'var(--accent-ochre)' : 'var(--accent-sage)',
          border: '1px solid var(--border-black)',
          marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span className="mono-tag" style={{ color: '#0a0a0a' }}>
              {isPending ? 'MANUAL REVIEW QUEUED' : 'VERIFIED PASS ISSUED'}
            </span>
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 900, textTransform: 'uppercase' }}>
            {isPending ? 'Identity Review Pending' : 'Your Digital Pass is Ready.'}
          </h3>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: '#2b2b2b', marginTop: 4 }}>
            {isPending 
              ? 'Your contact update request has been routed to the committee. Your pass will unlock immediately upon verification.'
              : 'Save this QR code to your phone. At the gate, volunteers will scan to admit your party.'}
          </p>
        </div>

        <TicketCard attendee={issuedPass} />

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => {
              setIssuedPass(null);
              setAlumnus(null);
              setUsnInput('');
              setOtpSent(false);
              setIsOtpVerified(false);
            }}
            className="btn-neo-outline"
            style={{ width: '100%' }}
          >
            REGISTER ANOTHER ALUMNUS ↗
          </button>
        </div>
      </div>
    );
  }

  // STEP 1: INITIAL STATE (FIGMA MAKE SPEC)
  if (!alumnus && !alreadyRegistered) {
    return (
      <div className="animate-fade-in">
        {/* Header Strip */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span className="mono-tag">OFFICIAL ALUMNI PORTAL</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
            01/03
          </span>
        </div>

        {/* Big Title */}
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: 28, textTransform: 'none' }}>
          Find your record.
        </h2>

        {/* Search Form */}
        <form onSubmit={handleLookupUsn}>
          <div style={{ marginBottom: 12 }}>
            <label className="mono-label" style={{ display: 'block', marginBottom: 8 }}>
              UNIVERSITY SEAT NUMBER
            </label>
            <div className="neo-input-group">
              <input
                type="text"
                required
                placeholder="E.G. 1DB20CS001"
                value={usnInput}
                onChange={e => setUsnInput(e.target.value.toUpperCase())}
                disabled={lookingUp}
                autoFocus
              />
              <button type="submit" disabled={lookingUp || !usnInput.trim()}>
                {lookingUp ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    SEARCHING...
                  </>
                ) : (
                  'FIND RECORD ↗'
                )}
              </button>
            </div>
          </div>

          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            We match your USN against the university alumni directory.
          </p>

          {lookupError && (
            <div style={{
              marginTop: 18,
              padding: '12px 16px',
              background: '#fee2e2',
              border: '1px solid var(--border-black)',
              color: '#991b1b',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <AlertCircle size={16} />
              <span>{lookupError}</span>
            </div>
          )}
        </form>
      </div>
    );
  }

  // IF ALREADY REGISTERED -> SECURE UNLOCK CARD
  if (alreadyRegistered && alumnus) {
    return (
      <div className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span className="mono-tag">LOCKED RECORD</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
            02/02
          </span>
        </div>

        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.1rem', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: 20 }}>
          Pass already claimed.
        </h2>

        {/* Alumnus info box */}
        <div className="neo-box" style={{ padding: '18px 20px', marginBottom: 20, background: 'var(--bg-card-alt)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="mono-label" style={{ fontSize: '0.68rem', marginBottom: 2 }}>REGISTERED GRADUATE</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 800 }}>
                {alumnus.fullName}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                {alumnus.department} · {alumnus.batchYear}
              </div>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.95rem', background: 'var(--bg-black)', color: '#fff', padding: '4px 8px' }}>
              {alumnus.usn}
            </span>
          </div>
        </div>

        {!claimedOtpSent && !showManualReview && (
          <div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
              To prevent impersonation, select your registered contact to receive a one-time unlock code:
            </p>

            {claimedOtpError && (
              <div style={{ padding: '10px 14px', background: '#fee2e2', border: '1px solid var(--border-black)', color: '#991b1b', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', marginBottom: 16 }}>
                {claimedOtpError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {alumnus.hasEmail && (
                <button
                  type="button"
                  disabled={sendingClaimedOtp}
                  onClick={() => handleSendClaimedOtp('EMAIL')}
                  className="btn-neo-black"
                  style={{ width: '100%', justifyContent: 'space-between' }}
                >
                  <span>SEND OTP TO {alumnus.maskedEmail}</span>
                  <span>↗</span>
                </button>
              )}

              {alumnus.hasPhone && (
                <button
                  type="button"
                  disabled={sendingClaimedOtp}
                  onClick={() => handleSendClaimedOtp('PHONE')}
                  className="btn-neo-outline"
                  style={{ width: '100%', justifyContent: 'space-between' }}
                >
                  <span>SEND OTP TO {alumnus.maskedPhone}</span>
                  <span>↗</span>
                </button>
              )}
            </div>

            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => setShowManualReview(true)}
                style={{ background: 'none', border: 'none', fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--accent-coral)', cursor: 'pointer', textDecoration: 'underline' }}
              >
                LOST ACCESS TO EMAIL/PHONE? REQUEST COMMITTEE REVIEW
              </button>
            </div>
          </div>
        )}

        {/* Claimed OTP Sent Form */}
        {claimedOtpSent && !showManualReview && (
          <form onSubmit={handleVerifyClaimedOtp}>
            {/* Delivery Confirmation Feedback Banner */}
            {claimedDeliveryInfo && (
              <div style={{
                padding: '12px 14px',
                background: claimedDeliveryInfo.isReal ? '#ecfdf5' : '#eff6ff',
                border: `1.5px solid ${claimedDeliveryInfo.isReal ? '#059669' : '#1d4ed8'}`,
                color: claimedDeliveryInfo.isReal ? '#065f46' : '#1e3a8a',
                marginBottom: 16
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: '0.82rem' }}>
                  <span>{claimedDeliveryInfo.isReal ? '✓' : 'ℹ️'}</span>
                  <span>{claimedDeliveryInfo.isReal ? 'CODE DISPATCHED SUCCESSFULLY' : 'HOST SERVER IN SIMULATION MODE'}</span>
                </div>
                <div style={{ fontSize: '0.75rem', marginTop: 3, lineHeight: 1.4 }}>
                  {claimedDeliveryInfo.isReal ? (
                    <>Security code delivered to <strong>{claimedOtpTarget}</strong>. Please check your <strong>Inbox</strong>, <strong>Updates</strong>, and <strong>Spam / Junk</strong> folder.</>
                  ) : (
                    <>
                      {claimedDeliveryInfo.message || 'Live mail server credentials not set in host environment.'}
                      <div style={{ marginTop: 4 }}>
                        For testing, use code: <strong style={{ color: '#1d4ed8', fontSize: '0.95rem', letterSpacing: '0.1em' }}>{claimedDeliveryInfo.simulationCode}</strong>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label className="mono-label" style={{ display: 'block', marginBottom: 8 }}>
                ENTER 6-DIGIT CODE SENT TO {claimedOtpTarget}
              </label>
              <div className="neo-input-group">
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="6-DIGIT CODE"
                  value={claimedOtpCode}
                  onChange={e => setClaimedOtpCode(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                />
                <button type="submit" disabled={verifyingClaimedOtp || claimedOtpCode.length < 6}>
                  {verifyingClaimedOtp ? 'UNLOCKING...' : 'UNLOCK PASS ↗'}
                </button>
              </div>
            </div>

            {claimedOtpError && (
              <div style={{ padding: '10px 14px', background: '#fee2e2', border: '1px solid var(--border-black)', color: '#991b1b', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', marginBottom: 16 }}>
                {claimedOtpError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', marginTop: 12 }}>
              <button
                type="button"
                onClick={() => handleSendClaimedOtp(claimedOtpChannel)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'underline' }}
              >
                RESEND CODE
              </button>
              <button
                type="button"
                onClick={() => setClaimedOtpSent(false)}
                style={{ background: 'none', border: 'none', color: 'var(--accent-coral)', cursor: 'pointer', textDecoration: 'underline' }}
              >
                CHANGE METHOD
              </button>
            </div>
          </form>
        )}

        {/* Manual Review Fallback */}
        {showManualReview && (
          <form onSubmit={handleSubmitReview} style={{ marginTop: 16 }}>
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 800, marginBottom: 8 }}>
              REQUEST MANUAL RECOVERY
            </h4>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
              Provide updated contact details. Our festival committee will verify your identity.
            </p>

            <div style={{ marginBottom: 12 }}>
              <label className="mono-label" style={{ display: 'block', marginBottom: 4 }}>NEW ACTIVE EMAIL *</label>
              <input
                type="email"
                required
                className="neo-input"
                placeholder="your.email@example.com"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label className="mono-label" style={{ display: 'block', marginBottom: 4 }}>NEW ACTIVE PHONE *</label>
              <input
                type="tel"
                required
                className="neo-input"
                placeholder="+91 98765 43210"
                value={newPhone}
                onChange={e => setNewPhone(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label className="mono-label" style={{ display: 'block', marginBottom: 4 }}>REASON</label>
              <input
                type="text"
                className="neo-input"
                placeholder="Lost access to previous email"
                value={reviewReason}
                onChange={e => setReviewReason(e.target.value)}
              />
            </div>

            {/* Current Organisation & Designation */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 14 }}>
              <div>
                <label className="mono-label" style={{ display: 'block', marginBottom: 4, fontSize: '0.68rem' }}>CURRENT ORGANISATION *</label>
                <input
                  type="text"
                  required
                  className="neo-input"
                  style={{ padding: '8px', fontSize: '0.8rem' }}
                  placeholder="e.g. Google, TCS"
                  value={organization}
                  onChange={e => setOrganization(e.target.value)}
                />
              </div>
              <div>
                <label className="mono-label" style={{ display: 'block', marginBottom: 4, fontSize: '0.68rem' }}>CURRENT DESIGNATION *</label>
                <input
                  type="text"
                  required
                  className="neo-input"
                  style={{ padding: '8px', fontSize: '0.8rem' }}
                  placeholder="e.g. Lead Architect"
                  value={designation}
                  onChange={e => setDesignation(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setShowManualReview(false)}
                className="btn-neo-outline"
                style={{ flex: 1 }}
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={submittingReview}
                className="btn-neo-black"
                style={{ flex: 1 }}
              >
                {submittingReview ? 'SUBMITTING...' : 'SUBMIT REQUEST ↗'}
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  // STEP 2: VERIFICATION & OTP DISPATCH
  if (alumnus && !isOtpVerified) {
    return (
      <div className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span className="mono-tag">02 / 03 • IDENTITY VERIFICATION</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
            02/03
          </span>
        </div>

        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: 20 }}>
          Verify your identity.
        </h2>

        {/* Directory matched card */}
        <div className="neo-box" style={{ padding: '18px 20px', marginBottom: 20, background: 'var(--bg-card-alt)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="mono-tag" style={{ fontSize: '0.68rem', marginBottom: 2 }}>MATCHED RECORD</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800 }}>
                {alumnus.fullName}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                {alumnus.department} · BATCH {alumnus.batchYear}
              </div>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.95rem', background: 'var(--bg-black)', color: '#fff', padding: '4px 8px' }}>
              {alumnus.usn}
            </span>
          </div>
        </div>

        {/* Contact selection if OTP NOT sent yet and NOT requesting manual review */}
        {!otpSent && !showManualReview && (
          <div>
            <div style={{ marginBottom: 16 }}>
              {/* Email Option */}
              <div className="neo-box" style={{ padding: 16, marginBottom: 12, background: alumnus.hasEmail ? '#fff' : 'var(--bg-card-alt)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span className="mono-label">OFFICIAL EMAIL</span>
                  {alumnus.hasEmail ? (
                    <span className="badge-onfile">ON FILE</span>
                  ) : (
                    <span className="badge-missing">NOT ON FILE</span>
                  )}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', fontWeight: 700, marginBottom: 10 }}>
                  {alumnus.hasEmail ? alumnus.maskedEmail : 'Not recorded in college directory'}
                </div>
                {alumnus.hasEmail && (
                  <button
                    type="button"
                    disabled={sendingOtp}
                    onClick={() => handleSendOtp('EMAIL')}
                    className="btn-neo-black"
                    style={{ width: '100%', fontSize: '0.76rem', padding: '12px' }}
                  >
                    {sendingOtp && sendingChannel === 'EMAIL' ? 'DISPATCHING...' : 'SEND OTP TO EMAIL ↗'}
                  </button>
                )}
              </div>

              {/* Mobile Option */}
              <div className="neo-box" style={{ padding: 16, marginBottom: 12, background: alumnus.hasPhone ? '#fff' : 'var(--bg-card-alt)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span className="mono-label">OFFICIAL MOBILE</span>
                  {alumnus.hasPhone ? (
                    <span className="badge-onfile">ON FILE</span>
                  ) : (
                    <span className="badge-missing">NOT ON FILE</span>
                  )}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', fontWeight: 700, marginBottom: 10 }}>
                  {alumnus.hasPhone ? alumnus.maskedPhone : 'Not recorded in college directory'}
                </div>
                {alumnus.hasPhone && (
                  <button
                    type="button"
                    disabled={sendingOtp}
                    onClick={() => handleSendOtp('PHONE')}
                    className="btn-neo-outline"
                    style={{ width: '100%', fontSize: '0.76rem', padding: '12px' }}
                  >
                    {sendingOtp && sendingChannel === 'PHONE' ? 'DISPATCHING...' : 'SEND OTP TO MOBILE ↗'}
                  </button>
                )}
              </div>

              {/* Option to request manual approval if contacts changed */}
              {(alumnus.hasEmail || alumnus.hasPhone) && (
                <div style={{ marginTop: 14, textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setShowManualReview(true)}
                    style={{ background: 'none', border: 'none', fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--accent-coral)', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    LOST ACCESS TO REGISTERED CONTACT? REQUEST MANUAL APPROVAL ↗
                  </button>
                </div>
              )}
            </div>

            {/* Anti-Forgery Protection Banner if NEITHER on file */}
            {!alumnus.hasEmail && !alumnus.hasPhone && (
              <div style={{
                padding: '20px',
                background: 'var(--accent-ochre)',
                border: '1px solid var(--border-black)',
                marginBottom: 16
              }}>
                <div className="mono-tag" style={{ color: '#0a0a0a', marginBottom: 4 }}>
                  ANTI-FORGERY LOCK
                </div>
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 800, marginBottom: 6 }}>
                  Committee Approval Required
                </h4>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: '#2b2b2b', marginBottom: 14 }}>
                  No registered contact was found for USN <strong>{alumnus.usn}</strong>. To prevent fraudulent access, automated OTP is locked. Submit your credentials for manual review.
                </p>
                <button
                  type="button"
                  onClick={() => setShowManualReview(true)}
                  className="btn-neo-black"
                  style={{ width: '100%' }}
                >
                  REQUEST MANUAL APPROVAL ↗
                </button>
              </div>
            )}

            {otpError && (
              <div style={{ padding: '10px 14px', background: '#fee2e2', border: '1px solid var(--border-black)', color: '#991b1b', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                {otpError}
              </div>
            )}
          </div>
        )}

        {/* Manual Approval Request Form in Step 2 */}
        {showManualReview && (
          <form onSubmit={handleSubmitReview} style={{ marginTop: 16 }}>
            <div style={{
              padding: '18px 20px',
              background: 'var(--card-blue-1)',
              border: '1px solid var(--border-black)',
              marginBottom: 18
            }}>
              <div className="mono-tag" style={{ color: 'var(--accent-blue)', marginBottom: 2 }}>
                OFFICIAL VERIFICATION QUEUE
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase' }}>
                Request Committee Manual Approval
              </h3>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                Provide your current active contact details and upload an ID proof. The organizers will verify your records and approve your pass.
              </p>
            </div>

            {reviewError && (
              <div style={{ padding: '10px 14px', background: '#fee2e2', border: '1px solid var(--border-black)', color: '#991b1b', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', marginBottom: 16 }}>
                {reviewError}
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <label className="mono-label" style={{ display: 'block', marginBottom: 6 }}>
                CURRENT ACTIVE EMAIL *
              </label>
              <input
                type="email"
                required
                className="neo-input"
                placeholder="your.email@example.com"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label className="mono-label" style={{ display: 'block', marginBottom: 6 }}>
                CURRENT ACTIVE MOBILE NUMBER *
              </label>
              <input
                type="tel"
                required
                className="neo-input"
                placeholder="+91 98765 43210"
                value={newPhone}
                onChange={e => setNewPhone(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label className="mono-label" style={{ display: 'block', marginBottom: 6 }}>
                REASON / NOTES
              </label>
              <input
                type="text"
                className="neo-input"
                placeholder="e.g. Phone number changed / Lost access to registered contact"
                value={reviewReason}
                onChange={e => setReviewReason(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label className="mono-label" style={{ display: 'block', marginBottom: 6 }}>
                COLLEGE ID CARD / DEGREE PROOF (PHOTO)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleProofUpload}
                className="neo-input"
                style={{ padding: '8px' }}
              />
              {proofPreview && (
                <div style={{ marginTop: 10, border: '1px solid var(--border-black)', padding: 6, background: '#fff' }}>
                  <img src={proofPreview} alt="Proof Preview" style={{ maxHeight: 150, display: 'block', margin: '0 auto' }} />
                </div>
              )}
            </div>

            {/* Current Organisation & Designation */}
            <div style={{
              padding: '16px',
              background: 'var(--bg-card-alt)',
              border: '1px solid var(--border-black)',
              marginBottom: 18
            }}>
              <div className="mono-label" style={{ marginBottom: 10, fontSize: '0.72rem' }}>PROFESSIONAL DETAILS *</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                <div>
                  <label className="mono-label" style={{ display: 'block', marginBottom: 4, fontSize: '0.66rem' }}>CURRENT ORGANISATION *</label>
                  <input
                    type="text"
                    required
                    className="neo-input"
                    style={{ padding: '8px', fontSize: '0.82rem' }}
                    placeholder="e.g. Google, Infosys, Self-Employed"
                    value={organization}
                    onChange={e => setOrganization(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mono-label" style={{ display: 'block', marginBottom: 4, fontSize: '0.66rem' }}>CURRENT DESIGNATION *</label>
                  <input
                    type="text"
                    required
                    className="neo-input"
                    style={{ padding: '8px', fontSize: '0.82rem' }}
                    placeholder="e.g. Lead Engineer, Product Head"
                    value={designation}
                    onChange={e => setDesignation(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowManualReview(false)}
                className="btn-neo-outline"
                style={{ flex: 1, padding: '12px' }}
              >
                CANCEL / BACK
              </button>
              <button
                type="submit"
                disabled={submittingReview}
                className="btn-neo-black"
                style={{ flex: 2, padding: '12px' }}
              >
                {submittingReview ? 'SUBMITTING REQUEST...' : 'SUBMIT FOR APPROVAL ↗'}
              </button>
            </div>
          </form>
        )}


        {/* OTP Code Form */}
        {otpSent && (
          <form onSubmit={handleVerifyOtp}>
            {/* Delivery Confirmation Feedback Banner */}
            {deliveryInfo && (
              <div style={{
                padding: '12px 14px',
                background: deliveryInfo.isReal ? '#ecfdf5' : '#eff6ff',
                border: `1.5px solid ${deliveryInfo.isReal ? '#059669' : '#1d4ed8'}`,
                color: deliveryInfo.isReal ? '#065f46' : '#1e3a8a',
                marginBottom: 16
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: '0.82rem' }}>
                  <span>{deliveryInfo.isReal ? '✓' : 'ℹ️'}</span>
                  <span>{deliveryInfo.isReal ? 'CODE DISPATCHED SUCCESSFULLY' : 'HOST SERVER IN SIMULATION MODE'}</span>
                </div>
                <div style={{ fontSize: '0.75rem', marginTop: 3, lineHeight: 1.4 }}>
                  {deliveryInfo.isReal ? (
                    <>Verification code delivered to <strong>{otpTarget}</strong>. Please check your <strong>Inbox</strong>, <strong>Updates</strong>, and <strong>Spam / Junk</strong> folder.</>
                  ) : (
                    <>
                      {deliveryInfo.message || 'Live mail server credentials not set in host environment.'}
                      <div style={{ marginTop: 4 }}>
                        For testing, use code: <strong style={{ color: '#1d4ed8', fontSize: '0.95rem', letterSpacing: '0.1em' }}>{deliveryInfo.simulationCode}</strong>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

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
                  {verifyingOtp ? 'VERIFYING...' : 'VERIFY OTP ↗'}
                </button>
              </div>
            </div>

            {otpError && (
              <div style={{ padding: '10px 14px', background: '#fee2e2', border: '1px solid var(--border-black)', color: '#991b1b', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', marginBottom: 16 }}>
                {otpError}
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
    );
  }

  // STEP 3: PROFESSIONAL DETAILS & PASS CLAIM
  if (alumnus && isOtpVerified) {
    return (
      <div className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span className="mono-tag">03 / 03 • PROFESSIONAL DETAILS</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
            03/03
          </span>
        </div>

        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: 12 }}>
          Complete Registration.
        </h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
          Verification successful. Enter your current professional details to generate your official festival entry pass.
        </p>

        {/* Verified Alumnus Card showing Name, USN, Dept & Batch */}
        <div style={{
          padding: '16px 20px',
          background: 'var(--bg-card-alt)',
          border: '2px solid var(--border-black)',
          boxShadow: '4px 4px 0 #000',
          marginBottom: 24,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div className="mono-label" style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                VERIFIED ALUMNUS
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.45rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
                {alumnus.fullName}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                {alumnus.department} • Batch of {alumnus.batchYear}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="mono-label" style={{ fontSize: '0.65rem', marginBottom: 4 }}>UNIVERSITY SEAT NUMBER</div>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 900,
                fontSize: '1rem',
                background: 'var(--bg-black)',
                color: '#fff',
                padding: '4px 10px',
                display: 'inline-block',
                letterSpacing: '0.05em'
              }}>
                {alumnus.usn}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleGenerateFinalPass}>
          {/* Two Input Boxes: Current Organisation & Designation */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
            <div>
              <label htmlFor="current-org-input" className="mono-label" style={{ display: 'block', marginBottom: 6, fontSize: '0.72rem' }}>
                CURRENT ORGANISATION / COMPANY *
              </label>
              <input
                id="current-org-input"
                type="text"
                required
                className="neo-input"
                placeholder="e.g. Google, Microsoft, Infosys, Self-Employed"
                value={organization}
                onChange={e => setOrganization(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', fontSize: '0.92rem' }}
              />
            </div>

            <div>
              <label htmlFor="current-desig-input" className="mono-label" style={{ display: 'block', marginBottom: 6, fontSize: '0.72rem' }}>
                CURRENT DESIGNATION / ROLE *
              </label>
              <input
                id="current-desig-input"
                type="text"
                required
                className="neo-input"
                placeholder="e.g. Senior Software Engineer, Director, Founder"
                value={designation}
                onChange={e => setDesignation(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', fontSize: '0.92rem' }}
              />
            </div>
          </div>

          {generatePassError && (
            <div style={{ padding: '10px 14px', background: '#fee2e2', border: '1px solid var(--border-black)', color: '#991b1b', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', marginBottom: 16 }}>
              {generatePassError}
            </div>
          )}

          <button
            type="submit"
            id="claim-pass-btn"
            disabled={generatingPass || !organization.trim() || !designation.trim()}
            className="btn-neo-black"
            style={{ width: '100%', padding: '16px', fontSize: '0.92rem' }}
          >
            {generatingPass ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                GENERATING OFFICIAL PASS...
              </>
            ) : (
              'CLAIM OFFICIAL ALUMNI PASS ↗'
            )}
          </button>
        </form>
      </div>
    );
  }

  return null;
}
