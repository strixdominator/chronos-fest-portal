'use client';

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Attendee, EventSettings } from '@/lib/types';
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Download, 
  Mail, 
  Loader2, 
  ShieldCheck, 
  Users
} from 'lucide-react';

interface TicketCardProps {
  attendee: Attendee;
  settings?: EventSettings;
}

export default function TicketCard({ attendee, settings }: TicketCardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [liveClock, setLiveClock] = useState<string>('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const autoEmailTriggeredRef = useRef(false);

  // Automatically deliver pass to alumnus email upon approval
  useEffect(() => {
    if (attendee.status === 'APPROVED' && attendee.id && attendee.email && !autoEmailTriggeredRef.current) {
      autoEmailTriggeredRef.current = true;
      fetch('/api/alumni/send-pass-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendeeId: attendee.id,
          email: attendee.email,
        }),
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setEmailSuccess(`Pass automatically delivered with QR code to ${data.targetEmail || attendee.email}`);
        }
      })
      .catch(err => {
        console.error('Auto email dispatch notification:', err);
      });
    }
  }, [attendee.status, attendee.id, attendee.email]);

  // Live anti-screenshot moving security clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLiveClock(now.toLocaleTimeString() + ' · ' + now.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Generate QR code when approved
  useEffect(() => {
    if (attendee.status === 'APPROVED' && canvasRef.current) {
      const qrPayload = typeof window !== 'undefined' 
        ? `${window.location.origin}/ticket/${attendee.id}` 
        : attendee.ticketCode;

      QRCode.toCanvas(
        canvasRef.current,
        qrPayload,
        {
          width: 220,
          margin: 1,
          color: {
            dark: '#0a0a0a',
            light: '#ffffff',
          },
          errorCorrectionLevel: 'H',
        },
        (error) => {
          if (error) console.error('QR code generation error:', error);
        }
      );
    }
  }, [attendee]);

  // Mandatory high-resolution digital pass download
  const handleDownloadPass = () => {
    if (!canvasRef.current) return;
    try {
      const qrCanvas = canvasRef.current;
      const width = 640;
      const height = 940;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No 2d context');

      // Card Background
      ctx.fillStyle = '#0A192F';
      ctx.fillRect(0, 0, width, height);

      // Gold Outer Border
      ctx.strokeStyle = '#F5B82E';
      ctx.lineWidth = 6;
      ctx.strokeRect(14, 14, width - 28, height - 28);

      // Header Box
      ctx.fillStyle = '#07152B';
      ctx.fillRect(20, 20, width - 40, 140);
      ctx.strokeStyle = '#1E3A8A';
      ctx.lineWidth = 2;
      ctx.strokeRect(20, 20, width - 40, 140);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('MILAN 2026', width / 2, 75);

      ctx.fillStyle = '#93C5FD';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('DON BOSCO INSTITUTE OF TECHNOLOGY', width / 2, 106);

      ctx.fillStyle = '#F5B82E';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('OFFICIAL ALUMNI DIGITAL ENTRY PASS', width / 2, 134);

      // Attendee Info Box
      ctx.fillStyle = '#112240';
      ctx.fillRect(40, 185, width - 80, 135);
      ctx.strokeStyle = '#1E3A8A';
      ctx.strokeRect(40, 185, width - 80, 135);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(attendee.fullName.toUpperCase(), width / 2, 230);

      ctx.fillStyle = '#F5B82E';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(`USN: ${attendee.usn || attendee.rollNumber}`, width / 2, 266);

      ctx.fillStyle = '#CBD5E1';
      ctx.font = '15px sans-serif';
      ctx.fillText(`${attendee.department || 'Engineering'} · ${attendee.year || 'Alumni'}`, width / 2, 298);

      // QR Box
      const qrBoxSize = 300;
      const qrX = (width - qrBoxSize) / 2;
      const qrY = 345;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(qrX, qrY, qrBoxSize, qrBoxSize);
      ctx.strokeStyle = '#F5B82E';
      ctx.lineWidth = 4;
      ctx.strokeRect(qrX, qrY, qrBoxSize, qrBoxSize);

      ctx.drawImage(qrCanvas, qrX + 15, qrY + 15, qrBoxSize - 30, qrBoxSize - 30);

      // Security Details
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(`CODE: ${attendee.ticketCode}`, width / 2, 680);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '12px monospace';
      ctx.fillText('PRESENT AT SECURITY GATE FOR WRISTBAND', width / 2, 706);

      // Event Info Box
      ctx.fillStyle = '#1E3A8A';
      ctx.fillRect(40, 735, width - 80, 85);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 17px sans-serif';
      ctx.fillText('📅 7 NOVEMBER 2026 · ⏰ 3:00 PM', width / 2, 770);
      ctx.fillStyle = '#FCD34D';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('📍 DBIT CRICKET GROUND, BANGALORE', width / 2, 800);

      // Footer
      ctx.fillStyle = '#64748B';
      ctx.font = '11px monospace';
      ctx.fillText('DBIT ALUMNI ASSOCIATION · RECONNECTING RELATIONS', width / 2, 865);
      ctx.fillText('ONE IDENTITY · ONE VERIFIED PASS · NON-TRANSFERABLE', width / 2, 890);

      const link = document.createElement('a');
      link.download = `MILAN2026_Pass_${attendee.usn || attendee.rollNumber}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      if (canvasRef.current) {
        const link = document.createElement('a');
        link.download = `MILAN2026_Pass_${attendee.usn || attendee.rollNumber}.png`;
        link.href = canvasRef.current.toDataURL('image/png');
        link.click();
      }
    }
  };

  // Deliver pass to alumnus email
  const handleDeliverEmail = async () => {
    if (!attendee.id) return;
    setSendingEmail(true);
    setEmailSuccess(null);
    setEmailError(null);

    try {
      let qrDataUrl = '';
      if (canvasRef.current) {
        qrDataUrl = canvasRef.current.toDataURL('image/png');
      }

      const res = await fetch('/api/alumni/send-pass-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendeeId: attendee.id,
          email: attendee.email,
          qrDataUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch pass to email.');
      }

      setEmailSuccess(`Official pass with QR code delivered to ${data.targetEmail || attendee.email}!`);
    } catch (err: any) {
      setEmailError(err.message || 'Delivery failed. Please try again.');
    } finally {
      setSendingEmail(false);
    }
  };

  const isApproved = attendee.status === 'APPROVED';
  const isPending = attendee.status === 'PENDING';
  const isRejected = attendee.status === 'REJECTED';

  const totalQuota = attendee.totalQuota || (1 + (attendee.familyCount || 0));
  const admittedCount = attendee.admittedCount ?? (attendee.checkedIn ? totalQuota : 0);
  const remaining = Math.max(0, totalQuota - admittedCount);
  const isPartiallyCheckedIn = admittedCount > 0 && remaining > 0;
  const isFullyCheckedIn = attendee.checkedIn || (totalQuota > 0 && remaining === 0);

  return (
    <div className="ticket-wrapper-neo">
      <div className="ticket-neo">
        {/* Top Header */}
        <div className="ticket-neo-header">
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.25rem', letterSpacing: '-0.03em' }}>
              MILAN <span style={{ color: 'var(--accent-coral)' }}>2026</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: '#a3a3a3', letterSpacing: '0.08em', marginTop: 2 }}>
              OFFICIAL ALUMNI ENTRY PASS
            </div>
          </div>

          <div>
            {isApproved && !isFullyCheckedIn && !isPartiallyCheckedIn && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 800, background: 'var(--accent-sage)', color: '#064e3b', padding: '4px 8px', border: '1px solid #fff' }}>
                VERIFIED ({totalQuota} {totalQuota > 1 ? 'PASSES' : 'PASS'})
              </span>
            )}
            {isApproved && isPartiallyCheckedIn && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 800, background: 'var(--accent-ochre)', color: '#78350f', padding: '4px 8px', border: '1px solid #fff' }}>
                {admittedCount}/{totalQuota} ADMITTED
              </span>
            )}
            {isApproved && isFullyCheckedIn && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 800, background: '#fee2e2', color: '#991b1b', padding: '4px 8px', border: '1px solid #fff' }}>
                EXHAUSTED ({totalQuota}/{totalQuota})
              </span>
            )}
            {isPending && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 800, background: 'var(--accent-ochre)', color: '#78350f', padding: '4px 8px', border: '1px solid #fff' }}>
                PENDING REVIEW
              </span>
            )}
            {isRejected && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 800, background: '#fee2e2', color: '#991b1b', padding: '4px 8px', border: '1px solid #fff' }}>
                DENIED
              </span>
            )}
          </div>
        </div>

        {/* Live Anti-Counterfeit Banner */}
        <div style={{
          background: 'var(--bg-card-alt)',
          borderBottom: '1px solid var(--border-black)',
          padding: '8px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.68rem',
          fontWeight: 700,
          color: 'var(--text-secondary)'
        }}>
          <span>LIVE SECURITY STAMP</span>
          <span style={{ color: 'var(--accent-coral)' }}>{liveClock}</span>
        </div>

        {/* Primary Details Grid */}
        <div style={{ padding: '24px 24px 16px', background: '#fff' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <div className="mono-label" style={{ fontSize: '0.68rem', marginBottom: 2 }}>ALUMNUS NAME</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 900 }}>
                {attendee.fullName}
              </div>
            </div>
            <div>
              <div className="mono-label" style={{ fontSize: '0.68rem', marginBottom: 2 }}>SEAT NUMBER (USN)</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-coral)' }}>
                {attendee.rollNumber}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, paddingBottom: 14, borderBottom: '1px solid var(--border-color)' }}>
            <div>
              <div className="mono-label" style={{ fontSize: '0.68rem', marginBottom: 2 }}>DEPARTMENT & BATCH</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 700 }}>
                {attendee.department || 'Graduate'} {attendee.batchYear ? `• ${attendee.batchYear}` : ''}
              </div>
            </div>
            <div>
              <div className="mono-label" style={{ fontSize: '0.68rem', marginBottom: 2 }}>TICKET CODE</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 800 }}>
                {attendee.ticketCode}
              </div>
            </div>
          </div>

          {/* Event Venue, Date & Time Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16, marginTop: 14, paddingBottom: 14, borderBottom: '1px solid var(--border-color)' }}>
            <div>
              <div className="mono-label" style={{ fontSize: '0.68rem', marginBottom: 2 }}>EVENT VENUE</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-navy)' }}>
                DBIT CRICKET GROUND, BANGALORE
              </div>
            </div>
            <div>
              <div className="mono-label" style={{ fontSize: '0.68rem', marginBottom: 2 }}>DATE & GATES OPEN</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-blue)' }}>
                7 NOV 2026 · 3:00 PM
              </div>
            </div>
          </div>

          {/* Professional Affiliation */}
          {(attendee.organization || attendee.designation) && (
            <div style={{ marginTop: 14, padding: '10px 14px', background: '#F8FAFC', border: '1px solid var(--border-color)', borderRadius: 6 }}>
              <div className="mono-label" style={{ fontSize: '0.64rem', marginBottom: 2, color: 'var(--color-blue)' }}>PROFESSIONAL AFFILIATION</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-navy)' }}>
                {attendee.organization || ''}{attendee.organization && attendee.designation ? ' · ' : ''}{attendee.designation || ''}
              </div>
            </div>
          )}

          {/* Group Quota Strip if > 1 */}
          {totalQuota > 1 && (
            <div style={{
              margin: '16px 0',
              padding: '12px 14px',
              background: 'var(--accent-lilac)',
              border: '1px solid var(--border-black)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span className="mono-label" style={{ color: '#0a0a0a', fontSize: '0.68rem' }}>GROUP ADMISSION</span>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 800 }}>
                  {totalQuota} PERSONS TOTAL
                </div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 800 }}>
                {admittedCount > 0 ? `${remaining} REMAINING` : 'ALL UNCLAIMED'}
              </span>
            </div>
          )}

          {/* Registered Family Members */}
          {attendee.familyMembers && attendee.familyMembers.length > 0 && (
            <div style={{ margin: '14px 0 16px' }}>
              <div className="mono-label" style={{ fontSize: '0.68rem', marginBottom: 8 }}>
                ACCOMPANYING GUESTS ({attendee.familyMembers.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {attendee.familyMembers.map((member, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: '#faf8f3',
                    border: '1px solid var(--border-black)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.78rem',
                    fontWeight: 700
                  }}>
                    <span>{member.name}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{member.relation}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Perforated Tear Line */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-page)',
          padding: '8px 0',
          borderTop: '1px dashed var(--border-black)',
          borderBottom: '1px dashed var(--border-black)',
        }}>
          <div style={{ width: 14, height: 28, background: 'var(--bg-page)', borderRight: '1px solid var(--border-black)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.15em', color: 'var(--text-secondary)' }}>
            TEAR LINE • OFFICIAL GATE SCAN AREA
          </span>
          <div style={{ width: 14, height: 28, background: 'var(--bg-page)', borderLeft: '1px solid var(--border-black)' }} />
        </div>

        {/* QR Code Scan Area */}
        <div style={{ padding: '24px', background: '#fff', textAlign: 'center' }}>
          {isApproved ? (
            <div>
              <div style={{
                display: 'inline-block',
                padding: '12px',
                background: '#fff',
                border: '1px solid var(--border-black)',
                marginBottom: 12
              }}>
                <canvas ref={canvasRef} style={{ display: 'block', maxWidth: '100%', height: 'auto' }} />
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                SCAN AT SECURITY GATE FOR ADMISSION
              </div>
            </div>
          ) : isPending ? (
            <div style={{ padding: '32px 16px', background: 'var(--accent-ochre)', border: '1px solid var(--border-black)' }}>
              <Clock size={32} style={{ margin: '0 auto 12px', color: '#78350f' }} />
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800 }}>
                APPROVAL PENDING
              </div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: '#78350f', marginTop: 4 }}>
                QR pass will unlock once the committee validates your submitted details.
              </p>
            </div>
          ) : (
            <div style={{ padding: '32px 16px', background: '#fee2e2', border: '1px solid var(--border-black)' }}>
              <XCircle size={32} style={{ margin: '0 auto 12px', color: '#991b1b' }} />
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800 }}>
                REGISTRATION DENIED
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          borderTop: '1px solid var(--border-black)',
          background: 'var(--bg-card-alt)'
        }} className="no-print">
          <button
            type="button"
            onClick={handleDownloadPass}
            disabled={!isApproved}
            className="btn-neo-black"
            style={{ 
              border: 'none', 
              borderRight: '1px solid var(--border-black)', 
              padding: '16px 12px',
              background: 'var(--color-navy, #0A192F)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontFamily: 'var(--font-mono)',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: isApproved ? 'pointer' : 'not-allowed',
            }}
          >
            <Download size={16} />
            SAVE AS IMAGE (PNG) ↗
          </button>
          <button
            type="button"
            onClick={handleDeliverEmail}
            disabled={!isApproved || sendingEmail}
            className="btn-neo-outline"
            style={{ 
              border: 'none', 
              padding: '16px 12px',
              background: '#FFFFFF',
              color: 'var(--color-navy, #0A192F)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontFamily: 'var(--font-mono)',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: isApproved && !sendingEmail ? 'pointer' : 'not-allowed',
            }}
          >
            {sendingEmail ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                SENDING...
              </>
            ) : (
              <>
                <Mail size={16} />
                {emailSuccess ? 'RESEND TO EMAIL ↗' : 'DELIVER TO EMAIL ↗'}
              </>
            )}
          </button>
        </div>

        {/* Email delivery feedback */}
        {emailSuccess && (
          <div style={{ 
            padding: '12px 16px', 
            background: '#ECFDF5', 
            borderTop: '1px solid #A7F3D0', 
            color: '#065F46', 
            fontFamily: 'var(--font-mono)', 
            fontSize: '0.8rem', 
            fontWeight: 700, 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8 
          }}>
            <CheckCircle2 size={16} color="#059669" />
            {emailSuccess}
          </div>
        )}
        {emailError && (
          <div style={{ 
            padding: '12px 16px', 
            background: '#FEF2F2', 
            borderTop: '1px solid #FECACA', 
            color: '#991B1B', 
            fontFamily: 'var(--font-mono)', 
            fontSize: '0.8rem', 
            fontWeight: 700 
          }}>
            {emailError}
          </div>
        )}
      </div>
    </div>
  );
}
