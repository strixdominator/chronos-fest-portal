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
    isSuccess: boolean;
  }>>([]);

  const [stats, setStats] = useState<{ checkedIn: number; approved: number; total: number }>({
    checkedIn: 0,
    approved: 0,
    total: 0
  });

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanningLocked = useRef(false);
  const lastScannedRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

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
          colors: ['#1d4ed8', '#0a192f', '#93c5fd', '#ffffff']
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
        <div className="neo-box" style={{ maxWidth: 440, width: '100%', background: '#ffffff', boxShadow: '6px 6px 0px 0px var(--border-black)' }}>
          {/* Header */}
          <div style={{ padding: '24px 28px', background: 'var(--bg-black)', color: '#ffffff', borderBottom: '1px solid var(--border-black)' }}>
            <span className="mono-tag" style={{ color: 'var(--card-blue-2)' }}>VOLUNTEER STATION GATEWAY</span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 900, marginTop: 4 }}>
              MILAN 2026 • GATE SCANNER
            </h2>
          </div>

          <div style={{ padding: '28px' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
              Select your gate checkpoint station and enter the authorization PIN to unlock the live optical QR validator.
            </p>

            {pinError && (
              <div style={{ padding: '10px 14px', background: '#fee2e2', border: '1px solid var(--border-black)', color: '#991b1b', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: 16 }}>
                {pinError}
              </div>
            )}

            <form onSubmit={handlePinSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label className="mono-label" style={{ display: 'block', marginBottom: 6 }}>
                  GATE / POST LOCATION
                </label>
                <select
                  className="neo-input"
                  value={volunteerName}
                  onChange={e => setVolunteerName(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="Gate 1 - North Entrance">Gate 1 - North Entrance</option>
                  <option value="Gate 2 - South Arch">Gate 2 - South Arch</option>
                  <option value="Gate 3 - Amphitheatre East">Gate 3 - Amphitheatre East</option>
                  <option value="VIP & Performer Check-in">VIP & Performer Check-in</option>
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label className="mono-label" style={{ display: 'block', marginBottom: 6 }}>
                  VOLUNTEER PIN
                </label>
                <input
                  type="password"
                  placeholder="Enter PIN"
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
                style={{ width: '100%', padding: '14px' }}
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
      <div style={{
        background: '#ffffff',
        borderBottom: '1px solid var(--border-black)',
        padding: '12px 32px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="mono-tag" style={{ color: 'var(--accent-blue)' }}>HUB:</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)' }}>
            MILAN 2026 ADMISSION PROTOCOL
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Link
            href="/"
            target="_blank"
            className="btn-neo-outline"
            style={{ padding: '8px 14px', fontSize: '0.75rem' }}
          >
            ALUMNI PASS PORTAL ↗
          </Link>
          <span
            className="btn-neo-black"
            style={{ padding: '8px 14px', fontSize: '0.75rem', cursor: 'default' }}
          >
            GATE SCANNER (ACTIVE)
          </span>
        </div>
      </div>

      {/* TOP SCANNER HEADER */}
      <div style={{
        padding: '28px 32px 20px',
        borderBottom: '1px solid var(--border-black)',
        background: 'var(--bg-blue-tint)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        gap: 20
      }}>
        <div>
          <div className="mono-tag" style={{ color: 'var(--accent-blue)' }}>
            STATION: {volunteerName.toUpperCase()}
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 3.2vw, 2.5rem)', fontWeight: 900, textTransform: 'uppercase', marginTop: 4 }}>
            Gate Entry & Wristband Terminal
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            Optical validation with automated family split-quota admission tracking.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={refreshStats}
            className="btn-neo-black"
            style={{ padding: '10px 18px', fontSize: '0.78rem' }}
          >
            <RefreshCw size={14} />
            SYNC DATA ↗
          </button>
        </div>
      </div>

      {/* STAT COUNTERS GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        borderBottom: '1px solid var(--border-black)',
        background: '#ffffff'
      }}>
        <div className="neo-stat-card" style={{ borderRight: '1px solid var(--border-black)', borderBottom: 'none' }}>
          <span className="mono-label">GATE ADMITTED</span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 900, margin: '6px 0 2px', color: '#0e8a5a' }}>
            {stats.checkedIn}
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            Wristbands attached
          </span>
        </div>

        <div className="neo-stat-card" style={{ borderRight: '1px solid var(--border-black)', borderBottom: 'none' }}>
          <span className="mono-label">ISSUED PASSES</span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 900, margin: '6px 0 2px', color: 'var(--accent-blue)' }}>
            {stats.approved}
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            Active QR tickets
          </span>
        </div>

        <div className="neo-stat-card" style={{ borderBottom: 'none' }}>
          <span className="mono-label">PENDING ARRIVAL</span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 900, margin: '6px 0 2px', color: 'var(--text-main)' }}>
            {Math.max(0, stats.approved - stats.checkedIn)}
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            Expected at gates
          </span>
        </div>
      </div>

      {/* SCANNER BODY CONTAINER */}
      <div style={{ maxWidth: 1000, margin: '32px auto 0', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {/* CARD 1: CAMERA SCANNER */}
        <div className="neo-box" style={{ background: '#ffffff', boxShadow: '4px 4px 0px 0px var(--border-black)' }}>
          <div style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-black)',
            background: 'var(--bg-black)',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Camera size={18} style={{ color: 'var(--card-blue-2)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.06em' }}>
                01 • OPTICAL QR CAMERA VIEW
              </span>
            </div>
            <span className="neo-badge" style={{ background: scanning ? '#d1fae5' : '#e2e8f0', color: scanning ? '#065f46' : '#475569' }}>
              {scanning ? '● LIVE SCANNING' : '○ SENSOR OFF'}
            </span>
          </div>

          <div style={{ padding: '24px', textAlign: 'center' }}>
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
                  color: '#94a3b8',
                  gap: 12,
                  padding: 20
                }}>
                  <Camera size={48} style={{ color: 'var(--card-blue-2)' }} />
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#e2e8f0', maxWidth: 280 }}>
                    Optical sensor is in standby mode. Click below to activate front or back camera.
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
                  style={{ padding: '14px 28px', fontSize: '0.82rem' }}
                >
                  <Camera size={16} />
                  ACTIVATE CAMERA SCANNER ↗
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopScanner}
                  className="btn-neo-outline"
                  style={{ padding: '14px 28px', fontSize: '0.82rem' }}
                >
                  <CameraOff size={16} />
                  DEACTIVATE CAMERA
                </button>
              )}
            </div>
          </div>
        </div>

        {/* CARD 2: MANUAL ROLL CODE LOOKUP */}
        <div className="neo-box" style={{ background: '#ffffff', boxShadow: '4px 4px 0px 0px var(--border-black)' }}>
          <div style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-black)',
            background: 'var(--bg-blue-tint)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Search size={18} style={{ color: 'var(--accent-blue)' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.06em' }}>
                02 • MANUAL USN / TICKET CODE LOOKUP (FALLBACK)
              </span>
            </div>
            <span className="mono-tag" style={{ color: 'var(--text-secondary)' }}>
              KEYPAD INPUT
            </span>
          </div>

          <div style={{ padding: '24px' }}>
            <form onSubmit={e => { e.preventDefault(); handleVerify(manualCode); setManualCode(''); }}>
              <div className="neo-input-group">
                <input
                  type="text"
                  placeholder="Enter USN (e.g. 1DB20CS001 or 2023CS104)"
                  value={manualCode}
                  onChange={e => setManualCode(e.target.value)}
                  style={{ width: '100%', textTransform: 'uppercase' }}
                />
                <button
                  type="submit"
                  disabled={verifying || !manualCode.trim()}
                  className="btn-neo-black"
                  style={{ padding: '0 24px' }}
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
          <div className="neo-box" style={{ background: '#ffffff', boxShadow: '4px 4px 0px 0px var(--border-black)' }}>
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid var(--border-black)',
              background: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.06em' }}>
                03 • RECENT GATE ACTIVITY AT THIS STATION ({recentScans.length})
              </span>
              <span className="mono-tag" style={{ color: 'var(--accent-blue)' }}>LIVE AUDIT</span>
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
                      <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{scan.name}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-blue)' }}>
                        {scan.rollNumber}
                      </td>
                      <td>
                        <span className={`neo-badge ${scan.isSuccess ? 'neo-badge-checkedin' : 'neo-badge-rejected'}`}>
                          {scan.status}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="mono-tag" style={{ color: 'var(--card-blue-2)' }}>
                  GATE DISPATCH PROTOCOL
                </span>
              </div>
              <button
                type="button"
                onClick={handleDismissModal}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              {/* Header Status Card */}
              <div style={{
                padding: '16px 20px',
                border: '1px solid var(--border-black)',
                background: scanPreview.status === 'READY'
                  ? (scanPreview.admittedCount > 0 ? 'var(--card-blue-1)' : '#d1fae5')
                  : scanPreview.status === 'ALREADY_CHECKED_IN'
                  ? '#fef3c7'
                  : '#fee2e2',
                marginBottom: 20
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {scanPreview.status === 'READY' ? (
                    scanPreview.admittedCount > 0 ? (
                      <UserCheck size={24} style={{ color: '#0f2b5c' }} />
                    ) : (
                      <CheckCircle2 size={24} style={{ color: '#065f46' }} />
                    )
                  ) : scanPreview.status === 'ALREADY_CHECKED_IN' ? (
                    <AlertOctagon size={24} style={{ color: '#92400e' }} />
                  ) : (
                    <AlertTriangle size={24} style={{ color: '#991b1b' }} />
                  )}

                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 900, textTransform: 'uppercase' }}>
                      {scanPreview.status === 'READY' && (
                        scanPreview.admittedCount > 0
                          ? `PARTIAL ENTRY (${scanPreview.remaining} REMAINING)`
                          : `VALID PASS (${scanPreview.totalQuota} TOTAL QUOTA)`
                      )}
                      {scanPreview.status === 'ALREADY_CHECKED_IN' && 'QUOTA FULLY EXHAUSTED!'}
                      {scanPreview.status === 'PENDING' && 'PENDING MANUAL APPROVAL'}
                      {scanPreview.status === 'REJECTED' && 'PASS REJECTED'}
                      {scanPreview.status === 'NOT_FOUND' && 'INVALID / NOT FOUND'}
                    </h3>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', marginTop: 2, color: 'var(--text-secondary)' }}>
                      {scanPreview.message}
                    </p>
                  </div>
                </div>
              </div>

              {/* Attendee Details Card */}
              {scanPreview.attendee && (
                <div style={{ border: '1px solid var(--border-black)', padding: '16px', background: 'var(--bg-card-alt)', marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span className="mono-label">GRADUATE ALUMNUS</span>
                      <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800, marginTop: 2 }}>
                        {scanPreview.attendee.fullName}
                      </h4>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {scanPreview.attendee.department} · {scanPreview.attendee.batchYear || 'Alumnus'}
                      </p>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span className="mono-label">USN / ROLL NO</span>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.05rem', fontWeight: 800, color: 'var(--accent-blue)', marginTop: 2 }}>
                        {scanPreview.attendee.rollNumber}
                      </div>
                    </div>
                  </div>

                  {/* Registered Family Members breakdown */}
                  {scanPreview.attendee.familyMembers && scanPreview.attendee.familyMembers.length > 0 && (
                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
                      <span className="mono-label" style={{ display: 'block', marginBottom: 8 }}>
                        REGISTERED MEMBERS ({scanPreview.totalQuota} TOTAL):
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        <span className="neo-badge neo-badge-approved">
                          ★ {scanPreview.attendee.fullName} (Alumnus)
                        </span>
                        {scanPreview.attendee.familyMembers.map((fam, idx) => (
                          <span key={idx} className="neo-badge" style={{ background: '#ffffff' }}>
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
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 8,
                    textAlign: 'center'
                  }}>
                    <div style={{ background: '#ffffff', border: '1px solid var(--border-black)', padding: '8px' }}>
                      <span className="mono-label" style={{ display: 'block', fontSize: '0.68rem' }}>Total Quota</span>
                      <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem' }}>{scanPreview.totalQuota}</strong>
                    </div>
                    <div style={{ background: '#ffffff', border: '1px solid var(--border-black)', padding: '8px' }}>
                      <span className="mono-label" style={{ display: 'block', fontSize: '0.68rem' }}>Already In</span>
                      <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', color: scanPreview.admittedCount > 0 ? '#b45309' : 'var(--text-secondary)' }}>
                        {scanPreview.admittedCount}
                      </strong>
                    </div>
                    <div style={{ background: '#ffffff', border: '1px solid var(--border-black)', padding: '8px' }}>
                      <span className="mono-label" style={{ display: 'block', fontSize: '0.68rem' }}>Available Now</span>
                      <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', color: scanPreview.remaining > 0 ? '#0e8a5a' : '#dc2626' }}>
                        {scanPreview.remaining}
                      </strong>
                    </div>
                  </div>

                  {/* Previous Check-in logs if already partially admitted */}
                  {scanPreview.attendee.checkInLogs && scanPreview.attendee.checkInLogs.length > 0 && (
                    <div style={{ marginTop: 12, fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>Previous Check-in Log:</span>
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
                <div style={{ border: '1px solid var(--border-black)', padding: '18px', background: 'var(--bg-blue-tint)', marginBottom: 20 }}>
                  <label className="mono-label" style={{ display: 'block', marginBottom: 12, textAlign: 'center' }}>
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
                      fontSize: '0.9rem',
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
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: 10 }}>
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
                  border: '1px solid var(--border-black)',
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
                style={{ width: '100%', padding: '12px' }}
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
                style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '28px', textAlign: 'center' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 900, textTransform: 'uppercase', color: '#0e8a5a' }}>
                {scanResult.code === 'PARTIAL_ENTRY' ? 'PARTIAL ENTRY RECORDED!' : 'ENTRY GRANTED!'}
              </h2>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.92rem', color: 'var(--text-secondary)', marginTop: 6, marginBottom: 20 }}>
                {scanResult.message}
              </p>

              {/* Big Wristband instruction box */}
              <div style={{
                background: 'var(--card-blue-1)',
                border: '2px solid var(--border-black)',
                boxShadow: '4px 4px 0px 0px var(--border-black)',
                padding: '20px',
                textAlign: 'center',
                marginBottom: 20
              }}>
                <span className="mono-label" style={{ display: 'block', color: 'var(--accent-blue)', marginBottom: 4 }}>
                  ACTION FOR GATE VOLUNTEER:
                </span>
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.25rem',
                  fontWeight: 900,
                  color: 'var(--text-main)',
                  display: 'block'
                }}>
                  ATTACH {scanResult.admittedNow || 1} × {scanResult.attendee?.wristbandColor || 'ROYAL BLUE'} WRISTBAND(S) NOW
                </span>

                {scanResult.remaining !== undefined && scanResult.remaining > 0 ? (
                  <span style={{
                    display: 'inline-block',
                    marginTop: 10,
                    padding: '4px 10px',
                    background: '#ffffff',
                    border: '1px solid var(--border-black)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    color: 'var(--accent-blue)'
                  }}>
                    ℹ️ {scanResult.remaining} remaining admission(s) left on this pass for late arrivals.
                  </span>
                ) : (
                  <span style={{
                    display: 'inline-block',
                    marginTop: 10,
                    padding: '4px 10px',
                    background: '#ffffff',
                    border: '1px solid var(--border-black)',
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
                style={{ width: '100%', padding: '14px', fontSize: '0.88rem' }}
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
