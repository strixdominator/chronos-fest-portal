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
  UploadCloud, 
  ArrowRight, 
  Check, 
  HelpCircle, 
  Sparkles,
  Search,
  ExternalLink,
  GraduationCap,
  Lock,
  Users,
  UserPlus
} from 'lucide-react';
import TicketCard from './TicketCard';
import { Attendee, FamilyMember } from '@/lib/types';

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

export default function RegistrationForm() {
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

  // Step 3: Verified Session & Family Members (Max 4)
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [sessionToken, setSessionToken] = useState('');
  const [familyCount, setFamilyCount] = useState<number>(0);
  const [familyMembers, setFamilyMembers] = useState<Array<{ name: string; relation: string; age?: string }>>([]);
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

  // Fallback: lost access / manual review flow
  const [showManualReview, setShowManualReview] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [reviewReason, setReviewReason] = useState('');
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

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
    setFamilyCount(0);
    setFamilyMembers([]);
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
        colors: ['#00f2fe', '#9d4edd', '#ff007f']
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
      setOtpError('No official email address on record for this USN. Please use mobile verification or request manual committee approval below.');
      return;
    }

    if (channel === 'PHONE' && !alumnus.hasPhone) {
      setOtpError('No official mobile number on record for this USN. Please use email verification or request manual committee approval below.');
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

  // Family members dynamic count changer (Max 4)
  const handleFamilyCountChange = (count: number) => {
    const clamped = Math.min(4, Math.max(0, count));
    setFamilyCount(clamped);
    setFamilyMembers(prev => {
      const updated = [...prev];
      while (updated.length < clamped) {
        updated.push({ name: '', relation: 'Spouse', age: '' });
      }
      return updated.slice(0, clamped);
    });
  };

  const handleMemberChange = (index: number, field: 'name' | 'relation' | 'age', value: string) => {
    setFamilyMembers(prev => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  };

  // 3B. Complete Registration and Generate Pass
  const handleGenerateFinalPass = async (e?: React.FormEvent, overrideCount?: number) => {
    if (e) e.preventDefault();
    if (!alumnus) return;

    const targetCount = overrideCount !== undefined ? overrideCount : familyCount;

    // Validate family member names
    if (targetCount > 0) {
      for (let i = 0; i < targetCount; i++) {
        if (!familyMembers[i]?.name?.trim()) {
          setGeneratePassError(`Please enter the full name for Family Member #${i + 1}.`);
          return;
        }
      }
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
          familyCount: targetCount,
          familyMembers: targetCount > 0 ? familyMembers.slice(0, targetCount) : [],
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
        colors: ['#00f2fe', '#9d4edd', '#ff007f']
      });
    } catch (err: any) {
      setGeneratePassError(err.message);
    } finally {
      setGeneratingPass(false);
    }
  };

  // 4. Submit Manual Review Request (for lost email/phone)
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alumnus || !newEmail || !newPhone) return;

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

  // If pass was created / retrieved
  if (issuedPass) {
    const isPending = issuedPass.status === 'PENDING';
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
        <div style={{
          background: isPending ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
          border: `1px solid ${isPending ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
          padding: '20px',
          borderRadius: 'var(--radius-lg)',
          marginBottom: '24px'
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: isPending ? 'var(--status-pending)' : 'var(--status-approved)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px'
          }}>
            {isPending ? <ShieldCheck size={26} color="#fff" /> : <CheckCircle2 size={28} color="#fff" />}
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', marginBottom: 6 }}>
            {isPending ? 'Manual Contact Review Queued' : 'Graduate Pass Activated!'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: 480, margin: '0 auto' }}>
            {isPending 
              ? 'Your request for updated contact details has been routed to the organizing team. Once approved, your QR pass unlocks immediately.'
              : 'Your identity has been verified via OTP against the university database. Your digital pass is active below!'}
          </p>
        </div>

        <TicketCard attendee={issuedPass} />

        <div style={{ marginTop: 20 }}>
          <button
            onClick={() => {
              setIssuedPass(null);
              setAlumnus(null);
              setUsnInput('');
              setOtpSent(false);
            }}
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem' }}
          >
            Register Another Alumnus
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ padding: '32px', maxWidth: 680, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <div style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: 6, 
          padding: '4px 14px', 
          borderRadius: 999, 
          background: 'rgba(0, 242, 254, 0.1)',
          border: '1px solid rgba(0, 242, 254, 0.25)',
          color: 'var(--accent-cyan)',
          fontSize: '0.8rem',
          fontWeight: 700,
          marginBottom: 10
        }}>
          <GraduationCap size={15} />
          OFFICIAL GRADUATE & ALUMNI VERIFICATION
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 700, color: '#fff' }}>
          Claim Your Alumni Entry Pass
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
          To prevent unauthorized entries and protect graduate identities, passes are strictly bound to official University Seat Numbers (USN) with instant OTP confirmation.
        </p>
      </div>

      {/* STEP 1: USN Lookup Form */}
      <form onSubmit={handleLookupUsn} style={{ marginBottom: 20 }}>
        <div className="form-group">
          <label className="form-label">Step 1: Enter Your University Seat Number (USN / Roll No)</label>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="text"
              required
              placeholder="e.g. 1MS20CS042 or 1MS19EC115"
              className="form-input"
              style={{ textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 600 }}
              value={usnInput}
              onChange={e => setUsnInput(e.target.value)}
            />
            <button
              type="submit"
              disabled={lookingUp}
              className="btn btn-primary"
              style={{ whiteSpace: 'nowrap' }}
            >
              {lookingUp ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              Verify USN
            </button>
          </div>
        </div>
      </form>

      {/* Lookup Error Message */}
      {lookupError && (
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
          <span>{lookupError}</span>
        </div>
      )}

      {/* If Pass is ALREADY REGISTERED for this USN */}
      {alreadyRegistered && alumnus && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(0, 242, 254, 0.35)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          marginBottom: 24,
          animation: 'fadeIn 0.3s ease-in'
        }}>
          {/* Header banner */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
            paddingBottom: 16,
            borderBottom: '1px solid var(--border-subtle)',
            marginBottom: 16
          }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'rgba(0, 242, 254, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Lock size={24} color="var(--accent-cyan)" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: 'rgba(245, 158, 11, 0.15)',
                  color: 'var(--status-pending)',
                  border: '1px solid rgba(245, 158, 11, 0.3)'
                }}>
                  🔒 Pass Already Claimed & Locked
                </span>
                <span style={{
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: 'var(--accent-cyan)'
                }}>
                  {alumnus.usn}
                </span>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginTop: 4 }}>
                Pass Registered for {alumnus.fullName}
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {alumnus.department} · {alumnus.batchYear}
                {claimedSummary?.registeredAt && ` · Issued on ${new Date(claimedSummary.registeredAt).toLocaleDateString()}`}
              </p>
            </div>
          </div>

          {/* Security explanation message */}
          <div style={{
            background: 'rgba(0, 242, 254, 0.06)',
            border: '1px solid rgba(0, 242, 254, 0.2)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
            marginBottom: 20,
            fontSize: '0.85rem',
            lineHeight: 1.5,
            color: '#cbd5e1'
          }}>
            <strong style={{ color: '#fff' }}>🛡️ Anti-Impersonation Protection Active:</strong>
            <div style={{ marginTop: 4 }}>
              To prevent unauthorized ticket access by other members, this pass is securely locked.
              Verify ownership via an OTP sent strictly to the graduate's registered contact to view the QR pass.
            </div>
          </div>

          {/* Masked Contact Details */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
            marginBottom: 20,
          }}>
            <div style={{
              background: 'rgba(0, 242, 254, 0.05)',
              border: '1px solid rgba(0, 242, 254, 0.2)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Mail size={14} color="var(--accent-cyan)" />
                <span style={{ color: 'var(--text-sub)', fontSize: '0.78rem', fontWeight: 600 }}>Registered Email</span>
              </div>
              <span style={{ color: '#fff', fontFamily: 'monospace', fontSize: '0.95rem', fontWeight: 700 }}>
                {alumnus.maskedEmail || 'Not available'}
              </span>
            </div>
            <div style={{
              background: 'rgba(16, 185, 129, 0.05)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Phone size={14} color="#6ee7b7" />
                <span style={{ color: 'var(--text-sub)', fontSize: '0.78rem', fontWeight: 600 }}>Registered Mobile</span>
              </div>
              <span style={{ color: '#fff', fontFamily: 'monospace', fontSize: '0.95rem', fontWeight: 700 }}>
                {alumnus.maskedPhone || 'Not available'}
              </span>
            </div>
          </div>

          {claimedOtpError && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#fca5a5',
              fontSize: '0.85rem',
              marginBottom: 16
            }}>
              <AlertCircle size={16} />
              <span>{claimedOtpError}</span>
            </div>
          )}

          {/* STEP A: NOT SENT OTP YET */}
          {!claimedOtpSent && !showManualReview && (
            <div>
              <p style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 600, marginBottom: 10 }}>
                Select where to receive your 6-digit unlock code:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: alumnus.hasPhone ? '1fr 1fr' : '1fr', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => handleSendClaimedOtp('EMAIL')}
                  disabled={sendingClaimedOtp}
                  className="btn btn-primary"
                  style={{ fontSize: '0.85rem', padding: '12px' }}
                >
                  {sendingClaimedOtp ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                  Send Unlock OTP to Email
                </button>
                {alumnus.hasPhone && (
                  <button
                    type="button"
                    onClick={() => handleSendClaimedOtp('PHONE')}
                    disabled={sendingClaimedOtp}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.85rem', padding: '12px' }}
                  >
                    {sendingClaimedOtp ? <Loader2 size={16} className="animate-spin" /> : <Phone size={16} />}
                    Send Unlock OTP to Mobile
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, fontSize: '0.8rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setAlreadyRegistered(false);
                    setAlumnus(null);
                    setUsnInput('');
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  ← Enter a different USN
                </button>
                <button
                  type="button"
                  onClick={() => setShowManualReview(true)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Lost access to this email/phone? Request committee review
                </button>
              </div>
            </div>
          )}

          {/* STEP B: OTP SENT -> ENTER CODE */}
          {claimedOtpSent && !showManualReview && (
            <div>
              <form onSubmit={handleVerifyClaimedOtp}>
                <div className="form-group" style={{ textAlign: 'center' }}>
                  <label className="form-label">
                    Enter 6-Digit Verification Code sent to {claimedOtpTarget}
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
                    value={claimedOtpCode}
                    onChange={e => setClaimedOtpCode(e.target.value.replace(/\D/g, ''))}
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={verifyingClaimedOtp || claimedOtpCode.length < 6}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px' }}
                >
                  {verifyingClaimedOtp ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                  Verify OTP & Unlock My Pass
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: '0.8rem' }}>
                  <button
                    type="button"
                    onClick={() => handleSendClaimedOtp(claimedOtpChannel)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    Resend Code
                  </button>
                  <button
                    type="button"
                    onClick={() => setClaimedOtpSent(false)}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer' }}
                  >
                    Change Delivery Method
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAlreadyRegistered(false);
                      setAlumnus(null);
                      setUsnInput('');
                      setClaimedOtpSent(false);
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-sub)', cursor: 'pointer' }}
                  >
                    Enter different USN
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP C: MANUAL REVIEW FALLBACK */}
          {showManualReview && (
            <div style={{
              marginTop: 16,
              background: 'rgba(245, 158, 11, 0.05)',
              padding: '16px',
              borderRadius: 'var(--radius-sm)',
              border: '1px dashed rgba(245, 158, 11, 0.3)'
            }}>
              <h4 style={{ color: 'var(--status-pending)', fontSize: '1rem', fontWeight: 700, marginBottom: 4 }}>
                Request Committee Pass Recovery
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                If you no longer have access to your registered email or phone number, provide your updated contact info. The committee will verify and re-issue your entry pass.
              </p>

              {reviewError && (
                <div style={{ color: '#fca5a5', fontSize: '0.82rem', marginBottom: 10 }}>
                  {reviewError}
                </div>
              )}

              <form onSubmit={handleSubmitReview}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">New Active Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. current@gmail.com"
                      className="form-input"
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">New Active Phone *</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +91 99887 76655"
                      className="form-input"
                      value={newPhone}
                      onChange={e => setNewPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Reason / Explanation</label>
                  <input
                    type="text"
                    placeholder="e.g. Lost SIM card, college email inactive"
                    className="form-input"
                    value={reviewReason}
                    onChange={e => setReviewReason(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Degree / ID Proof (Optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProofUpload}
                    className="form-input"
                    style={{ padding: '8px' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <button
                    type="button"
                    onClick={() => setShowManualReview(false)}
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Back to OTP Unlock
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    {submittingReview ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                    Submit Recovery Request
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* VERIFIED GRADUATE CARD FOUND */}
      {alumnus && !alreadyRegistered && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-focus)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          marginBottom: 24,
          animation: 'fadeIn 0.3s ease-in'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase' }}>
                MATCHED OFFICIAL GRADUATE RECORD
              </span>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', marginTop: 2 }}>
                {alumnus.fullName}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {alumnus.department} · <span style={{ color: '#fff' }}>{alumnus.batchYear}</span>
              </p>
            </div>
            <span style={{
              fontFamily: 'monospace',
              fontSize: '1rem',
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: 6,
              background: 'rgba(0, 242, 254, 0.1)',
              color: 'var(--accent-cyan)',
              border: '1px solid rgba(0, 242, 254, 0.3)'
            }}>
              {alumnus.usn}
            </span>
          </div>

          {/* PROMINENT REGISTERED CONTACT DETAILS (MASKED & SECURE) */}
          <div style={{
            marginTop: 18,
            padding: '16px',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
              paddingBottom: 8,
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                <ShieldCheck size={15} color="var(--accent-cyan)" />
                Directory Contact Info for Verification
              </span>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                Protected by Masking
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 12
            }}>
              {/* Card 1: Official Email */}
              <div style={{
                background: alumnus.hasEmail ? 'rgba(0, 242, 254, 0.04)' : 'rgba(245, 158, 11, 0.04)',
                border: `1px solid ${alumnus.hasEmail ? 'rgba(0, 242, 254, 0.22)' : 'rgba(245, 158, 11, 0.28)'}`,
                borderRadius: 'var(--radius-sm)',
                padding: '14px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Mail size={16} color="var(--accent-cyan)" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0' }}>Official Email</span>
                  </div>
                  {alumnus.hasEmail ? (
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: 'var(--status-approved)',
                      border: '1px solid rgba(16, 185, 129, 0.3)'
                    }}>
                      ✓ On File
                    </span>
                  ) : (
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: 'var(--status-pending)',
                      border: '1px solid rgba(245, 158, 11, 0.3)'
                    }}>
                      ⚠️ Not on File
                    </span>
                  )}
                </div>

                {alumnus.hasEmail ? (
                  <div>
                    <div style={{
                      fontFamily: 'monospace',
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      color: 'var(--accent-cyan)',
                      padding: '4px 0',
                      letterSpacing: '0.04em',
                      wordBreak: 'break-all'
                    }}>
                      {alumnus.maskedEmail}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      Masked for privacy · OTP sends here
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{
                      fontSize: '0.88rem',
                      color: 'var(--text-sub)',
                      fontStyle: 'italic',
                      padding: '4px 0'
                    }}>
                      Not recorded in university archives
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--status-pending)', marginTop: 2 }}>
                      Requires committee ID verification
                    </div>
                  </div>
                )}
              </div>

              {/* Card 2: Official Mobile */}
              <div style={{
                background: alumnus.hasPhone ? 'rgba(16, 185, 129, 0.04)' : 'rgba(245, 158, 11, 0.04)',
                border: `1px solid ${alumnus.hasPhone ? 'rgba(16, 185, 129, 0.22)' : 'rgba(245, 158, 11, 0.28)'}`,
                borderRadius: 'var(--radius-sm)',
                padding: '14px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Phone size={16} color="#6ee7b7" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0' }}>Official Mobile</span>
                  </div>
                  {alumnus.hasPhone ? (
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: 'var(--status-approved)',
                      border: '1px solid rgba(16, 185, 129, 0.3)'
                    }}>
                      ✓ On File
                    </span>
                  ) : (
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: 'var(--status-pending)',
                      border: '1px solid rgba(245, 158, 11, 0.3)'
                    }}>
                      ⚠️ Not on File
                    </span>
                  )}
                </div>

                {alumnus.hasPhone ? (
                  <div>
                    <div style={{
                      fontFamily: 'monospace',
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      color: '#6ee7b7',
                      padding: '4px 0',
                      letterSpacing: '0.04em'
                    }}>
                      {alumnus.maskedPhone}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      Masked for privacy · OTP sends here
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{
                      fontSize: '0.88rem',
                      color: 'var(--text-sub)',
                      fontStyle: 'italic',
                      padding: '4px 0'
                    }}>
                      Not recorded in university archives
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--status-pending)', marginTop: 2 }}>
                      Requires committee ID verification
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CASE A: NEITHER EMAIL NOR PHONE ON FILE -> STRICT ANTI-FORGERY LOCK */}
          {!alumnus.hasEmail && !alumnus.hasPhone && !showManualReview && (
            <div style={{
              marginTop: 22,
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              borderRadius: 'var(--radius-md)',
              padding: '22px',
              textAlign: 'center'
            }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(245, 158, 11, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px'
              }}>
                <ShieldCheck size={26} color="var(--status-pending)" />
              </div>
              <h4 style={{ color: '#fff', fontSize: '1.15rem', fontWeight: 800, marginBottom: 8 }}>
                Anti-Forgery Protection: Manual Approval Required
              </h4>
              <p style={{ color: '#cbd5e1', fontSize: '0.88rem', maxWidth: 500, margin: '0 auto 18px', lineHeight: 1.5 }}>
                No contact information (email or mobile) was recorded in the college database for USN <strong style={{ color: 'var(--accent-cyan)' }}>{alumnus.usn}</strong>.
                To prevent unauthorized ticket claims and protect graduate identities, automatic OTP generation is disabled for this record.
              </p>
              <button
                type="button"
                onClick={() => setShowManualReview(true)}
                className="btn btn-primary"
                style={{
                  padding: '12px 24px',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: '#000',
                  boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)'
                }}
              >
                <ShieldCheck size={18} />
                Request Committee Manual Approval (ID / Degree Proof)
              </button>
            </div>
          )}

          {/* CASE B: AT LEAST ONE CONTACT ON FILE -> STEP 2A OTP DISPATCH */}
          {(alumnus.hasEmail || alumnus.hasPhone) && !otpSent && !isOtpVerified && !showManualReview && (
            <div style={{ marginTop: 22 }}>
              <p style={{ fontSize: '0.88rem', color: '#e2e8f0', fontWeight: 700, marginBottom: 12 }}>
                Step 2: Choose where to receive your 6-digit confirmation OTP:
              </p>

              {/* Prominent Error Banner in Step 2A */}
              {otpError && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  color: '#fca5a5',
                  fontSize: '0.88rem',
                  marginBottom: 16,
                  animation: 'fadeIn 0.25s ease-in'
                }}>
                  <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 700, color: '#fff', marginBottom: 2 }}>Unable to Send Verification Code</div>
                    <div>{otpError}</div>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                {/* Email OTP Button */}
                <button
                  type="button"
                  onClick={() => handleSendOtp('EMAIL')}
                  disabled={sendingOtp || !alumnus.hasEmail}
                  className="btn btn-primary"
                  style={{
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    height: 'auto',
                    minHeight: '68px',
                    cursor: (!alumnus.hasEmail || sendingOtp) ? 'not-allowed' : 'pointer',
                    opacity: !alumnus.hasEmail ? 0.4 : (sendingOtp && sendingChannel !== 'EMAIL' ? 0.6 : 1),
                  }}
                >
                  {sendingOtp && sendingChannel === 'EMAIL' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Loader2 size={18} className="animate-spin" />
                      <span style={{ fontWeight: 700 }}>Dispatching Code to Email...</span>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.95rem' }}>
                        <Mail size={18} />
                        <span>Send OTP to Email</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', opacity: 0.85, fontFamily: 'monospace' }}>
                        {alumnus.hasEmail ? alumnus.maskedEmail : 'Email Not on Record'}
                      </span>
                    </>
                  )}
                </button>

                {/* Mobile OTP Button */}
                <button
                  type="button"
                  onClick={() => handleSendOtp('PHONE')}
                  disabled={sendingOtp || !alumnus.hasPhone}
                  className="btn btn-secondary"
                  style={{
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    height: 'auto',
                    minHeight: '68px',
                    cursor: (!alumnus.hasPhone || sendingOtp) ? 'not-allowed' : 'pointer',
                    opacity: !alumnus.hasPhone ? 0.4 : (sendingOtp && sendingChannel !== 'PHONE' ? 0.6 : 1),
                  }}
                >
                  {sendingOtp && sendingChannel === 'PHONE' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Loader2 size={18} className="animate-spin" />
                      <span style={{ fontWeight: 700 }}>Dispatching Code to Mobile...</span>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.95rem' }}>
                        <Phone size={18} />
                        <span>Send OTP to Mobile</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', opacity: 0.85, fontFamily: 'monospace' }}>
                        {alumnus.hasPhone ? alumnus.maskedPhone : 'Mobile Not on Record'}
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* Status Note while sending */}
              {sendingOtp && (
                <div style={{
                  textAlign: 'center',
                  marginTop: 12,
                  fontSize: '0.82rem',
                  color: 'var(--accent-cyan)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '8px',
                  background: 'rgba(0, 242, 254, 0.05)',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Connecting to secure notification server, please wait a moment...</span>
                </div>
              )}

              {/* FALLBACK LINK */}
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <button
                  type="button"
                  onClick={() => setShowManualReview(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-cyan)',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Lost access to this email or phone number? Request manual approval
                </button>
              </div>
            </div>
          )}

          {/* STEP 2B: ENTER OTP */}
          {otpSent && !isOtpVerified && !showManualReview && (
            <div style={{ marginTop: 20 }}>
              <form onSubmit={handleVerifyOtp}>
                <div className="form-group">
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

                {otpError && (
                  <div style={{ color: '#fca5a5', fontSize: '0.85rem', marginBottom: 12 }}>
                    {otpError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={verifyingOtp || otpCode.length < 6}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px' }}
                >
                  {verifyingOtp ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                  Verify OTP & Continue to Family Pass
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
                    onClick={() => setShowManualReview(true)}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer' }}
                  >
                    Don't have this phone/email anymore?
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 3: ACCORDING FAMILY MEMBERS (MAX 4) */}
          {isOtpVerified && !showManualReview && (
            <div style={{ marginTop: 22, animation: 'fadeIn 0.3s ease-in' }}>
              <div style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 20
              }}>
                <CheckCircle2 size={20} color="var(--status-approved)" />
                <span style={{ fontSize: '0.88rem', color: '#6ee7b7', fontWeight: 600 }}>
                  OTP Verified Successfully for {alumnus.fullName}!
                </span>
              </div>

              <div style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Users size={18} color="var(--accent-cyan)" />
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                    Step 3: Accompanying Family Members (Max 4 Guests)
                  </h4>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Are you bringing family members with you to the festival? You can add up to 4 accompanying members under your graduate pass.
                </p>
              </div>

              <form onSubmit={e => handleGenerateFinalPass(e)}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 700 }}>
                    Select Number of Family Members to Bring:
                  </label>
                  <select
                    className="form-select"
                    value={familyCount}
                    onChange={e => handleFamilyCountChange(Number(e.target.value))}
                    style={{ fontSize: '0.95rem', padding: '10px 14px', background: 'rgba(0,0,0,0.4)' }}
                  >
                    <option value={0}>0 — Just Myself (1 Pass Total)</option>
                    <option value={1}>1 — +1 Family Member (2 Passes Total)</option>
                    <option value={2}>2 — +2 Family Members (3 Passes Total)</option>
                    <option value={3}>3 — +3 Family Members (4 Passes Total)</option>
                    <option value={4}>4 — +4 Family Members (5 Passes Total)</option>
                  </select>
                </div>

                {/* DYNAMIC FAMILY MEMBER DETAIL INPUTS */}
                {familyCount > 0 && (
                  <div style={{
                    marginTop: 16,
                    marginBottom: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14
                  }}>
                    {Array.from({ length: familyCount }).map((_, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '16px'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          marginBottom: 12,
                          color: 'var(--accent-cyan)',
                          fontSize: '0.85rem',
                          fontWeight: 700
                        }}>
                          <UserPlus size={15} />
                          <span>Family Member #{idx + 1}</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr', gap: 10 }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: '0.78rem' }}>Full Name *</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Priya Sharma"
                              className="form-input"
                              style={{ padding: '8px 12px', fontSize: '0.9rem' }}
                              value={familyMembers[idx]?.name || ''}
                              onChange={e => handleMemberChange(idx, 'name', e.target.value)}
                            />
                          </div>

                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: '0.78rem' }}>Relationship *</label>
                            <select
                              className="form-select"
                              style={{ padding: '8px 12px', fontSize: '0.9rem' }}
                              value={familyMembers[idx]?.relation || 'Spouse'}
                              onChange={e => handleMemberChange(idx, 'relation', e.target.value)}
                            >
                              <option value="Spouse">Spouse</option>
                              <option value="Parent">Parent</option>
                              <option value="Child">Child</option>
                              <option value="Sibling">Sibling</option>
                              <option value="Family Guest">Family Guest</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* QUOTA SUMMARY & GATE INSTRUCTION BOX */}
                <div style={{
                  background: 'rgba(0, 242, 254, 0.05)',
                  border: '1px solid rgba(0, 242, 254, 0.2)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 16px',
                  marginBottom: 20,
                  fontSize: '0.85rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-sub)' }}>Total Entry Quota:</span>
                    <strong style={{ color: '#fff', fontSize: '0.95rem' }}>
                      {1 + familyCount} Admission{familyCount > 0 ? 's' : ''} (1 Alumnus {familyCount > 0 ? `+ ${familyCount} Family` : ''})
                    </strong>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 6, lineHeight: 1.4 }}>
                    💡 <strong>Flexible Gate Check-in:</strong> A unique pass with a multi-admission quota will be generated. If members of your group arrive separately (e.g. 2 arrive early, 2 arrive late), gate volunteers can admit present members and keep the remaining quota active.
                  </p>
                </div>

                {generatePassError && (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 14px',
                    color: '#fca5a5',
                    fontSize: '0.85rem',
                    marginBottom: 16
                  }}>
                    {generatePassError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={generatingPass}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 700 }}
                >
                  {generatingPass ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Sparkles size={18} />
                  )}
                  Generate Official QR Pass ({1 + familyCount} Attendee{familyCount > 0 ? 's' : ''})
                </button>

                {familyCount > 0 && (
                  <div style={{ textAlign: 'center', marginTop: 12 }}>
                    <button
                      type="button"
                      onClick={() => {
                        handleFamilyCountChange(0);
                        handleGenerateFinalPass(undefined, 0);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                    >
                      Or skip family and generate solo pass (1 person)
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* STEP 2C: MANUAL REVIEW FALLBACK (Lost access) */}
          {showManualReview && (
            <div style={{
              marginTop: 20,
              paddingTop: 20,
              borderTop: '1px dashed var(--border-subtle)',
              background: 'rgba(245, 158, 11, 0.05)',
              padding: '16px',
              borderRadius: 'var(--radius-sm)'
            }}>
              <h4 style={{ color: 'var(--status-pending)', fontSize: '1rem', fontWeight: 700, marginBottom: 4 }}>
                Request Manual Contact Verification
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                Since you no longer have access to your graduate records contact info, supply your updated details. The alumni organizing committee will review and approve your entry pass manually.
              </p>

              {reviewError && (
                <div style={{ color: '#fca5a5', fontSize: '0.82rem', marginBottom: 10 }}>
                  {reviewError}
                </div>
              )}

              <form onSubmit={handleSubmitReview}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">New Active Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. current@gmail.com"
                      className="form-input"
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">New Active Phone *</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +91 99887 76655"
                      className="form-input"
                      value={newPhone}
                      onChange={e => setNewPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Reason / Explanation</label>
                  <input
                    type="text"
                    placeholder="e.g. Changed number in 2023, college mail expired"
                    className="form-input"
                    value={reviewReason}
                    onChange={e => setReviewReason(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Optional Proof (Degree / Marksheet / Govt ID snapshot)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProofUpload}
                    className="form-input"
                    style={{ padding: '8px' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <button
                    type="button"
                    onClick={() => setShowManualReview(false)}
                    className="btn btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Back to OTP
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    {submittingReview ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                    Submit for Committee Review
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
