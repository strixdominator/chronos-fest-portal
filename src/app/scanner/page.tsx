'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import confetti from 'canvas-confetti';
import { 
  Camera, 
  CameraOff, 
  CheckCircle2, 
  AlertOctagon, 
  AlertTriangle, 
  Search, 
  Lock, 
  ShieldCheck, 
  Users, 
  Volume2, 
  RefreshCw,
  X,
  Sparkles,
  ArrowRight,
  Plus,
  Minus,
  UserCheck,
  Loader2
} from 'lucide-react';
import { playSuccessSound, playErrorSound } from '@/lib/sound';
import { Attendee, VerificationResult } from '@/lib/types';

interface ScanPreviewData {
  code: string;
  attendee?: Attendee;
  totalQuota: number;
  admittedCount: number;
  remaining: number;
  status: 'READY' | 'ALREADY_CHECKED_IN' | 'PENDING' | 'REJECTED' | 'NOT_FOUND';
  message: string;
}

export default function GateScannerPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [volunteerName, setVolunteerName] = useState('Gate 1 - North Entrance');

  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Split-admission preview & selection state
  const [scanPreview, setScanPreview] = useState<ScanPreviewData | null>(null);
  const [admitCount, setAdmitCount] = useState<number>(1);
  const [admitting, setAdmitting] = useState<boolean>(false);

  // Scan result modal state (after check-in executed)
  const [scanResult, setScanResult] = useState<VerificationResult | null>(null);

  // Recent scans list
  const [recentScans, setRecentScans] = useState<Array<{
    code: string;
    name: string;
    rollNumber: string;
    status: string;
    time: string;
  }>>([]);

  const [stats, setStats] = useState<{ checkedIn: number; approved: number; total: number }>({
    checkedIn: 0,
    approved: 0,
    total: 0
  });

  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Load live stats
  const refreshStats = async () => {
    try {
      const res = await fetch('/api/attendees');
      const data = await res.json();
      if (data.success) {
        setStats({
          checkedIn: data.stats.checkedIn,
          approved: data.stats.approved,
          total: data.stats.total,
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      refreshStats();
    }
  }, [isAuthenticated]);

  // Handle staff PIN authentication
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === 'gate2026' || pin === 'admin123' || pin === '1234') {
      setIsAuthenticated(true);
      setPinError('');
    } else {
      setPinError('Access Denied: Invalid Gate Authorization PIN.');
    }
  };

  // Start Camera
  const startScanner = async () => {
    try {
      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;

      const config = { fps: 10, qrbox: { width: 250, height: 250 } };

      await html5QrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          handleVerify(decodedText);
        },
        () => {
          // ignore scan frame errors
        }
      );
      setScanning(true);
    } catch (err: any) {
      console.error('Camera start error:', err);
      alert('Unable to access device camera. Please check camera permissions, or use manual roll number entry below.');
      setScanning(false);
    }
  };

  // Stop Camera
  const stopScanner = async () => {
    if (scannerRef.current && scanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        setScanning(false);
      } catch (err) {
        console.error('Camera stop error:', err);
      }
    }
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  // Verification & Preview Logic
  const handleVerify = async (codeToVerify: string) => {
    if (verifying || !codeToVerify.trim()) return;
    setVerifying(true);
    setScanResult(null);
    setScanPreview(null);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: codeToVerify.trim(),
          action: 'PREVIEW',
          volunteerName,
        }),
      });

      const data = await res.json();

      // If status is NOT 'READY' (e.g. ALREADY_CHECKED_IN, PENDING, REJECTED, NOT_FOUND)
      if (data.status !== 'READY') {
        playErrorSound();
        setScanPreview({
          code: codeToVerify.trim(),
          attendee: data.attendee,
          totalQuota: data.totalQuota || 0,
          admittedCount: data.admittedCount || 0,
          remaining: data.remaining || 0,
          status: data.status,
          message: data.message || 'Pass verification rejected.',
        });
        return;
      }

      // Status IS 'READY': show selection modal
      const rem = data.remaining || 1;
      // Default to admitCount = 1 or all remaining if small
      setAdmitCount(rem > 1 ? 1 : rem);
      setScanPreview({
        code: codeToVerify.trim(),
        attendee: data.attendee,
        totalQuota: data.totalQuota || 1,
        admittedCount: data.admittedCount || 0,
        remaining: rem,
        status: 'READY',
        message: data.message,
      });
    } catch (err) {
      console.error(err);
      playErrorSound();
      setScanPreview({
        code: codeToVerify.trim(),
        totalQuota: 0,
        admittedCount: 0,
        remaining: 0,
        status: 'NOT_FOUND',
        message: 'Network or server communication error. Please try again.',
      });
    } finally {
      setVerifying(false);
    }
  };

  // Confirm Check-in for chosen number of members
  const handleConfirmCheckIn = async (countToAdmit: number) => {
    if (!scanPreview || admitting) return;
    setAdmitting(true);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: scanPreview.code,
          action: 'CHECKIN',
          admittingCount: countToAdmit,
          volunteerName,
        }),
      });

      const data = await res.json();
      const result: VerificationResult = {
        valid: data.success,
        code: data.status || (data.success ? 'SUCCESS' : 'NOT_FOUND'),
        message: data.message || 'Check-in processed',
        attendee: data.attendee,
        admittedNow: data.admittedNow,
        remaining: data.remaining,
        totalQuota: data.totalQuota,
      };

      setScanResult(result);
      setScanPreview(null);

      if (result.valid) {
        playSuccessSound();
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00f2fe', '#10b981', '#a855f7']
        });
      } else {
        playErrorSound();
      }

      // Add to recent list
      setRecentScans(prev => [
        {
          code: scanPreview.code,
          name: result.attendee?.fullName || 'Unknown',
          rollNumber: result.attendee?.rollNumber || 'N/A',
          status: `${countToAdmit} Admitted (${result.code})`,
          time: new Date().toLocaleTimeString(),
        },
        ...prev.slice(0, 9)
      ]);

      refreshStats();
    } catch (err) {
      console.error(err);
      playErrorSound();
    } finally {
      setAdmitting(false);
    }
  };

  // If volunteer is not authenticated yet
  if (!isAuthenticated) {
    return (
      <div style={{ maxWidth: 440, margin: '60px auto', padding: '0 20px' }}>
        <div className="glass-panel" style={{ padding: '36px', textAlign: 'center' }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(0, 242, 254, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <Lock size={28} color="var(--accent-cyan)" />
          </div>

          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>
            Gate Staff Verification
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4, marginBottom: 20 }}>
            Enter your Gate volunteer PIN to launch the mobile entry QR camera scanner.
          </p>

          {pinError && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px',
              color: '#fca5a5',
              fontSize: '0.85rem',
              marginBottom: 16
            }}>
              {pinError}
            </div>
          )}

          <form onSubmit={handlePinSubmit}>
            <div className="form-group" style={{ textAlign: 'left' }}>
              <label className="form-label">Gate / Station Name</label>
              <select
                className="form-select"
                value={volunteerName}
                onChange={e => setVolunteerName(e.target.value)}
              >
                <option value="Gate 1 - North Entrance">Gate 1 - North Entrance</option>
                <option value="Gate 2 - South Arch">Gate 2 - South Arch</option>
                <option value="Gate 3 - Amphitheatre East">Gate 3 - Amphitheatre East</option>
                <option value="VIP & Performer Check-in">VIP & Performer Check-in</option>
              </select>
            </div>

            <div className="form-group" style={{ textAlign: 'left', marginTop: 12 }}>
              <label className="form-label">Gate PIN</label>
              <input
                type="password"
                placeholder="Enter Staff Authorization PIN"
                className="form-input"
                value={pin}
                onChange={e => setPin(e.target.value)}
                autoFocus
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 16, padding: '12px' }}
            >
              Unlock Scanner
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="scanner-container">
      {/* Live Gate Header Stats */}
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase' }}>
              {volunteerName}
            </span>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
              Checked In: <span style={{ color: 'var(--status-approved)' }}>{stats.checkedIn}</span> / {stats.approved}
            </h3>
          </div>
          <button onClick={refreshStats} className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '0.8rem' }}>
            <RefreshCw size={14} />
            Sync
          </button>
        </div>
      </div>

      {/* Camera Viewfinder */}
      <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', marginBottom: 20 }}>
        <div className="scanner-viewfinder">
          <div id="qr-reader" style={{ width: '100%', height: '100%' }} />
          {scanning && <div className="scanner-laser-line" />}
          {!scanning && (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              gap: 12
            }}>
              <Camera size={44} color="var(--accent-cyan)" />
              <p style={{ fontSize: '0.9rem', maxWidth: 220 }}>
                Camera is off. Click below to start scanning.
              </p>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 }}>
          {!scanning ? (
            <button onClick={startScanner} className="btn btn-primary" style={{ padding: '12px 24px' }}>
              <Camera size={18} />
              Start Camera Scanner
            </button>
          ) : (
            <button onClick={stopScanner} className="btn btn-secondary" style={{ padding: '12px 24px' }}>
              <CameraOff size={18} />
              Stop Camera
            </button>
          )}
        </div>
      </div>

      {/* Manual Roll Number / Ticket Search Fallback */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: 20 }}>
        <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Search size={14} />
          Manual Code / Roll Number Check-in (Fallback)
        </h4>

        <form onSubmit={e => { e.preventDefault(); handleVerify(manualCode); setManualCode(''); }} style={{ display: 'flex', gap: 10 }}>
          <input
            type="text"
            placeholder="e.g. 2023CS104 or TKT-CHRONOS-8942"
            className="form-input"
            value={manualCode}
            onChange={e => setManualCode(e.target.value)}
          />
          <button
            type="submit"
            disabled={verifying}
            className="btn btn-primary"
            style={{ whiteSpace: 'nowrap' }}
          >
            Verify
          </button>
        </form>

        {/* Demo Fast Scan Buttons */}
        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-sub)', alignSelf: 'center' }}>Test Scans:</span>
          <button
            type="button"
            onClick={() => handleVerify('2023CS104')}
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
          >
            Valid: 2023CS104
          </button>
          <button
            type="button"
            onClick={() => handleVerify('2022EC215')}
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
          >
            Already Used: 2022EC215
          </button>
          <button
            type="button"
            onClick={() => handleVerify('2024ME089')}
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
          >
            Pending: 2024ME089
          </button>
          <button
            type="button"
            onClick={() => handleVerify('UNKNOWN-999')}
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
          >
            Rejected: UNKNOWN-999
          </button>
        </div>
      </div>

      {/* Recent Scans Log */}
      {recentScans.length > 0 && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h4 style={{ fontSize: '0.85rem', color: 'var(--text-sub)', textTransform: 'uppercase', marginBottom: 12 }}>
            Recent Gate Activity
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentScans.map((scan, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.85rem'
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, color: '#fff' }}>{scan.name}</span>
                  <span style={{ color: 'var(--text-sub)', marginLeft: 8, fontFamily: 'monospace' }}>
                    {scan.rollNumber}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: scan.status === 'SUCCESS' ? 'var(--status-approved)' : 'var(--status-rejected)'
                  }}>
                    {scan.status}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>{scan.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: SCAN PREVIEW & ADMISSION SELECTOR */}
      {scanPreview && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{
            border: `2px solid ${
              scanPreview.status === 'READY'
                ? (scanPreview.admittedCount > 0 ? '#00f2fe' : '#10b981')
                : scanPreview.status === 'ALREADY_CHECKED_IN'
                ? '#f59e0b'
                : '#ef4444'
            }`,
            boxShadow: `0 0 50px ${
              scanPreview.status === 'READY'
                ? 'rgba(0, 242, 254, 0.35)'
                : scanPreview.status === 'ALREADY_CHECKED_IN'
                ? 'rgba(245, 158, 11, 0.35)'
                : 'rgba(239, 68, 68, 0.35)'
            }`
          }}>
            <div style={{
              padding: '28px 24px',
              textAlign: 'center',
              background: scanPreview.status === 'READY'
                ? 'linear-gradient(180deg, rgba(0, 242, 254, 0.15) 0%, rgba(14, 18, 30, 0.98) 100%)'
                : scanPreview.status === 'ALREADY_CHECKED_IN'
                ? 'linear-gradient(180deg, rgba(245, 158, 11, 0.2) 0%, rgba(14, 18, 30, 0.98) 100%)'
                : 'linear-gradient(180deg, rgba(239, 68, 68, 0.2) 0%, rgba(14, 18, 30, 0.98) 100%)'
            }}>
              {/* Header Icon */}
              <div style={{
                width: 68,
                height: 68,
                borderRadius: '50%',
                background: scanPreview.status === 'READY'
                  ? (scanPreview.admittedCount > 0 ? 'var(--accent-cyan)' : 'var(--status-approved)')
                  : scanPreview.status === 'ALREADY_CHECKED_IN'
                  ? 'var(--status-pending)'
                  : 'var(--status-rejected)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px',
                boxShadow: '0 0 25px rgba(0,0,0,0.5)'
              }}>
                {scanPreview.status === 'READY' ? (
                  scanPreview.admittedCount > 0 ? <UserCheck size={38} color="#07090e" /> : <CheckCircle2 size={40} color="#fff" />
                ) : scanPreview.status === 'ALREADY_CHECKED_IN' ? (
                  <AlertOctagon size={40} color="#fff" />
                ) : (
                  <AlertTriangle size={40} color="#fff" />
                )}
              </div>

              {/* Title */}
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.6rem',
                fontWeight: 800,
                color: scanPreview.status === 'READY'
                  ? (scanPreview.admittedCount > 0 ? 'var(--accent-cyan)' : 'var(--status-approved)')
                  : scanPreview.status === 'ALREADY_CHECKED_IN'
                  ? 'var(--status-pending)'
                  : 'var(--status-rejected)',
                marginBottom: 4
              }}>
                {scanPreview.status === 'READY' && (
                  scanPreview.admittedCount > 0 
                    ? `PARTIAL ENTRY (${scanPreview.remaining} REMAINING)`
                    : `VALID PASS (${scanPreview.totalQuota} TOTAL)`
                )}
                {scanPreview.status === 'ALREADY_CHECKED_IN' && 'QUOTA FULLY EXHAUSTED!'}
                {scanPreview.status === 'PENDING' && 'PENDING APPROVAL'}
                {scanPreview.status === 'REJECTED' && 'ENTRY REJECTED'}
                {scanPreview.status === 'NOT_FOUND' && 'INVALID TICKET'}
              </h2>

              <p style={{ fontSize: '0.9rem', color: '#cbd5e1', marginBottom: 16 }}>
                {scanPreview.message}
              </p>

              {/* Attendee Info Card */}
              {scanPreview.attendee && (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  textAlign: 'left',
                  marginBottom: 18
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-sub)', textTransform: 'uppercase' }}>GRADUATE ALUMNUS</span>
                      <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
                        {scanPreview.attendee.fullName}
                      </h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {scanPreview.attendee.department}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-sub)', textTransform: 'uppercase' }}>USN / ROLL NO</span>
                      <div style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-cyan)', fontSize: '0.95rem' }}>
                        {scanPreview.attendee.rollNumber}
                      </div>
                    </div>
                  </div>

                  {/* Registered Family Members breakdown */}
                  {scanPreview.attendee.familyMembers && scanPreview.attendee.familyMembers.length > 0 && (
                    <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-sub)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                        REGISTERED MEMBERS ({scanPreview.totalQuota} TOTAL):
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        <span style={{
                          background: 'rgba(0, 242, 254, 0.12)',
                          border: '1px solid rgba(0, 242, 254, 0.25)',
                          borderRadius: 4,
                          padding: '2px 8px',
                          fontSize: '0.75rem',
                          color: '#fff'
                        }}>
                          ★ {scanPreview.attendee.fullName} (Alumnus)
                        </span>
                        {scanPreview.attendee.familyMembers.map((fam, idx) => (
                          <span
                            key={idx}
                            style={{
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: 4,
                              padding: '2px 8px',
                              fontSize: '0.75rem',
                              color: '#cbd5e1'
                            }}
                          >
                            {fam.name} ({fam.relation})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quota Progress Strip */}
                  <div style={{
                    marginTop: 12,
                    paddingTop: 10,
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 8,
                    textAlign: 'center',
                    fontSize: '0.8rem'
                  }}>
                    <div style={{ background: 'rgba(0,0,0,0.25)', padding: '6px', borderRadius: 6 }}>
                      <span style={{ color: 'var(--text-sub)', display: 'block', fontSize: '0.7rem' }}>Total Quota</span>
                      <strong style={{ color: '#fff' }}>{scanPreview.totalQuota}</strong>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.25)', padding: '6px', borderRadius: 6 }}>
                      <span style={{ color: 'var(--text-sub)', display: 'block', fontSize: '0.7rem' }}>Already In</span>
                      <strong style={{ color: scanPreview.admittedCount > 0 ? 'var(--status-pending)' : 'var(--text-muted)' }}>
                        {scanPreview.admittedCount}
                      </strong>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.25)', padding: '6px', borderRadius: 6 }}>
                      <span style={{ color: 'var(--text-sub)', display: 'block', fontSize: '0.7rem' }}>Available Now</span>
                      <strong style={{ color: scanPreview.remaining > 0 ? '#6ee7b7' : 'var(--status-rejected)' }}>
                        {scanPreview.remaining}
                      </strong>
                    </div>
                  </div>

                  {/* Check-in logs if already partially admitted */}
                  {scanPreview.attendee.checkInLogs && scanPreview.attendee.checkInLogs.length > 0 && (
                    <div style={{ marginTop: 10, fontSize: '0.75rem', color: 'var(--text-sub)' }}>
                      <span style={{ fontWeight: 600 }}>Previous Admissions:</span>
                      {scanPreview.attendee.checkInLogs.map((log, idx) => (
                        <div key={idx} style={{ marginTop: 2 }}>
                          • {log.admitted} member(s) admitted at {new Date(log.timestamp).toLocaleTimeString()} ({log.gateVolunteer})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ACTION SECTION FOR VOLUNTEER */}
              {scanPreview.status === 'READY' && (
                <div style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid var(--border-focus)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  marginBottom: 18
                }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    color: '#fff',
                    marginBottom: 12
                  }}>
                    How many members are present at the gate right now?
                  </label>

                  {/* Number Stepper */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 16,
                    marginBottom: 14
                  }}>
                    <button
                      type="button"
                      disabled={admitCount <= 1}
                      onClick={() => setAdmitCount(prev => Math.max(1, prev - 1))}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid var(--border-subtle)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: admitCount <= 1 ? 'not-allowed' : 'pointer',
                        opacity: admitCount <= 1 ? 0.4 : 1
                      }}
                    >
                      <Minus size={20} />
                    </button>

                    <div style={{
                      minWidth: 70,
                      padding: '8px 16px',
                      borderRadius: 12,
                      background: 'rgba(0, 242, 254, 0.15)',
                      border: '1px solid rgba(0, 242, 254, 0.4)',
                      fontFamily: 'monospace',
                      fontSize: '1.8rem',
                      fontWeight: 800,
                      color: 'var(--accent-cyan)'
                    }}>
                      {admitCount}
                    </div>

                    <button
                      type="button"
                      disabled={admitCount >= scanPreview.remaining}
                      onClick={() => setAdmitCount(prev => Math.min(scanPreview.remaining, prev + 1))}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid var(--border-subtle)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: admitCount >= scanPreview.remaining ? 'not-allowed' : 'pointer',
                        opacity: admitCount >= scanPreview.remaining ? 0.4 : 1
                      }}
                    >
                      <Plus size={20} />
                    </button>
                  </div>

                  {/* Quick Shortcut Chips */}
                  {scanPreview.remaining > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                      {Array.from({ length: scanPreview.remaining }).map((_, i) => {
                        const val = i + 1;
                        const isSelected = admitCount === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setAdmitCount(val)}
                            style={{
                              padding: '5px 12px',
                              borderRadius: 999,
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              background: isSelected ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.06)',
                              color: isSelected ? '#07090e' : '#cbd5e1',
                              border: isSelected ? 'none' : '1px solid var(--border-subtle)',
                              cursor: 'pointer'
                            }}
                          >
                            {val === scanPreview.remaining ? `All ${val} Present` : `${val} Member${val > 1 ? 's' : ''}`}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="button"
                    disabled={admitting}
                    onClick={() => handleConfirmCheckIn(admitCount)}
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      padding: '14px',
                      fontSize: '1.05rem',
                      fontWeight: 800,
                      background: 'linear-gradient(135deg, #10b981 0%, #00f2fe 100%)',
                      border: 'none',
                      color: '#07090e'
                    }}
                  >
                    {admitting ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={18} />
                    )}
                    Confirm Entry for {admitCount} & Issue {admitCount} Wristband{admitCount > 1 ? 's' : ''}
                  </button>

                  {/* Remaining notice if partial */}
                  {admitCount < scanPreview.remaining && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
                      Note: {scanPreview.remaining - admitCount} quota will remain active on this QR code for late-arriving members.
                    </p>
                  )}
                </div>
              )}

              {/* Anti-fraud warning if already exhausted */}
              {scanPreview.status === 'ALREADY_CHECKED_IN' && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.5)',
                  padding: '14px',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: 16,
                  color: '#fca5a5',
                  fontSize: '0.88rem',
                  fontWeight: 700
                }}>
                  DO NOT ADMIT. All {scanPreview.totalQuota} of {scanPreview.totalQuota} registered passes have already been scanned. Wristbands were already issued.
                </div>
              )}

              {/* Close / Dismiss */}
              <button
                onClick={() => setScanPreview(null)}
                className="btn btn-secondary"
                style={{ width: '100%', padding: '12px', fontSize: '0.9rem' }}
              >
                {scanPreview.status === 'READY' ? 'Cancel / Scan Another' : 'Dismiss / Ready for Next'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRMED CHECK-IN RESULT (Wristband Handout Banner) */}
      {scanResult && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{
            border: `2px solid ${
              scanResult.code === 'SUCCESS' || scanResult.code === 'PARTIAL_ENTRY'
                ? '#10b981'
                : scanResult.code === 'ALREADY_CHECKED_IN'
                ? '#f59e0b'
                : '#ef4444'
            }`,
            boxShadow: `0 0 50px rgba(16, 185, 129, 0.4)`
          }}>
            <div style={{
              padding: '30px 24px',
              textAlign: 'center',
              background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.25) 0%, rgba(14, 18, 30, 0.98) 100%)'
            }}>
              {/* Status Icon */}
              <div style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'var(--status-approved)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                boxShadow: '0 0 30px rgba(16, 185, 129, 0.6)'
              }}>
                <CheckCircle2 size={44} color="#fff" />
              </div>

              {/* Status Title */}
              <h2 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.8rem',
                fontWeight: 800,
                color: 'var(--status-approved)',
                marginBottom: 6
              }}>
                {scanResult.code === 'PARTIAL_ENTRY' ? 'PARTIAL ENTRY CONFIRMED!' : 'ENTRY GRANTED!'}
              </h2>

              <p style={{ fontSize: '1rem', color: '#fff', fontWeight: 600, marginBottom: 20 }}>
                {scanResult.message}
              </p>

              {/* Big Wristband instruction box */}
              <div style={{
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid rgba(16, 185, 129, 0.6)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                textAlign: 'center',
                marginBottom: 20
              }}>
                <span style={{ fontSize: '0.8rem', color: '#6ee7b7', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>
                  ACTION FOR GATE VOLUNTEER:
                </span>
                <span style={{ fontSize: '1.25rem', color: '#fff', fontWeight: 800, display: 'block', marginTop: 4 }}>
                  ATTACH {scanResult.admittedNow || 1} × {scanResult.attendee?.wristbandColor || 'NEON CYAN'} WRISTBAND(S) NOW
                </span>
                {scanResult.remaining !== undefined && scanResult.remaining > 0 ? (
                  <span style={{
                    display: 'inline-block',
                    marginTop: 8,
                    padding: '3px 10px',
                    borderRadius: 999,
                    background: 'rgba(0, 242, 254, 0.15)',
                    color: 'var(--accent-cyan)',
                    fontSize: '0.78rem',
                    fontWeight: 700
                  }}>
                    ℹ️ {scanResult.remaining} remaining admission(s) left on this pass for members arriving later.
                  </span>
                ) : (
                  <span style={{
                    display: 'inline-block',
                    marginTop: 8,
                    padding: '3px 10px',
                    borderRadius: 999,
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#6ee7b7',
                    fontSize: '0.78rem',
                    fontWeight: 700
                  }}>
                    ✓ All registered quotas fulfilled · Pass is now expired.
                  </span>
                )}
              </div>

              {/* Dismiss button */}
              <button
                onClick={() => setScanResult(null)}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '1.05rem',
                  fontWeight: 700
                }}
              >
                Ready for Next Attendee
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
