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
  Calendar, 
  MapPin, 
  Sparkles,
  AlertTriangle,
  Users,
  UserCheck
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
      setLiveClock(now.toLocaleTimeString() + ' · ' + now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Generate QR code when approved
  useEffect(() => {
    if (attendee.status === 'APPROVED' && canvasRef.current) {
      // The QR code can store the ticket code or full verification URL
      const qrPayload = typeof window !== 'undefined' 
        ? `${window.location.origin}/ticket/${attendee.id}` 
        : attendee.ticketCode;

      QRCode.toCanvas(
        canvasRef.current,
        qrPayload,
        {
          width: 200,
          margin: 1,
          color: {
            dark: '#07090e',
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
    <div className="ticket-wrapper">
      <div className="ticket-card">
        {/* Holographic Header Banner */}
        <div className="ticket-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={16} color="var(--accent-cyan)" />
                <span style={{ 
                  fontFamily: 'var(--font-display)', 
                  fontWeight: 800, 
                  fontSize: '1.25rem',
                  letterSpacing: '-0.02em',
                  color: '#fff'
                }}>
                  {settings?.eventName || "CHRONOS FEST 2026"}
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Official University Entry Pass
              </p>
            </div>

            {/* Status Pill */}
            {isApproved && !isFullyCheckedIn && !isPartiallyCheckedIn && (
              <span className="badge badge-approved">
                <span className="live-pulse" />
                VERIFIED PASS ({totalQuota} {totalQuota > 1 ? 'PASSES' : 'PASS'})
              </span>
            )}
            {isApproved && isPartiallyCheckedIn && (
              <span className="badge badge-approved" style={{ background: 'rgba(0, 242, 254, 0.15)', color: 'var(--accent-cyan)' }}>
                <UserCheck size={13} />
                {admittedCount}/{totalQuota} ADMITTED
              </span>
            )}
            {isApproved && isFullyCheckedIn && (
              <span className="badge badge-checkedin">
                <CheckCircle2 size={13} />
                ALL {totalQuota} ADMITTED
              </span>
            )}
            {isPending && (
              <span className="badge badge-pending">
                <Clock size={13} />
                PENDING APPROVAL
              </span>
            )}
            {isRejected && (
              <span className="badge badge-rejected">
                <XCircle size={13} />
                REGISTRATION DENIED
              </span>
            )}
          </div>

          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: 12, 
            fontSize: '0.8rem', 
            color: 'var(--text-muted)',
            marginTop: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Calendar size={13} color="var(--accent-cyan)" />
              <span>{settings?.eventDate || "Oct 24, 2026"}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <MapPin size={13} color="var(--accent-cyan)" />
              <span>{settings?.eventVenue || "Grand Arena"}</span>
            </div>
          </div>

          <div className="ticket-notch-left" />
          <div className="ticket-notch-right" />
        </div>

        {/* Ticket Body */}
        <div className="ticket-body">
          {/* Group pass banner if > 1 members */}
          {totalQuota > 1 && (
            <div style={{
              background: 'rgba(0, 242, 254, 0.08)',
              border: '1px solid rgba(0, 242, 254, 0.25)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
              marginBottom: 16,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.82rem'
            }}>
              <span style={{ color: 'var(--accent-cyan)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Users size={16} /> GROUP ADMISSION ({totalQuota} TOTAL)
              </span>
              <span style={{ color: remaining > 0 ? '#6ee7b7' : 'var(--text-muted)', fontWeight: 700 }}>
                {admittedCount > 0 ? `${admittedCount} Checked In · ${remaining} Remaining` : `All ${totalQuota} Valid at Gate`}
              </span>
            </div>
          )}

          {/* Attendee Info Card */}
          <div style={{ 
            background: 'rgba(255,255,255,0.03)', 
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            marginBottom: '20px',
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                  ATTENDEE NAME
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginTop: 2 }}>
                  {attendee.fullName}
                </h3>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                  COLLEGE ROLL NO
                </span>
                <div style={{ 
                  fontFamily: 'monospace', 
                  fontSize: '1rem', 
                  fontWeight: 700, 
                  color: 'var(--accent-cyan)',
                  marginTop: 2
                }}>
                  {attendee.rollNumber}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-sub)' }}>DEPARTMENT</span>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  {attendee.department}
                </p>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-sub)' }}>YEAR & PASS ID</span>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  {attendee.year} · <span style={{ color: '#fff', fontFamily: 'monospace' }}>{attendee.id}</span>
                </p>
              </div>
            </div>

            {/* Accompanying Family Members List */}
            {attendee.familyMembers && attendee.familyMembers.length > 0 && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-sub)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                  ACCOMPANYING FAMILY GUESTS ({attendee.familyMembers.length})
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {attendee.familyMembers.map((fam, idx) => (
                    <span
                      key={idx}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 4,
                        padding: '3px 8px',
                        fontSize: '0.78rem',
                        color: '#cbd5e1'
                      }}
                    >
                      <strong style={{ color: '#fff' }}>{fam.name}</strong> ({fam.relation})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Condition: APPROVED */}
          {isApproved && (
            <div>
              <div className="qr-code-box">
                <div className="qr-corner qr-corner-tl" />
                <div className="qr-corner qr-corner-tr" />
                <div className="qr-corner qr-corner-bl" />
                <div className="qr-corner qr-corner-br" />
                <canvas ref={canvasRef} style={{ display: 'block' }} />
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ 
                  fontFamily: 'monospace', 
                  fontSize: '0.95rem', 
                  fontWeight: 700, 
                  letterSpacing: '0.08em',
                  color: 'var(--accent-cyan)' 
                }}>
                  {attendee.ticketCode}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-sub)', marginTop: 4 }}>
                  {totalQuota > 1 
                    ? `Group pass for ${totalQuota} members. Partial arrivals accepted (e.g. 2 enter early, 2 enter late).`
                    : 'Scan at Security Gate for Wristband Collection'}
                </p>
              </div>

              {/* Wristband Tag */}
              <div style={{
                marginTop: 18,
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                background: isFullyCheckedIn 
                  ? 'rgba(6, 182, 212, 0.12)' 
                  : isPartiallyCheckedIn 
                  ? 'rgba(0, 242, 254, 0.12)' 
                  : 'rgba(16, 185, 129, 0.1)',
                border: `1px solid ${
                  isFullyCheckedIn 
                    ? 'rgba(6, 182, 212, 0.3)' 
                    : isPartiallyCheckedIn 
                    ? 'rgba(0, 242, 254, 0.3)' 
                    : 'rgba(16, 185, 129, 0.3)'
                }`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: '0.85rem',
                fontWeight: 600
              }}>
                {isFullyCheckedIn ? (
                  <>
                    <CheckCircle2 size={16} color="var(--accent-cyan)" />
                    <span style={{ color: 'var(--accent-cyan)' }}>
                      All {totalQuota} Wristbands Issued ({attendee.wristbandColor || 'Neon Cyan'}) · Quota Completed
                    </span>
                  </>
                ) : isPartiallyCheckedIn ? (
                  <>
                    <UserCheck size={16} color="#6ee7b7" />
                    <span style={{ color: '#6ee7b7' }}>
                      {admittedCount} of {totalQuota} Wristbands Issued ({remaining} Remaining)
                    </span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} color="var(--status-approved)" />
                    <span style={{ color: 'var(--status-approved)' }}>
                      {totalQuota > 1 
                        ? `Assigned: ${totalQuota} × ${attendee.wristbandColor || 'Neon Cyan'} Wristbands`
                        : `Assigned: ${attendee.wristbandColor || 'Neon Cyan Wristband (General Access)'}`}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Condition: PENDING */}
          {isPending && (
            <div style={{
              padding: '30px 20px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px dashed rgba(245, 158, 11, 0.3)',
              textAlign: 'center'
            }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(245, 158, 11, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <Clock size={28} color="var(--status-pending)" />
              </div>
              <h4 style={{ color: 'var(--status-pending)', fontSize: '1.1rem', marginBottom: 8 }}>
                Application Under Verification
              </h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5, maxWidth: 340, margin: '0 auto' }}>
                Your registration was received. The college organizing team is currently cross-verifying your student records. Your QR Entry Pass will appear here immediately once approved!
              </p>
            </div>
          )}

          {/* Condition: REJECTED */}
          {isRejected && (
            <div style={{
              padding: '30px 20px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px dashed rgba(239, 68, 68, 0.3)',
              textAlign: 'center'
            }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <AlertTriangle size={28} color="var(--status-rejected)" />
              </div>
              <h4 style={{ color: 'var(--status-rejected)', fontSize: '1.1rem', marginBottom: 8 }}>
                Application Not Approved
              </h4>
              <p style={{ color: '#fca5a5', fontSize: '0.85rem', lineHeight: 1.5, maxWidth: 340, margin: '0 auto 12px' }}>
                Reason: {attendee.rejectionReason || "Details did not match official college enrollment records."}
              </p>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>
                Please visit the Student Council Helpdesk with your physical college ID card if you believe this is an error.
              </span>
            </div>
          )}
        </div>

        {/* Ticket Footer Security Watermark */}
        <div className="ticket-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: 'var(--text-sub)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-cyan)' }} />
            <span>SECURE ANTI-FRAUD PASS</span>
          </div>

          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            {liveClock}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {isApproved && (
        <div className="no-print" style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button onClick={handleDownloadImage} className="btn btn-secondary" style={{ flex: 1, fontSize: '0.85rem' }}>
            <Download size={16} />
            Save QR Code
          </button>
          <button onClick={handlePrint} className="btn btn-primary" style={{ flex: 1, fontSize: '0.85rem' }}>
            <Printer size={16} />
            Print Pass
          </button>
        </div>
      )}
    </div>
  );
}
