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
  RefreshCw,
  X,
  Plus,
  Minus,
  UserCheck,
  Loader2,
  ExternalLink,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { playSuccessSound, playErrorSound } from '@/lib/sound';
import { Attendee, VerificationResult } from '@/lib/types';

interface ScanPreviewData {
  code: string;
  attendee?: Attendee;
  totalQuota: number;
  admittedCount: number;
  remaining: number;
  status: 'READY' | 'ALREADY_CHECKED_IN' | 'PENDING' | 'REJECTED' | 'NOT_FOUND' | 'UNAUTHORIZED' | 'SERVER_ERROR' | string;
  message: string;
}

export default function GateScannerPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [volunteerName, setVolunteerName] = useState('Gate Security');

  useEffect(() => {
    const savedPin = sessionStorage.getItem('dbit_scanner_pin');
    if (savedPin) {
      setPin(savedPin.trim().replace(/^["']|["']$/g, ''));
      setIsAuthenticated(true);
    }
  }, []);

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
    isSuccess: boolean;
  }>>([]);

  const [stats, setStats] = useState<{
    checkedIn: number;
    approved: number;
    total: number;
    admittedPeople?: number;
    approvedPeople?: number;
    remainingAtGate?: number;
  }>({
    checkedIn: 0,
    approved: 0,
    total: 0,
    admittedPeople: 0,
    approvedPeople: 0,
    remainingAtGate: 0,
  });

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanningLocked = useRef(false);
  const lastScannedRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  // Load live stats
  const refreshStats = async () => {
    try {
      const res = await fetch(`/api/attendees?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
      const data = await res.json();
      if (data.success) {
        setStats({
          checkedIn: data.stats.checkedIn,
          approved: data.stats.approved,
          total: data.stats.total,
          admittedPeople: data.stats.admittedPeople,
          approvedPeople: data.stats.approvedPeople,
          remainingAtGate: data.stats.remainingAtGate,
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      refreshStats();
      const interval = setInterval(refreshStats, 4000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Handle staff PIN authentication
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedPin = pin.trim().replace(/^["']|["']$/g, '');
    const validPins = ['milan#entry', 'alumni#milan', 'milan2026', 'milan#admin', 'milan2026admin'];
    if (validPins.includes(cleanedPin.toLowerCase())) {
      setIsAuthenticated(true);
      setPin(cleanedPin);
      setPinError('');
      sessionStorage.setItem('dbit_scanner_pin', cleanedPin);
    } else {
      setPinError('Access Denied: Invalid Gate Authorization PIN.');
    }
  };

  // Dismiss modal and resume camera scanner safely without looping
  const handleDismissModal = () => {
    setScanPreview(null);
    setScanResult(null);

    // Wait 1.2s before resuming so the old ticket is moved away
    setTimeout(() => {
      isScanningLocked.current = false;
      if (scannerRef.current && scanning) {
        try {
          scannerRef.current.resume();
        } catch (err) {
          console.log('Resume camera notice:', err);
        }
      }
    }, 1200);
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
          const now = Date.now();
          if (isScanningLocked.current || verifying) return;

          // Prevent rapid repeated scan of the same QR code within 3 seconds
          if (lastScannedRef.current.code === decodedText && now - lastScannedRef.current.time < 3000) {
            return;
          }

          lastScannedRef.current = { code: decodedText, time: now };
          isScanningLocked.current = true;

          // Immediately pause video frame processing to prevent repeating scanner loops!
          if (scannerRef.current && scannerRef.current.isScanning) {
            try {
              scannerRef.current.pause(true);
            } catch (err) {
              console.log('Pause camera notice:', err);
            }
          }

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
    isScanningLocked.current = false;
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

    const activePin = (pin || sessionStorage.getItem('dbit_scanner_pin') || '').trim().replace(/^["']|["']$/g, '');

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-scanner-pin': activePin 
        },
        body: JSON.stringify({
          code: codeToVerify.trim(),
          action: 'PREVIEW',
          volunteerName,
          pin: activePin,
        }),
      });

      const data = await res.json();

      // If status is NOT 'READY' (e.g. ALREADY_CHECKED_IN, PENDING, REJECTED, NOT_FOUND, UNAUTHORIZED)
      if (data.status !== 'READY') {
        playErrorSound();
        const displayMsg = data.message || data.error || 'Pass verification rejected.';
        setScanPreview({
          code: codeToVerify.trim(),
          attendee: data.attendee,
          totalQuota: data.totalQuota || 0,
          admittedCount: data.admittedCount || 0,
          remaining: data.remaining || 0,
          status: data.status || 'NOT_FOUND',
          message: displayMsg,
        });
        return;
      }

      // Status IS 'READY': show selection modal
      const rem = data.remaining || 1;
      setAdmitCount(rem > 1 ? 1 : rem);
      setScanPreview({
        code: codeToVerify.trim(),
        attendee: data.attendee,
        totalQuota: data.totalQuota || 1,
        admittedCount: data.admittedCount || 0,
        remaining: rem,
        status: 'READY',
        message: data.message || 'Pass verified successfully.',
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

    const activePin = (pin || sessionStorage.getItem('dbit_scanner_pin') || '').trim().replace(/^["']|["']$/g, '');

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-scanner-pin': activePin 
        },
        body: JSON.stringify({
          code: scanPreview.code,
          action: 'CHECKIN',
          admittingCount: countToAdmit,
          volunteerName,
          pin: activePin,
        }),
      });

      const data = await res.json();
      const result: VerificationResult = {
        valid: Boolean(data.success),
        code: data.status || (data.success ? 'SUCCESS' : 'NOT_FOUND'),
        message: data.message || data.error || 'Check-in processed',
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
          colors: ['#B28B4C', '#E5D2A5', '#F5EFE3', '#C59D5B']
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
          isSuccess: result.valid,
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

  // 1. PIN AUTHENTICATION SCREEN
  if (!isAuthenticated) {
    return (
      <div style={{ background: 'var(--bg-page)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div className="dbit-auth-card">
          {/* Header */}
          <div className="dbit-auth-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <img 
                src="/assets/66eff0e624600df79e9f69030275731c.png" 
                alt="Don Bosco Institute of Technology emblem" 
                style={{ width: 48, height: 'auto', display: 'block' }} 
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1, color: '#FFFFFF' }}>
                  MILAN<span style={{ color: 'var(--champagne)' }}>2026</span>
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1.4, color: 'var(--champagne)' }}>
                  DBIT ALUMNI ASSOCIATION
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className="mono-tag" style={{ color: 'var(--champagne)', fontSize: 11, letterSpacing: 1.5 }}>
                VOLUNTEER STATION GATEWAY
              </span>
              <span style={{ width: 24, height: 2, background: 'var(--color-gold)', borderRadius: 2 }} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, margin: '2px 0 4px', color: '#FFFFFF' }}>
              Gate Scanner Terminal
            </h2>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--champagne)', letterSpacing: 1 }}>
              7 NOVEMBER 2026 · 2:30 PM (GATES OPEN: 2:00 PM) · DBIT CRICKET GROUND
            </div>
          </div>

          <div className="dbit-auth-body">
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--text-body)', marginBottom: 20 }}>
              Enter authorized gate PIN to unlock optical pass verification.
            </p>

            {pinError && (
              <div style={{ padding: '10px 14px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, color: '#991b1b', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: 16 }}>
                {pinError}
              </div>
            )}

            <form onSubmit={handlePinSubmit}>
              <div style={{ marginBottom: 20 }}>
                <label className="mono-label" style={{ display: 'block', marginBottom: 6 }}>
                  GATE AUTHORIZATION PIN
                </label>
                <input
                  type="password"
                  placeholder="Enter Gate PIN"
                  className="neo-input"
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <button
                type="submit"
                className="btn-neo-black"
                style={{ width: '100%', padding: '14px', borderRadius: 8 }}
              >
                UNLOCK GATE SCANNER ↗
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // 2. MAIN GATE SCANNER INTERFACE
  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh', padding: '0 0 60px' }}>
      {/* HUB NAVIGATOR STRIP */}
      <div className="dbit-top-hub">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img 
            src="/assets/66eff0e624600df79e9f69030275731c.png" 
            alt="Don Bosco Institute of Technology emblem" 
            style={{ width: 38, height: 'auto', display: 'block' }} 
          />
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1, color: '#FFFFFF' }}>
              MILAN<span style={{ color: 'var(--champagne)' }}>2026</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: 1.2, color: 'var(--champagne)' }}>
              DBIT ALUMNI ASSOCIATION
            </div>
          </div>
          <span style={{ height: 20, width: 1, background: 'rgba(178, 139, 76, 0.3)', margin: '0 4px' }} />
          <span className="mono-tag" style={{ color: 'var(--champagne)', fontSize: 11 }}>
            GATE SCANNER
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Link
            href="/"
            target="_blank"
            className="btn-neo-outline"
            style={{ padding: '8px 14px', fontSize: '0.75rem', borderRadius: 8 }}
          >
            1. ALUMNI PASS PORTAL ↗
          </Link>
          <span
            className="btn-neo-black"
            style={{ padding: '8px 14px', fontSize: '0.75rem', cursor: 'default', borderRadius: 8 }}
          >
            2. GATE SCANNER (ACTIVE)
          </span>
          <Link
            href="/admin"
            target="_blank"
            className="btn-neo-outline"
            style={{ padding: '8px 14px', fontSize: '0.75rem', borderRadius: 8 }}
          >
            3. ADMIN CENTER ↗
          </Link>
          <button
            onClick={() => {
              sessionStorage.removeItem('dbit_scanner_pin');
              setIsAuthenticated(false);
              setPin('');
            }}
            className="btn-neo-outline"
            style={{ padding: '8px 14px', fontSize: '0.75rem', borderRadius: 8, color: '#dc2626', borderColor: '#fca5a5', cursor: 'pointer' }}
          >
            LOCK SCANNER
          </button>
        </div>
      </div>

      {/* TOP SCANNER HEADER */}
      <div className="dbit-dashboard-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            <span className="mono-tag" style={{ fontSize: 13, letterSpacing: 1.8, color: 'var(--champagne)' }}>ALUMNI MEET · MILAN 2026</span>
            <span style={{ display: 'block', width: 36, height: 3, background: 'var(--color-gold)', borderRadius: 2 }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--champagne)', fontWeight: 700 }}>
              7 NOVEMBER 2026 · 2:30 PM · GATES OPEN 2:00 PM · DBIT CRICKET GROUND, BANGALORE
            </span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 3.2vw, 2.5rem)', fontWeight: 700, color: '#FFFFFF' }}>
            Gate Entry & Wristband Terminal
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--soft-beige)', marginTop: 4 }}>
            Station: <strong style={{ color: 'var(--champagne)' }}>{volunteerName.toUpperCase()}</strong> · Optical pass validation with automatic family split-quota tracking.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={refreshStats}
            className="btn-neo-black"
            style={{ padding: '10px 18px', fontSize: '0.78rem', borderRadius: 8 }}
          >
            <RefreshCw size={14} />
            SYNC DATA ↗
          </button>
        </div>
      </div>

      {/* STAT COUNTERS GRID */}
      <div className="dbit-stat-grid">
        <div className="neo-stat-card">
          <span className="mono-label">GATE ADMITTED</span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 700, margin: '6px 0 2px', color: '#0e8a5a' }}>
            {stats.admittedPeople ?? stats.checkedIn}
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Persons admitted ({stats.checkedIn} primary passes)
          </span>
        </div>

        <div className="neo-stat-card">
          <span className="mono-label">ACTIVE ISSUED PASSES</span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 700, margin: '6px 0 2px', color: 'var(--color-blue)' }}>
            {stats.approved}
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {stats.approvedPeople ?? stats.approved} persons authorized
          </span>
        </div>

        <div className="neo-stat-card">
          <span className="mono-label">PENDING ARRIVAL</span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 700, margin: '6px 0 2px', color: 'var(--color-navy)' }}>
            {stats.remainingAtGate ?? Math.max(0, stats.approved - stats.checkedIn)}
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Persons expected at gates
          </span>
        </div>
      </div>

      {/* SCANNER BODY CONTAINER */}
      <div style={{ maxWidth: 1000, margin: '16px auto 0', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {/* CARD 1: CAMERA SCANNER */}
        <div className="neo-box" style={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)', border: '1px solid rgba(178, 139, 76, 0.3)' }}>
          <div style={{
            padding: '16px 24px',
            borderBottom: '1px solid rgba(178, 139, 76, 0.25)',
            background: '#17130F',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Camera size={18} style={{ color: 'var(--champagne)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--champagne)' }}>
                01 • OPTICAL QR CAMERA VIEW
              </span>
            </div>
            <span className="neo-badge" style={{ background: scanning ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.1)', color: scanning ? '#6EE7B7' : '#ffffff', border: '1px solid ' + (scanning ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.2)') }}>
              {scanning ? '● LIVE SCANNING' : '○ SENSOR OFF'}
            </span>
          </div>

          <div style={{ padding: '28px 24px', textAlign: 'center', background: '#1A1511' }}>
            <div className="scanner-camera-frame">
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
                  color: 'var(--champagne)',
                  gap: 12,
                  padding: 20
                }}>
                  <Camera size={44} style={{ color: 'var(--champagne)' }} />
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--soft-beige)', maxWidth: 300, lineHeight: 1.5 }}>
                    Optical sensor is in standby mode. Click below to activate front or rear camera.
                  </p>
                </div>
              )}
            </div>

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', gap: 12 }}>
              {!scanning ? (
                <button
                  type="button"
                  onClick={startScanner}
                  className="btn-neo-black"
                  style={{ padding: '14px 28px', fontSize: '0.82rem', borderRadius: 8 }}
                >
                  <Camera size={16} />
                  ACTIVATE CAMERA SCANNER ↗
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopScanner}
                  className="btn-neo-outline"
                  style={{ padding: '14px 28px', fontSize: '0.82rem', borderRadius: 8 }}
                >
                  <CameraOff size={16} />
                  DEACTIVATE CAMERA
                </button>
              )}
            </div>
          </div>
        </div>

        {/* CARD 2: MANUAL ROLL CODE LOOKUP */}
        <div className="neo-box" style={{ boxShadow: '0 4px 16px rgba(14, 31, 69, 0.06)' }}>
          <div style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-color)',
            background: 'linear-gradient(180deg, #EAF0FB 0%, #F5F8FD 100%)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Search size={18} style={{ color: 'var(--color-blue)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--color-navy)' }}>
                02 • MANUAL USN / TICKET CODE LOOKUP (FALLBACK)
              </span>
            </div>
            <span className="mono-tag" style={{ color: 'var(--text-muted)' }}>
              KEYPAD INPUT
            </span>
          </div>

          <div style={{ padding: '24px' }}>
            <form onSubmit={e => { e.preventDefault(); handleVerify(manualCode); setManualCode(''); }}>
              <div className="neo-input-group">
                <input
                  type="text"
                  placeholder="Enter USN (e.g. 1DB20CS001 or 1DBSCCS103)"
                  value={manualCode}
                  onChange={e => setManualCode(e.target.value)}
                  style={{ width: '100%', textTransform: 'uppercase' }}
                />
                <button
                  type="submit"
                  disabled={verifying || !manualCode.trim()}
                  className="btn-neo-black"
                  style={{ padding: '0 24px', borderRadius: 8 }}
                >
                  {verifying ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  VERIFY CODE ↗
                </button>
              </div>
            </form>

            {/* Test demo shortcuts */}
            <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              <span className="mono-label">FAST DEMO PASSES:</span>
              <button
                type="button"
                onClick={() => handleVerify('1DB15CS001')}
                className="neo-chip-btn"
              >
                1DB15CS001 (Valid Pass)
              </button>
              <button
                type="button"
                onClick={() => handleVerify('1DB01CS001')}
                className="neo-chip-btn"
              >
                1DB01CS001 (Exhausted Quota)
              </button>
              <button
                type="button"
                onClick={() => handleVerify('2024ME089')}
                className="neo-chip-btn"
              >
                2024ME089 (Pending Review)
              </button>
              <button
                type="button"
                onClick={() => handleVerify('UNKNOWN-999')}
                className="neo-chip-btn"
              >
                UNKNOWN-999 (Invalid)
              </button>
            </div>
          </div>
        </div>

        {/* CARD 3: RECENT GATE ACTIVITY */}
        {recentScans.length > 0 && (
          <div className="neo-box" style={{ boxShadow: '0 4px 16px rgba(14, 31, 69, 0.06)' }}>
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid var(--border-color)',
              background: 'linear-gradient(180deg, #EAF0FB 0%, #F5F8FD 100%)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--color-navy)' }}>
                03 • RECENT GATE ACTIVITY AT THIS STATION ({recentScans.length})
              </span>
              <span className="mono-tag" style={{ color: 'var(--color-blue)' }}>LIVE AUDIT</span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="neo-table" style={{ border: 'none' }}>
                <thead>
                  <tr>
                    <th>ATTENDEE NAME</th>
                    <th>USN / CODE</th>
                    <th>OUTCOME</th>
                    <th>TIMESTAMP</th>
                  </tr>
                </thead>
                <tbody>
                  {recentScans.map((scan, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700, color: 'var(--color-navy)' }}>{scan.name}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-blue)' }}>
                        {scan.rollNumber}
                      </td>
                      <td>
                        <span className={`neo-badge ${scan.isSuccess ? 'neo-badge-checkedin' : 'neo-badge-rejected'}`}>
                          {scan.status}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {scan.time}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
         MODAL 1: SCAN PREVIEW & ADMISSION SELECTOR (GROUP SPLIT QUOTA)
         ========================================================================= */}
      {scanPreview && (
        <div className="neo-modal-backdrop">
          <div className="neo-modal" style={{ maxWidth: 580 }}>
            <div className="neo-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="mono-tag" style={{ color: 'var(--champagne)', fontSize: 11 }}>
                  GATE DISPATCH PROTOCOL
                </span>
              </div>
              <button
                type="button"
                onClick={handleDismissModal}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              {/* Header Status Card */}
              <div style={{
                padding: '16px 20px',
                border: '1px solid var(--border-color)',
                borderRadius: 8,
                background: scanPreview.status === 'READY'
                  ? (scanPreview.admittedCount > 0 ? 'rgba(178, 139, 76, 0.15)' : '#d1fae5')
                  : scanPreview.status === 'ALREADY_CHECKED_IN'
                  ? '#fef3c7'
                  : '#fee2e2',
                marginBottom: 20
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {scanPreview.status === 'READY' ? (
                    scanPreview.admittedCount > 0 ? (
                      <UserCheck size={26} style={{ color: 'var(--color-blue)' }} />
                    ) : (
                      <CheckCircle2 size={26} style={{ color: '#065f46' }} />
                    )
                  ) : scanPreview.status === 'ALREADY_CHECKED_IN' ? (
                    <AlertOctagon size={26} style={{ color: '#92400e' }} />
                  ) : (
                    <AlertTriangle size={26} style={{ color: '#991b1b' }} />
                  )}

                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-navy)' }}>
                      {scanPreview.status === 'READY' && (
                        scanPreview.admittedCount > 0
                          ? `PARTIAL ENTRY (${scanPreview.remaining} REMAINING)`
                          : `VALID PASS (${scanPreview.totalQuota} TOTAL QUOTA)`
                      )}
                      {scanPreview.status === 'ALREADY_CHECKED_IN' && 'QUOTA FULLY EXHAUSTED!'}
                      {scanPreview.status === 'PENDING' && 'PENDING MANUAL APPROVAL'}
                      {scanPreview.status === 'REJECTED' && 'PASS REJECTED'}
                      {scanPreview.status === 'NOT_FOUND' && 'INVALID / NOT FOUND'}
                      {scanPreview.status === 'UNAUTHORIZED' && 'GATE PIN REQUIRED'}
                      {scanPreview.status === 'SERVER_ERROR' && 'SERVER CONNECTION ERROR'}
                      {!['READY', 'ALREADY_CHECKED_IN', 'PENDING', 'REJECTED', 'NOT_FOUND', 'UNAUTHORIZED', 'SERVER_ERROR'].includes(scanPreview.status) && 'VERIFICATION ERROR'}
                    </h3>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', marginTop: 2, color: 'var(--text-body)' }}>
                      {scanPreview.message}
                    </p>
                  </div>
                </div>
              </div>

              {/* Attendee Details Card */}
              {scanPreview.attendee && (
                <div style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: '18px', background: '#F8FAFC', marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span className="mono-label">GRADUATE ALUMNUS</span>
                      <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-navy)', marginTop: 2 }}>
                        {scanPreview.attendee.fullName}
                      </h4>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {scanPreview.attendee.department} · {scanPreview.attendee.batchYear || 'Alumnus'}
                      </p>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span className="mono-label">USN / ROLL NO</span>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-blue)', marginTop: 2 }}>
                        {scanPreview.attendee.rollNumber}
                      </div>
                    </div>
                  </div>

                  {/* Registered Family Members breakdown */}
                  {scanPreview.attendee.familyMembers && scanPreview.attendee.familyMembers.length > 0 && (
                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-color)' }}>
                      <span className="mono-label" style={{ display: 'block', marginBottom: 8 }}>
                        REGISTERED MEMBERS ({scanPreview.totalQuota} TOTAL):
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        <span className="neo-badge neo-badge-approved">
                          ★ {scanPreview.attendee.fullName} (Alumnus)
                        </span>
                        {scanPreview.attendee.familyMembers.map((fam, idx) => (
                          <span key={idx} className="neo-badge" style={{ background: '#ffffff', borderColor: 'var(--border-color)', color: 'var(--color-navy)' }}>
                            {fam.name} ({fam.relation})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quota Progress Strip */}
                  <div style={{
                    marginTop: 14,
                    paddingTop: 12,
                    borderTop: '1px solid var(--border-color)',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 8,
                    textAlign: 'center'
                  }}>
                    <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 8, padding: '10px' }}>
                      <span className="mono-label" style={{ display: 'block', fontSize: '0.68rem' }}>Total Quota</span>
                      <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', color: 'var(--color-navy)' }}>{scanPreview.totalQuota}</strong>
                    </div>
                    <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 8, padding: '10px' }}>
                      <span className="mono-label" style={{ display: 'block', fontSize: '0.68rem' }}>Already In</span>
                      <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', color: scanPreview.admittedCount > 0 ? '#b45309' : 'var(--text-muted)' }}>
                        {scanPreview.admittedCount}
                      </strong>
                    </div>
                    <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 8, padding: '10px' }}>
                      <span className="mono-label" style={{ display: 'block', fontSize: '0.68rem' }}>Available Now</span>
                      <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', color: scanPreview.remaining > 0 ? '#0e8a5a' : '#dc2626' }}>
                        {scanPreview.remaining}
                      </strong>
                    </div>
                  </div>

                  {/* Previous Check-in logs if already partially admitted */}
                  {scanPreview.attendee.checkInLogs && scanPreview.attendee.checkInLogs.length > 0 && (
                    <div style={{ marginTop: 12, fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      <span style={{ fontWeight: 700, color: 'var(--color-navy)' }}>Previous Check-in Log:</span>
                      {scanPreview.attendee.checkInLogs.map((log, idx) => (
                        <div key={idx} style={{ marginTop: 2 }}>
                          • {log.admitted} member(s) admitted at {new Date(log.timestamp).toLocaleTimeString()} by {log.gateVolunteer}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ACTION SECTION FOR VOLUNTEER */}
              {scanPreview.status === 'READY' && (
                <div style={{ border: '1px solid rgba(178, 139, 76, 0.35)', borderRadius: 8, padding: '20px', background: '#FAF7F2', marginBottom: 20 }}>
                  <label className="mono-label" style={{ display: 'block', marginBottom: 12, textAlign: 'center', color: 'var(--espresso)' }}>
                    MEMBERS PRESENT AT GATE RIGHT NOW:
                  </label>

                  {/* Stepper */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
                    <button
                      type="button"
                      disabled={admitCount <= 1}
                      onClick={() => setAdmitCount(prev => Math.max(1, prev - 1))}
                      className="neo-stepper-btn"
                    >
                      <Minus size={18} />
                    </button>

                    <div className="neo-stepper-val">
                      {admitCount}
                    </div>

                    <button
                      type="button"
                      disabled={admitCount >= scanPreview.remaining}
                      onClick={() => setAdmitCount(prev => Math.min(scanPreview.remaining, prev + 1))}
                      className="neo-stepper-btn"
                    >
                      <Plus size={18} />
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
                            className={`neo-chip-btn ${isSelected ? 'active' : ''}`}
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
                    className="btn-neo-black"
                    style={{
                      width: '100%',
                      padding: '16px',
                      fontSize: '0.88rem',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8
                    }}
                  >
                    {admitting ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={18} />
                    )}
                    CONFIRM ENTRY FOR {admitCount} & ISSUE {admitCount} WRISTBAND{admitCount > 1 ? 'S' : ''} ↗
                  </button>

                  {admitCount < scanPreview.remaining && (
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 10 }}>
                      ℹ️ Note: {scanPreview.remaining - admitCount} quota will remain valid on this QR code for late arrivals.
                    </p>
                  )}
                </div>
              )}

              {/* Anti-fraud warning if already exhausted */}
              {scanPreview.status === 'ALREADY_CHECKED_IN' && (
                <div style={{
                  padding: '14px',
                  background: '#fee2e2',
                  border: '1px solid #fca5a5',
                  borderRadius: 8,
                  color: '#991b1b',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  marginBottom: 16
                }}>
                  ⛔ DO NOT ADMIT: All {scanPreview.totalQuota} of {scanPreview.totalQuota} registered passes have already been scanned. Wristbands were already issued.
                </div>
              )}

              {/* Close Button */}
              <button
                type="button"
                onClick={handleDismissModal}
                className="btn-neo-outline"
                style={{ width: '100%', padding: '12px', borderRadius: 8 }}
              >
                {scanPreview.status === 'READY' ? 'CANCEL / SCAN ANOTHER' : 'DISMISS / READY FOR NEXT'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
         MODAL 2: CONFIRMED CHECK-IN RESULT (WRISTBAND ATTACHMENT BANNER)
         ========================================================================= */}
      {scanResult && (
        <div className="neo-modal-backdrop">
          <div className="neo-modal" style={{ maxWidth: 540 }}>
            <div className="neo-modal-header" style={{ background: '#0e8a5a' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={18} style={{ color: '#ffffff' }} />
                <span className="mono-tag" style={{ color: '#ffffff' }}>
                  ADMISSION GRANTED
                </span>
              </div>
              <button
                type="button"
                onClick={handleDismissModal}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '28px', textAlign: 'center' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, textTransform: 'uppercase', color: '#0e8a5a' }}>
                {scanResult.code === 'PARTIAL_ENTRY' ? 'PARTIAL ENTRY RECORDED!' : 'ENTRY GRANTED!'}
              </h2>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.92rem', color: 'var(--text-body)', marginTop: 6, marginBottom: 20 }}>
                {scanResult.message}
              </p>

              {/* Big Wristband instruction box */}
              <div style={{
                background: 'rgba(178, 139, 76, 0.12)',
                border: '1.5px solid var(--gold-antique)',
                borderRadius: 12,
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                padding: '22px',
                textAlign: 'center',
                marginBottom: 20
              }}>
                <span className="mono-label" style={{ display: 'block', color: 'var(--gold-dark)', marginBottom: 6 }}>
                  ACTION FOR GATE VOLUNTEER:
                </span>
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.35rem',
                  fontWeight: 700,
                  color: 'var(--espresso)',
                  display: 'block'
                }}>
                  ATTACH {scanResult.admittedNow || 1} × {scanResult.attendee?.wristbandColor || 'ROYAL BLUE'} WRISTBAND(S) NOW
                </span>

                {scanResult.remaining !== undefined && scanResult.remaining > 0 ? (
                  <span style={{
                    display: 'inline-block',
                    marginTop: 12,
                    padding: '6px 14px',
                    background: '#ffffff',
                    border: '1px solid var(--border-color)',
                    borderRadius: 6,
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    color: 'var(--color-blue)'
                  }}>
                    ℹ️ {scanResult.remaining} remaining admission(s) left on this pass for late arrivals.
                  </span>
                ) : (
                  <span style={{
                    display: 'inline-block',
                    marginTop: 12,
                    padding: '6px 14px',
                    background: '#ffffff',
                    border: '1px solid var(--border-color)',
                    borderRadius: 6,
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    color: '#0e8a5a'
                  }}>
                    ✓ Full pass quota fulfilled · Pass marked complete.
                  </span>
                )}
              </div>

              {/* Ready for next button */}
              <button
                type="button"
                onClick={handleDismissModal}
                className="btn-neo-black"
                style={{ width: '100%', padding: '14px', fontSize: '0.88rem', borderRadius: 8 }}
              >
                READY FOR NEXT ATTENDEE ↗
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
