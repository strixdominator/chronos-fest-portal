'use client';

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Attendee, EventSettings } from '@/lib/types';
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Download, 
  Printer, 
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

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleDownloadImage = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `ChronosFest_Ticket_${attendee.rollNumber}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, paddingBottom: 16, borderBottom: '1px solid var(--border-subtle)' }}>
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
            onClick={handleDownloadImage}
            disabled={!isApproved}
            className="btn-neo-outline"
            style={{ border: 'none', borderRight: '1px solid var(--border-black)', padding: '14px' }}
          >
            <Download size={15} />
            DOWNLOAD ↗
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="btn-neo-black"
            style={{ border: 'none', padding: '14px' }}
          >
            <Printer size={15} />
            PRINT / PDF ↗
          </button>
        </div>
      </div>
    </div>
  );
}
