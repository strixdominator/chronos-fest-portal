'use client';

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import { Attendee, EventSettings } from '@/lib/types';
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Download, 
  Mail, 
  Loader2, 
  ShieldCheck, 
  Users,
  FileText
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
  const [pdfDownloaded, setPdfDownloaded] = useState(false);
  const autoEmailTriggeredRef = useRef(false);
  const autoPdfDownloadedRef = useRef(false);

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

  // Generate and download official pass in PDF format
  const handleDownloadPdfPass = () => {
    try {
      const qrDataUrl = canvasRef.current ? canvasRef.current.toDataURL('image/png') : '';
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [105, 148], // A6 Pass format
      });

      // Background Obsidian Black
      doc.setFillColor(9, 9, 9);
      doc.rect(0, 0, 105, 148, 'F');

      // Antique Gold Outer Border
      doc.setDrawColor(176, 138, 70);
      doc.setLineWidth(1.2);
      doc.rect(4, 4, 97, 140);

      // Header Banner Box (Deep Espresso)
      doc.setFillColor(23, 19, 16);
      doc.rect(6, 6, 93, 24, 'F');
      doc.setDrawColor(176, 138, 70);
      doc.setLineWidth(0.4);
      doc.rect(6, 6, 93, 24);

      // Header Text
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('MILAN 2026', 52.5, 13, { align: 'center' });

      doc.setTextColor(232, 210, 160);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.text('DON BOSCO INSTITUTE OF TECHNOLOGY', 52.5, 17.5, { align: 'center' });

      doc.setTextColor(176, 138, 70);
      doc.setFont('courier', 'bold');
      doc.setFontSize(6.5);
      doc.text('OFFICIAL ALUMNI DIGITAL ENTRY PASS', 52.5, 22, { align: 'center' });

      // Attendee Info Box
      doc.setFillColor(31, 26, 22);
      doc.rect(8, 33, 89, 23, 'F');
      doc.setDrawColor(176, 138, 70);
      doc.rect(8, 33, 89, 23);

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text(attendee.fullName.toUpperCase(), 52.5, 40, { align: 'center' });

      doc.setTextColor(232, 210, 160);
      doc.setFont('courier', 'bold');
      doc.setFontSize(9);
      doc.text(`USN: ${attendee.usn || attendee.rollNumber}`, 52.5, 46, { align: 'center' });

      doc.setTextColor(212, 204, 193);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(`${attendee.department || 'Engineering'} · ${attendee.year || 'Alumni'}`, 52.5, 51, { align: 'center' });

      // QR Code Box
      const qrSize = 46;
      const qrX = (105 - qrSize) / 2;
      const qrY = 59;
      doc.setFillColor(255, 255, 255);
      doc.rect(qrX - 1.5, qrY - 1.5, qrSize + 3, qrSize + 3, 'F');
      doc.setDrawColor(176, 138, 70);
      doc.setLineWidth(0.8);
      doc.rect(qrX - 1.5, qrY - 1.5, qrSize + 3, qrSize + 3);

      if (qrDataUrl) {
        doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
      }

      // Security Details
      doc.setTextColor(232, 210, 160);
      doc.setFont('courier', 'bold');
      doc.setFontSize(8);
      doc.text(`CODE: ${attendee.ticketCode}`, 52.5, 110, { align: 'center' });

      doc.setTextColor(165, 155, 143);
      doc.setFontSize(5.5);
      doc.text('PRESENT AT SECURITY GATE FOR WRISTBAND', 52.5, 114, { align: 'center' });

      // Event Info Box
      doc.setFillColor(23, 19, 16);
      doc.rect(8, 117, 89, 13, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text('7 NOVEMBER 2026 · 2:30 PM (GATES: 2:00 PM)', 52.5, 122.5, { align: 'center' });

      doc.setTextColor(232, 210, 160);
      doc.setFontSize(6.5);
      doc.text('DBIT CRICKET GROUND, BENGALURU', 52.5, 127, { align: 'center' });

      // Footer
      doc.setTextColor(140, 130, 120);
      doc.setFont('courier', 'normal');
      doc.setFontSize(5);
      doc.text('DBIT ALUMNI ASSOCIATION · RECONNECTING RELATIONS', 52.5, 135, { align: 'center' });
      doc.text('ONE IDENTITY · ONE VERIFIED PASS · NON-TRANSFERABLE', 52.5, 138, { align: 'center' });

      // Auto trigger save
      doc.save(`MILAN2026_Pass_${attendee.usn || attendee.rollNumber}.pdf`);
      setPdfDownloaded(true);
    } catch (e) {
      console.error('PDF generation error:', e);
    }
  };

  // Auto-download PDF pass upon pass approval/render
  useEffect(() => {
    if (attendee.status === 'APPROVED' && !autoPdfDownloadedRef.current) {
      autoPdfDownloadedRef.current = true;
      const timer = setTimeout(() => {
        handleDownloadPdfPass();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [attendee.status, attendee.id]);

  // Mandatory high-resolution digital pass download (fallback)
  const handleDownloadPass = () => {
    handleDownloadPdfPass();
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
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.4rem', letterSpacing: '0.5px' }}>
              MILAN <span style={{ color: 'var(--gold-champagne, #E8D2A0)', fontStyle: 'normal' }}>2026</span>
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: 'var(--gold-champagne, #E8D2A0)', letterSpacing: '1.8px', marginTop: 2, textTransform: 'uppercase' }}>
              OFFICIAL ALUMNI ADMISSION CREDENTIAL
            </div>
          </div>

          <div>
            {isApproved && !isFullyCheckedIn && !isPartiallyCheckedIn && (
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', fontWeight: 800, background: 'rgba(176, 138, 70, 0.2)', color: 'var(--gold-champagne, #E8D2A0)', padding: '5px 10px', borderRadius: 6, border: '1px solid var(--gold-antique, #B08A46)', letterSpacing: '1px' }}>
                VERIFIED ({totalQuota} {totalQuota > 1 ? 'PASSES' : 'PASS'})
              </span>
            )}
            {isApproved && isPartiallyCheckedIn && (
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', fontWeight: 800, background: 'rgba(201, 155, 75, 0.25)', color: '#FDE68A', padding: '5px 10px', borderRadius: 6, border: '1px solid #D97706', letterSpacing: '1px' }}>
                {admittedCount}/{totalQuota} ADMITTED
              </span>
            )}
            {isApproved && isFullyCheckedIn && (
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', fontWeight: 800, background: 'rgba(239, 68, 68, 0.2)', color: '#FCA5A5', padding: '5px 10px', borderRadius: 6, border: '1px solid #EF4444', letterSpacing: '1px' }}>
                EXHAUSTED ({totalQuota}/{totalQuota})
              </span>
            )}
            {isPending && (
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', fontWeight: 800, background: 'rgba(245, 158, 11, 0.2)', color: '#FDE68A', padding: '5px 10px', borderRadius: 6, border: '1px solid #F59E0B', letterSpacing: '1px' }}>
                PENDING REVIEW
              </span>
            )}
            {isRejected && (
              <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', fontWeight: 800, background: 'rgba(239, 68, 68, 0.2)', color: '#FCA5A5', padding: '5px 10px', borderRadius: 6, border: '1px solid #EF4444', letterSpacing: '1px' }}>
                DENIED
              </span>
            )}
          </div>
        </div>

        {/* Live Anti-Counterfeit Banner */}
        <div style={{
          background: 'var(--bg-espresso-card, #1F1A16)',
          borderBottom: '1px solid rgba(176, 138, 70, 0.3)',
          padding: '9px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.68rem',
          fontWeight: 700,
          color: 'var(--gold-champagne, #E8D2A0)'
        }}>
          <span>LIVE SECURITY STAMP</span>
          <span style={{ color: '#FFFFFF', letterSpacing: '0.5px' }}>{liveClock}</span>
        </div>

        {/* Primary Details Grid (Warm Ivory Parchment) */}
        <div style={{ padding: '26px 24px 18px', background: 'var(--bg-ivory, #F5F0E7)', color: 'var(--text-dark, #171310)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 18 }}>
            <div>
              <div className="mono-label" style={{ fontSize: '0.65rem', marginBottom: 2 }}>ALUMNUS NAME</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-dark, #171310)', lineHeight: 1.15 }}>
                {attendee.fullName}
              </div>
            </div>
            <div>
              <div className="mono-label" style={{ fontSize: '0.65rem', marginBottom: 2 }}>SEAT NUMBER (USN)</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.15rem', fontWeight: 700, color: 'var(--gold-antique, #B08A46)' }}>
                {attendee.rollNumber}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16, paddingBottom: 14, borderBottom: '1px solid rgba(176, 138, 70, 0.25)' }}>
            <div>
              <div className="mono-label" style={{ fontSize: '0.65rem', marginBottom: 2 }}>DEPARTMENT & BATCH</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-dark, #171310)' }}>
                {attendee.department || 'Graduate'} {attendee.batchYear ? `• ${attendee.batchYear}` : ''}
              </div>
            </div>
            <div>
              <div className="mono-label" style={{ fontSize: '0.65rem', marginBottom: 2 }}>TICKET CODE</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.86rem', fontWeight: 700, color: 'var(--gold-dark, #8E6D32)' }}>
                {attendee.ticketCode}
              </div>
            </div>
          </div>

          {/* Event Venue, Date & Time Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16, marginTop: 14, paddingBottom: 14, borderBottom: '1px solid rgba(176, 138, 70, 0.25)' }}>
            <div>
              <div className="mono-label" style={{ fontSize: '0.65rem', marginBottom: 2 }}>EVENT VENUE</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-dark, #171310)' }}>
                DBIT Cricket Ground, Bengaluru
              </div>
            </div>
            <div>
              <div className="mono-label" style={{ fontSize: '0.65rem', marginBottom: 2 }}>DATE & TIME</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 700, color: 'var(--gold-antique, #B08A46)' }}>
                7 Nov 2026 · From 2:30 PM
              </div>
            </div>
          </div>

          {/* Professional Affiliation */}
          {(attendee.organization || attendee.designation) && (
            <div style={{ marginTop: 14, padding: '10px 14px', background: '#FFFFFF', border: '1px solid rgba(176, 138, 70, 0.3)', borderRadius: 6 }}>
              <div className="mono-label" style={{ fontSize: '0.64rem', marginBottom: 2, color: 'var(--gold-antique, #B08A46)' }}>PROFESSIONAL AFFILIATION</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-dark, #171310)' }}>
                {attendee.organization || ''}{attendee.organization && attendee.designation ? ' · ' : ''}{attendee.designation || ''}
              </div>
            </div>
          )}

          {/* Group Quota Strip if > 1 */}
          {totalQuota > 1 && (
            <div style={{
              margin: '16px 0',
              padding: '12px 14px',
              background: '#FFFFFF',
              border: '1px solid rgba(176, 138, 70, 0.4)',
              borderRadius: 6,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <span className="mono-label" style={{ color: 'var(--gold-antique, #B08A46)', fontSize: '0.65rem' }}>GROUP ADMISSION</span>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: 'var(--text-dark, #171310)' }}>
                  {totalQuota} PERSONS TOTAL
                </div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--gold-antique, #B08A46)' }}>
                {admittedCount > 0 ? `${remaining} REMAINING` : 'ALL UNCLAIMED'}
              </span>
            </div>
          )}

          {/* Registered Family Members */}
          {attendee.familyMembers && attendee.familyMembers.length > 0 && (
            <div style={{ margin: '14px 0 16px' }}>
              <div className="mono-label" style={{ fontSize: '0.65rem', marginBottom: 8 }}>
                ACCOMPANYING GUESTS ({attendee.familyMembers.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {attendee.familyMembers.map((member, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: '#FFFFFF',
                    border: '1px solid rgba(176, 138, 70, 0.25)',
                    borderRadius: 4,
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: 'var(--text-dark, #171310)'
                  }}>
                    <span>{member.name}</span>
                    <span style={{ color: 'var(--text-dark-muted, #786E63)' }}>{member.relation}</span>
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
          background: 'var(--bg-espresso, #171310)',
          padding: '8px 0',
          borderTop: '1px dashed rgba(176, 138, 70, 0.4)',
          borderBottom: '1px dashed rgba(176, 138, 70, 0.4)',
        }}>
          <div style={{ width: 14, height: 28, background: 'var(--bg-obsidian, #090909)', borderRight: '1px solid rgba(176, 138, 70, 0.4)', borderRadius: '0 14px 14px 0' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.15em', color: 'var(--gold-champagne, #E8D2A0)' }}>
            TEAR LINE • OFFICIAL GATE SCAN AREA
          </span>
          <div style={{ width: 14, height: 28, background: 'var(--bg-obsidian, #090909)', borderLeft: '1px solid rgba(176, 138, 70, 0.4)', borderRadius: '14px 0 0 14px' }} />
        </div>

        {/* QR Code Scan Area */}
        <div style={{ padding: '26px 24px', background: 'var(--bg-espresso, #171310)', textAlign: 'center' }}>
          {isApproved ? (
            <div>
              <div style={{
                display: 'inline-block',
                padding: '14px',
                background: '#FFFFFF',
                border: '1.5px solid var(--gold-antique, #B08A46)',
                borderRadius: 8,
                marginBottom: 12,
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
              }}>
                <canvas ref={canvasRef} style={{ display: 'block', maxWidth: '100%', height: 'auto' }} />
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', color: 'var(--gold-champagne, #E8D2A0)', letterSpacing: '1px' }}>
                PRESENT THIS QR CODE AT SECURITY GATE FOR ENTRY
              </div>
            </div>
          ) : isPending ? (
            <div style={{ padding: '32px 16px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #D97706', borderRadius: 8 }}>
              <Clock size={32} style={{ margin: '0 auto 12px', color: '#F59E0B' }} />
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, color: '#FDE68A' }}>
                APPROVAL PENDING
              </div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: '#FDE68A', marginTop: 4 }}>
                QR pass will unlock once the committee validates your submitted details.
              </p>
            </div>
          ) : (
            <div style={{ padding: '32px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #EF4444', borderRadius: 8 }}>
              <XCircle size={32} style={{ margin: '0 auto 12px', color: '#EF4444' }} />
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, color: '#FCA5A5' }}>
                REGISTRATION DENIED
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          borderTop: '1px solid rgba(176, 138, 70, 0.3)',
          background: 'var(--bg-espresso-card, #1F1A16)'
        }} className="no-print">
          <button
            type="button"
            onClick={handleDownloadPdfPass}
            disabled={!isApproved}
            style={{ 
              border: 'none', 
              borderRight: '1px solid rgba(176, 138, 70, 0.3)', 
              padding: '16px 12px',
              background: 'linear-gradient(135deg, #E8D2A0 0%, #B08A46 100%)',
              color: '#090909',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontFamily: 'var(--font-body)',
              fontSize: '0.78rem',
              fontWeight: 800,
              letterSpacing: '1px',
              cursor: isApproved ? 'pointer' : 'not-allowed',
              opacity: isApproved ? 1 : 0.55
            }}
          >
            <Download size={16} />
            DOWNLOAD PDF ↗
          </button>
          <button
            type="button"
            onClick={handleDeliverEmail}
            disabled={!isApproved || sendingEmail}
            style={{ 
              border: 'none', 
              padding: '16px 12px',
              background: 'var(--bg-espresso, #171310)',
              color: 'var(--gold-champagne, #E8D2A0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontFamily: 'var(--font-body)',
              fontSize: '0.78rem',
              fontWeight: 800,
              letterSpacing: '1px',
              cursor: isApproved && !sendingEmail ? 'pointer' : 'not-allowed',
              opacity: isApproved && !sendingEmail ? 1 : 0.55
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
                {emailSuccess ? 'RESEND TO EMAIL ↗' : 'DELIVER EMAIL ↗'}
              </>
            )}
          </button>
        </div>

        {/* PDF Auto Download Feedback */}
        {pdfDownloaded && (
          <div style={{ 
            padding: '10px 16px', 
            background: 'rgba(178, 139, 76, 0.15)', 
            borderTop: '1px solid rgba(178, 139, 76, 0.35)', 
            color: 'var(--champagne)', 
            fontFamily: 'var(--font-mono)', 
            fontSize: '0.78rem', 
            fontWeight: 700, 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8 
          }}>
            <CheckCircle2 size={15} color="var(--champagne)" />
            <span>Official entry pass automatically downloaded in PDF format!</span>
          </div>
        )}

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
