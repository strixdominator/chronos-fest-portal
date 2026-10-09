'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  QrCode, 
  Download, 
  Search, 
  Check, 
  X, 
  Eye, 
  Settings, 
  Lock, 
  RefreshCw, 
  ShieldCheck, 
  AlertTriangle, 
  RotateCcw, 
  Upload, 
  KeyRound, 
  FileSpreadsheet, 
  ExternalLink,
  GraduationCap,
  Mail,
  Phone,
  Send,
  Sparkles,
  ArrowRight,
  Trash2
} from 'lucide-react';
import { Attendee, AttendeeStatus, EventSettings, AlumniRecord } from '@/lib/types';
import Link from 'next/link';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPasscode, setAdminPasscode] = useState('');
  const [authError, setAuthError] = useState('');

  // Main Section Toggle: Attendees Review vs Alumni Master Directory vs Live Gateways
  const [activeSection, setActiveSection] = useState<'ATTENDEES' | 'MASTER_DIRECTORY' | 'GATEWAYS'>('ATTENDEES');

  // Test notification state
  const [testTarget, setTestTarget] = useState('');
  const [testType, setTestType] = useState<'EMAIL' | 'PHONE'>('EMAIL');
  const [testingGate, setTestingGate] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [settings, setSettings] = useState<EventSettings | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    capacity: 1000,
    pending: 0,
    approved: 0,
    checkedIn: 0,
    rejected: 0,
    remainingAtGate: 0,
  });

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'CHECKED_IN' | 'REJECTED'>('PENDING');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Delete & Re-registration state
  const [deletingAttendee, setDeletingAttendee] = useState<Attendee | null>(null);
  const [showResetAllModal, setShowResetAllModal] = useState(false);


  // Alumni Master state
  const [alumniList, setAlumniList] = useState<AlumniRecord[]>([]);
  const [alumniSearch, setAlumniSearch] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Selected ID / Degree Proof modal
  const [viewingProof, setViewingProof] = useState<{
    name: string;
    url: string;
    roll: string;
    reason?: string;
    familyCount?: number;
    familyMembers?: Array<{ name: string; relation: string; age?: string }>;
  } | null>(null);

  // Rejection modal
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('USN details could not be verified with university records.');

  // Settings modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsForm, setSettingsForm] = useState<Partial<EventSettings>>({});

  const fetchAttendees = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (statusFilter !== 'ALL') queryParams.set('status', statusFilter);
      if (search) queryParams.set('search', search);

      const res = await fetch(`/api/attendees?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setAttendees(data.attendees);
        setStats(data.stats);
        setSettings(data.settings);
        setSettingsForm(data.settings);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlumniMaster = async () => {
    try {
      const res = await fetch('/api/alumni/master');
      const data = await res.json();
      if (data.success) {
        setAlumniList(data.alumni);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      if (activeSection === 'ATTENDEES') {
        fetchAttendees();
      } else {
        fetchAlumniMaster();
      }
    }
  }, [isAuthenticated, activeSection, statusFilter, search]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPasscode === 'admin123' || adminPasscode === 'lead2026' || adminPasscode === 'admin') {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Access Denied: Incorrect administrator passcode.');
    }
  };

  // Status update
  const handleUpdateStatus = async (id: string, status: AttendeeStatus, reason?: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/attendees/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, rejectionReason: reason }),
      });
      const data = await res.json();
      if (data.success) {
        fetchAttendees();
        if (rejectingId) setRejectingId(null);
      } else {
        alert(data.error || 'Failed to update');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  // Reset check-in
  const handleResetCheckIn = async (id: string) => {
    if (!confirm('Are you sure you want to reset this check-in? The wristband will be marked as unissued.')) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/attendees/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESET_CHECKIN' }),
      });
      const data = await res.json();
      if (data.success) {
        fetchAttendees();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  // Bulk Approve
  const handleBulkApprove = async () => {
    const pendingCount = stats.pending;
    if (pendingCount === 0) {
      alert('No pending applications in queue!');
      return;
    }
    if (!confirm(`Are you sure you want to approve ALL ${pendingCount} pending applications? This will generate their QR passes immediately.`)) return;

    setActionLoading('bulk');
    try {
      const res = await fetch('/api/attendees/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Success! ${data.approvedCount} attendee(s) approved.`);
        fetchAttendees();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  // Delete Single Pass & Allow Re-registration
  const handleDeleteAttendee = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/attendees/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setDeletingAttendee(null);
        fetchAttendees();
        alert(data.message || 'Pass deleted. Alumnus can now register again.');
      } else {
        alert(data.error || 'Failed to delete pass.');
      }
    } catch (e: any) {
      alert('Error deleting pass: ' + e.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Bulk Purge All Passes & Allow Everyone to Re-register
  const handleResetAllAttendees = async () => {
    setActionLoading('resetAll');
    try {
      const res = await fetch('/api/attendees', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetAll: true }),
      });
      const data = await res.json();
      if (data.success) {
        setShowResetAllModal(false);
        fetchAttendees();
        alert(data.message || 'All passes have been deleted. Alumni can now register again.');
      } else {
        alert(data.error || 'Failed to reset passes.');
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setActionLoading(null);
    }
  };


  // Import Excel (.xlsx, .xls) or CSV file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setImportStatus(`Reading and normalizing "${file.name}"...`);
      const res = await fetch('/api/alumni/master', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setImportStatus(data.message || `Successfully imported records!`);
        fetchAlumniMaster();
        setTimeout(() => {
          setShowImportModal(false);
          setImportStatus(null);
        }, 1500);
      } else {
        alert(data.error || 'Failed to import Excel file.');
        setImportStatus(null);
      }
    } catch (err: any) {
      alert('Upload error: ' + err.message);
      setImportStatus(null);
    }
  };

  // Import CSV text
  const handleImportCsv = async () => {
    if (!csvText.trim()) return;
    try {
      const lines = csvText.trim().split('\n');
      const records: AlumniRecord[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(',').map(c => c.trim());
        if (cols.length >= 2) {
          records.push({
            usn: cols[0].toUpperCase(),
            fullName: cols[1],
            officialEmail: cols[2] || '',
            phone: cols[3] || '',
            department: cols[4] || 'Engineering',
            batchYear: cols[5] || 'Batch of 2024',
          });
        }
      }

      if (records.length === 0) {
        alert('No valid records found in pasted CSV.');
        return;
      }

      const res = await fetch('/api/alumni/master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records }),
      });
      const data = await res.json();

      if (data.success) {
        alert(data.message || `Successfully imported ${records.length} records.`);
        setShowImportModal(false);
        setCsvText('');
        fetchAlumniMaster();
      } else {
        alert(data.error || 'Failed to import records.');
      }
    } catch (err: any) {
      alert('CSV processing error: ' + err.message);
    }
  };

  // Update Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsForm),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        setShowSettingsModal(false);
        alert('Event settings updated successfully.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredAlumni = alumniList.filter(a => {
    if (!alumniSearch.trim()) return true;
    const q = alumniSearch.toLowerCase();
    return (
      a.usn.toLowerCase().includes(q) ||
      a.fullName.toLowerCase().includes(q) ||
      a.department.toLowerCase().includes(q) ||
      a.officialEmail.toLowerCase().includes(q) ||
      a.phone.includes(q)
    );
  });

  const handleTestNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testTarget.trim()) return;
    setTestingGate(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/test-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: testType, target: testTarget.trim() }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTestingGate(false);
    }
  };

  // 1. LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div style={{ background: 'var(--bg-page)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div className="neo-box" style={{ maxWidth: 440, width: '100%', background: '#ffffff', boxShadow: '6px 6px 0px 0px var(--border-black)' }}>
          {/* Header */}
          <div style={{ padding: '24px 28px', background: 'var(--bg-black)', color: '#ffffff', borderBottom: '1px solid var(--border-black)' }}>
            <span className="mono-tag" style={{ color: 'var(--card-blue-2)' }}>COMMAND AUTHORIZATION</span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 900, marginTop: 4 }}>
              MILAN 2026 • ADMIN
            </h2>
          </div>

          <div style={{ padding: '28px' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
              Enter administrator passcode to access review queues, graduate directory, and gate systems.
            </p>

            {authError && (
              <div style={{ padding: '10px 14px', background: '#fee2e2', border: '1px solid var(--border-black)', color: '#991b1b', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: 16 }}>
                {authError}
              </div>
            )}

            <form onSubmit={handleAuth}>
              <div style={{ marginBottom: 16 }}>
                <label className="mono-label" style={{ display: 'block', marginBottom: 6 }}>
                  ADMIN PASSCODE
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter Passcode"
                  className="neo-input"
                  value={adminPasscode}
                  onChange={e => setAdminPasscode(e.target.value)}
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="btn-neo-black"
                style={{ width: '100%', padding: '14px' }}
              >
                SIGN IN TO COMMAND CENTER ↗
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // 2. AUTHENTICATED COMMAND CENTER DASHBOARD
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
            MILAN 2026 ORGANIZER APPLICATIONS
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Link
            href="/"
            target="_blank"
            className="btn-neo-outline"
            style={{ padding: '8px 14px', fontSize: '0.75rem' }}
          >
            1. ALUMNI PASS PORTAL ↗
          </Link>
          <Link
            href="/scanner"
            target="_blank"
            className="btn-neo-outline"
            style={{ padding: '8px 14px', fontSize: '0.75rem' }}
          >
            2. GATE SCANNER ↗
          </Link>
          <span
            className="btn-neo-black"
            style={{ padding: '8px 14px', fontSize: '0.75rem', cursor: 'default' }}
          >
            3. ADMIN CENTER (ACTIVE)
          </span>
        </div>
      </div>

      {/* TOP COMMAND HEADER */}
      <div style={{
        padding: '32px 32px 24px',
        borderBottom: '1px solid var(--border-black)',
        background: 'var(--bg-blue-tint)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        gap: 20
      }}>
        <div>
          <div className="mono-tag">MILAN 2026 • DBIT ALUMNI NETWORK</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 3.5vw, 2.8rem)', fontWeight: 900, textTransform: 'uppercase', marginTop: 4 }}>
            Organizer Command Center
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            {settings?.eventName || "MILAN 2026"} · {alumniList.length} Verified Master Alumni Records on File
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="btn-neo-outline"
            style={{ padding: '10px 18px', fontSize: '0.78rem' }}
          >
            <Settings size={14} />
            EVENT SETTINGS ↗
          </button>
          <a
            href="/api/export"
            download
            className="btn-neo-outline"
            style={{ padding: '10px 18px', fontSize: '0.78rem' }}
          >
            <Download size={14} />
            EXPORT CSV ↗
          </a>
          <button
            onClick={fetchAttendees}
            className="btn-neo-black"
            style={{ padding: '10px 18px', fontSize: '0.78rem' }}
          >
            <RefreshCw size={14} />
            SYNC ↗
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
          <span className="mono-label">TOTAL PASSES CLAIMED</span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 900, margin: '8px 0 2px' }}>
            {stats.total} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ {stats.capacity}</span>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            {Math.round((stats.total / (stats.capacity || 1000)) * 100)}% capacity
          </span>
        </div>

        <div className="neo-stat-card" style={{ borderRight: '1px solid var(--border-black)', borderBottom: 'none', background: stats.pending > 0 ? '#fef3c7' : '#ffffff' }}>
          <span className="mono-label" style={{ color: stats.pending > 0 ? '#78350f' : undefined }}>NEEDS MANUAL REVIEW</span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 900, margin: '8px 0 2px', color: stats.pending > 0 ? '#b45309' : undefined }}>
            {stats.pending}
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            Contact change requests
          </span>
        </div>

        <div className="neo-stat-card" style={{ borderRight: '1px solid var(--border-black)', borderBottom: 'none' }}>
          <span className="mono-label">OTP VERIFIED PASSES</span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 900, margin: '8px 0 2px', color: 'var(--accent-blue)' }}>
            {stats.approved}
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            Active QR passes issued
          </span>
        </div>

        <div className="neo-stat-card" style={{ borderRight: '1px solid var(--border-black)', borderBottom: 'none' }}>
          <span className="mono-label">ADMITTED AT GATE</span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 900, margin: '8px 0 2px', color: '#0e8a5a' }}>
            {stats.checkedIn}
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            {stats.remainingAtGate} yet to arrive
          </span>
        </div>

        <div className="neo-stat-card" style={{ borderBottom: 'none' }}>
          <span className="mono-label">DENIED / REJECTED</span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 900, margin: '8px 0 2px', color: '#dc2626' }}>
            {stats.rejected}
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            Flagged unverified
          </span>
        </div>
      </div>

      {/* MAIN SECTIONS TAB STRIP */}
      <div style={{ padding: '24px 32px 0' }}>
        <div className="neo-tabs-header" style={{ border: '1px solid var(--border-black)', borderBottom: 'none' }}>
          <button
            onClick={() => setActiveSection('ATTENDEES')}
            className={`neo-tab-btn ${activeSection === 'ATTENDEES' ? 'active' : ''}`}
          >
            01 • ATTENDEES QUEUE & PASSES
          </button>
          <button
            onClick={() => setActiveSection('MASTER_DIRECTORY')}
            className={`neo-tab-btn ${activeSection === 'MASTER_DIRECTORY' ? 'active' : ''}`}
          >
            02 • ALUMNI MASTER DIRECTORY ({alumniList.length})
          </button>
          <button
            onClick={() => setActiveSection('GATEWAYS')}
            className={`neo-tab-btn ${activeSection === 'GATEWAYS' ? 'active' : ''}`}
          >
            03 • NOTIFICATION & OTP GATEWAYS
          </button>
        </div>
      </div>

      <div style={{ padding: '0 32px' }}>
        {/* SECTION 1: ATTENDEES & MANUAL REVIEW */}
        {activeSection === 'ATTENDEES' && (
          <div className="neo-box" style={{ borderTop: 'none', background: '#ffffff', padding: '24px' }}>
            {/* Filter controls strip */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 14,
              marginBottom: 20,
              paddingBottom: 20,
              borderBottom: '1px solid var(--border-black)'
            }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button
                  onClick={() => setStatusFilter('PENDING')}
                  className={statusFilter === 'PENDING' ? 'btn-neo-black' : 'btn-neo-outline'}
                  style={{ padding: '8px 14px', fontSize: '0.76rem' }}
                >
                  NEEDS REVIEW ({stats.pending})
                </button>
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={statusFilter === 'ALL' ? 'btn-neo-black' : 'btn-neo-outline'}
                  style={{ padding: '8px 14px', fontSize: '0.76rem' }}
                >
                  ALL ({stats.total})
                </button>
                <button
                  onClick={() => setStatusFilter('APPROVED')}
                  className={statusFilter === 'APPROVED' ? 'btn-neo-black' : 'btn-neo-outline'}
                  style={{ padding: '8px 14px', fontSize: '0.76rem' }}
                >
                  APPROVED ({stats.approved})
                </button>
                <button
                  onClick={() => setStatusFilter('CHECKED_IN')}
                  className={statusFilter === 'CHECKED_IN' ? 'btn-neo-black' : 'btn-neo-outline'}
                  style={{ padding: '8px 14px', fontSize: '0.76rem' }}
                >
                  CHECKED IN ({stats.checkedIn})
                </button>
                <button
                  onClick={() => setStatusFilter('REJECTED')}
                  className={statusFilter === 'REJECTED' ? 'btn-neo-black' : 'btn-neo-outline'}
                  style={{ padding: '8px 14px', fontSize: '0.76rem' }}
                >
                  DENIED ({stats.rejected})
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 280, flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="SEARCH USN, NAME, EMAIL..."
                  className="neo-input"
                  style={{ padding: '10px 14px', fontSize: '0.82rem', flex: 1, minWidth: 180 }}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {statusFilter === 'PENDING' && stats.pending > 0 && (
                  <button
                    onClick={handleBulkApprove}
                    disabled={actionLoading === 'bulk'}
                    className="btn-neo-black"
                    style={{ whiteSpace: 'nowrap', padding: '10px 16px', fontSize: '0.76rem', background: '#0e8a5a' }}
                  >
                    APPROVE ALL PENDING ({stats.pending}) ↗
                  </button>
                )}
                {stats.total > 0 && (
                  <button
                    onClick={() => setShowResetAllModal(true)}
                    className="btn-neo-outline"
                    style={{ whiteSpace: 'nowrap', padding: '10px 14px', fontSize: '0.76rem', color: '#dc2626', borderColor: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    title="Delete all registered passes and allow everyone to re-register"
                  >
                    <Trash2 size={13} />
                    RESET ALL PASSES ({stats.total}) ↗
                  </button>
                )}
              </div>

            </div>

            {/* Attendees Data Table */}
            <div style={{ overflowX: 'auto' }}>
              <table className="neo-table">
                <thead>
                  <tr>
                    <th>GRADUATE NAME & PASS ID</th>
                    <th>USN</th>
                    <th>DEPT & BATCH</th>
                    <th>CONTACT & VERIFICATION</th>
                    <th>QUOTA</th>
                    <th>STATUS</th>
                    <th>REVIEW NOTE / PROOF</th>
                    <th style={{ textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {attendees.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        NO PASSES MATCH THE SELECTED FILTER CRITERIA.
                      </td>
                    </tr>
                  ) : (
                    attendees.map(attendee => (
                      <tr key={attendee.id}>
                        <td>
                          <div>
                            <strong style={{ fontSize: '0.95rem' }}>{attendee.fullName}</strong>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                              {attendee.id} · {attendee.ticketCode}
                            </div>
                          </div>
                        </td>

                        <td>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.88rem', background: 'var(--card-blue-1)', padding: '2px 8px', border: '1px solid var(--border-black)' }}>
                            {attendee.usn || attendee.rollNumber}
                          </span>
                        </td>

                        <td>
                          <div style={{ fontWeight: 600 }}>{attendee.department}</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{attendee.year}</div>
                        </td>

                        <td>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{attendee.email}</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{attendee.phone}</div>
                          {attendee.verificationMethod === 'OTP_VERIFIED' ? (
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: '#0e8a5a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                              ✓ OTP VERIFIED
                            </span>
                          ) : attendee.isContactUpdated ? (
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: '#b45309', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                              ⚠️ CONTACT UPDATED
                            </span>
                          ) : null}
                        </td>

                        <td>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 800 }}>
                            {attendee.totalQuota || 1} {attendee.totalQuota && attendee.totalQuota > 1 ? 'PERSONS' : 'PERSON'}
                          </span>
                          {attendee.familyMembers && attendee.familyMembers.length > 0 && (
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                              +{attendee.familyMembers.length} guests
                            </div>
                          )}
                        </td>

                        <td>
                          {attendee.status === 'APPROVED' && !attendee.checkedIn && (!attendee.admittedCount || attendee.admittedCount === 0) && (
                            <span className="neo-badge neo-badge-approved">APPROVED</span>
                          )}
                          {attendee.status === 'APPROVED' && !attendee.checkedIn && attendee.admittedCount && attendee.admittedCount > 0 && (
                            <span className="neo-badge" style={{ background: 'var(--card-blue-2)', color: '#0f2b5c' }}>
                              PARTIAL ({attendee.admittedCount}/{attendee.totalQuota || 1})
                            </span>
                          )}
                          {attendee.status === 'APPROVED' && attendee.checkedIn && (
                            <span className="neo-badge neo-badge-checkedin">ADMITTED</span>
                          )}
                          {attendee.status === 'PENDING' && (
                            <span className="neo-badge neo-badge-pending">NEEDS REVIEW</span>
                          )}
                          {attendee.status === 'REJECTED' && (
                            <span className="neo-badge neo-badge-rejected">DENIED</span>
                          )}
                          {attendee.checkedInAt && (
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                              At {new Date(attendee.checkedInAt).toLocaleTimeString()}
                            </div>
                          )}
                        </td>

                        <td>
                          {attendee.reviewReason ? (
                            <div style={{ maxWidth: 200 }}>
                              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', color: '#b45309' }}>
                                {attendee.reviewReason}
                              </p>
                              {attendee.degreeProofUrl && (
                                <button
                                  onClick={() => setViewingProof({
                                    name: attendee.fullName,
                                    url: attendee.degreeProofUrl!,
                                    roll: attendee.usn || attendee.rollNumber,
                                    reason: attendee.reviewReason,
                                    familyCount: attendee.familyCount,
                                    familyMembers: attendee.familyMembers,
                                  })}
                                  className="btn-neo-outline"
                                  style={{ padding: '3px 8px', fontSize: '0.7rem', marginTop: 4 }}
                                >
                                  VIEW PROOF ↗
                                </button>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                              DIRECTORY MATCH
                            </span>
                          )}
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <Link
                              href={`/ticket/${attendee.id}`}
                              target="_blank"
                              className="btn-neo-outline"
                              style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                              title="View Boarding Pass"
                            >
                              PASS ↗
                            </Link>

                            {attendee.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => handleUpdateStatus(attendee.id, 'APPROVED')}
                                  disabled={actionLoading === attendee.id}
                                  className="btn-neo-black"
                                  style={{ padding: '6px 12px', fontSize: '0.75rem', background: '#0e8a5a' }}
                                >
                                  APPROVE ↗
                                </button>
                                <button
                                  onClick={() => setRejectingId(attendee.id)}
                                  disabled={actionLoading === attendee.id}
                                  className="btn-neo-outline"
                                  style={{ padding: '6px 12px', fontSize: '0.75rem', color: '#dc2626' }}
                                >
                                  DENY ↗
                                </button>
                              </>
                            )}

                            {attendee.status === 'APPROVED' && (
                              <button
                                onClick={() => setRejectingId(attendee.id)}
                                className="btn-neo-outline"
                                style={{ padding: '6px 10px', fontSize: '0.75rem', color: '#dc2626' }}
                                title="Revoke Pass"
                              >
                                REVOKE ↗
                              </button>
                            )}

                            {attendee.checkedIn && (
                              <button
                                onClick={() => handleResetCheckIn(attendee.id)}
                                className="btn-neo-outline"
                                style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                                title="Reset Check-in (Gate Mistake)"
                              >
                                RESET ↗
                              </button>
                            )}

                            <button
                              onClick={() => setDeletingAttendee(attendee)}
                              className="btn-neo-outline"
                              style={{ padding: '6px 10px', fontSize: '0.75rem', color: '#dc2626', borderColor: '#fca5a5' }}
                              title="Delete Pass & Unlock Re-registration for this USN"
                            >
                              <Trash2 size={12} />
                              DELETE ↗
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECTION 2: ALUMNI MASTER DIRECTORY */}
        {activeSection === 'MASTER_DIRECTORY' && (
          <div className="neo-box" style={{ borderTop: 'none', background: '#ffffff', padding: '24px' }}>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 14,
              marginBottom: 20,
              paddingBottom: 20,
              borderBottom: '1px solid var(--border-black)'
            }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 900 }}>
                  COLLEGE ALUMNI MASTER DIRECTORY ({alumniList.length} RECORDS)
                </h3>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  Pre-approved graduate database. Only USNs listed here can claim a digital pass or request OTP.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="text"
                  placeholder="SEARCH MASTER USN OR NAME..."
                  className="neo-input"
                  style={{ width: 260, padding: '10px 14px', fontSize: '0.82rem' }}
                  value={alumniSearch}
                  onChange={e => setAlumniSearch(e.target.value)}
                />
                <button
                  onClick={() => setShowImportModal(true)}
                  className="btn-neo-black"
                  style={{ fontSize: '0.78rem', padding: '10px 18px', whiteSpace: 'nowrap' }}
                >
                  IMPORT EXCEL / CSV ↗
                </button>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="neo-table">
                <thead>
                  <tr>
                    <th>USN</th>
                    <th>GRADUATE FULL NAME</th>
                    <th>DEPARTMENT</th>
                    <th>BATCH</th>
                    <th>OFFICIAL EMAIL</th>
                    <th>MOBILE NUMBER</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAlumni.map((alumnus, idx) => (
                    <tr key={idx}>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.88rem', background: 'var(--card-blue-1)', padding: '2px 8px', border: '1px solid var(--border-black)' }}>
                          {alumnus.usn}
                        </span>
                      </td>
                      <td><strong>{alumnus.fullName}</strong></td>
                      <td>{alumnus.department}</td>
                      <td><span className="neo-badge neo-badge-approved">{alumnus.batchYear}</span></td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{alumnus.officialEmail}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{alumnus.phone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECTION 3: REAL OTP & GATEWAYS LIVE TESTING */}
        {activeSection === 'GATEWAYS' && (
          <div className="neo-box" style={{ borderTop: 'none', background: '#ffffff', padding: '28px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24 }}>
              {/* Card 1: Dispatch Tester */}
              <div className="neo-box" style={{ padding: 24, background: 'var(--bg-blue-tint)' }}>
                <span className="mono-tag" style={{ color: 'var(--accent-blue)' }}>TEST DISPATCH</span>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 900, margin: '6px 0 2px' }}>
                  Live OTP Dispatch Tester
                </h3>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
                  Send a live test verification code to verify your configured SMTP email or SMS gateways.
                </p>

                <form onSubmit={handleTestNotification}>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                    <button
                      type="button"
                      onClick={() => setTestType('EMAIL')}
                      className={testType === 'EMAIL' ? 'btn-neo-black' : 'btn-neo-outline'}
                      style={{ flex: 1, padding: '10px' }}
                    >
                      TEST EMAIL OTP ↗
                    </button>
                    <button
                      type="button"
                      onClick={() => setTestType('PHONE')}
                      className={testType === 'PHONE' ? 'btn-neo-black' : 'btn-neo-outline'}
                      style={{ flex: 1, padding: '10px' }}
                    >
                      TEST SMS OTP ↗
                    </button>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label className="mono-label" style={{ display: 'block', marginBottom: 6 }}>
                      {testType === 'EMAIL' ? 'TEST RECIPIENT EMAIL' : '10-DIGIT MOBILE NUMBER (+91)'}
                    </label>
                    <input
                      type={testType === 'EMAIL' ? 'email' : 'tel'}
                      required
                      placeholder={testType === 'EMAIL' ? 'e.g. name@gmail.com' : 'e.g. 9876543210'}
                      className="neo-input"
                      value={testTarget}
                      onChange={e => setTestTarget(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={testingGate}
                    className="btn-neo-black"
                    style={{ width: '100%', padding: '14px' }}
                  >
                    {testingGate ? 'DISPATCHING...' : `DISPATCH TEST ${testType === 'EMAIL' ? 'EMAIL' : 'SMS'} NOW ↗`}
                  </button>
                </form>

                {testResult && (
                  <div style={{
                    marginTop: 18,
                    padding: '16px',
                    border: '1px solid var(--border-black)',
                    background: testResult.isReal ? 'var(--card-blue-1)' : '#ffffff',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8rem'
                  }}>
                    <div style={{ fontWeight: 800, marginBottom: 4, color: testResult.isReal ? '#0f2b5c' : 'var(--text-main)' }}>
                      {testResult.isReal ? '✓ REAL DELIVERY SUCCESS' : 'ℹ️ SIMULATION OUTPUT'}
                    </div>
                    <div>{testResult.message}</div>
                    {testResult.testOtp && (
                      <div style={{ marginTop: 6 }}>Code: <strong>{testResult.testOtp}</strong> · Provider: {testResult.provider || testResult.deliveryProvider}</div>
                    )}
                    {testResult.error && (
                      <div style={{ color: '#dc2626', marginTop: 6 }}>{testResult.error}</div>
                    )}
                  </div>
                )}
              </div>

              {/* Card 2: Configuration Instructions */}
              <div className="neo-box" style={{ padding: 24, background: '#ffffff' }}>
                <span className="mono-tag" style={{ color: 'var(--accent-blue)' }}>CREDENTIALS GUIDE</span>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 900, margin: '6px 0 2px' }}>
                  Gmail SMTP Configuration
                </h3>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                  How to link free real Gmail delivery in <code>.env.local</code>:
                </p>

                <ol style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', lineHeight: 1.8, paddingLeft: 18, color: 'var(--text-main)' }}>
                  <li>Open Google Account: <strong>Security Settings</strong></li>
                  <li>Ensure <strong>2-Step Verification</strong> is ON.</li>
                  <li>Go to <strong>App Passwords</strong> and create one for <strong>MilanFest</strong>.</li>
                  <li>Copy the 16-character generated password.</li>
                  <li>Save in <code>.env.local</code>:</li>
                </ol>

                <div style={{ background: 'var(--bg-black)', color: '#ffffff', padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', marginTop: 12, border: '1px solid var(--border-black)' }}>
                  GMAIL_USER=yourfest@gmail.com<br />
                  GMAIL_APP_PASSWORD=abcdefghijklmnop
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: IMPORT CSV / EXCEL */}
      {showImportModal && (
        <div className="neo-modal-backdrop" onClick={() => setShowImportModal(false)}>
          <div className="neo-modal" onClick={e => e.stopPropagation()}>
            <div className="neo-modal-header">
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 700 }}>IMPORT ALUMNI DATABASE</span>
              <button onClick={() => setShowImportModal(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{
                border: '2px dashed var(--border-black)',
                padding: '24px',
                textAlign: 'center',
                background: 'var(--bg-blue-tint)',
                marginBottom: 16,
                cursor: 'pointer'
              }}>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  id="excel-file-input"
                />
                <label htmlFor="excel-file-input" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <Upload size={28} color="var(--accent-blue)" />
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 800 }}>
                    Click to Upload Excel / CSV (.xlsx, .xls, .csv)
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Auto-maps USN, Name, Email, Phone, Department & Batch
                  </span>
                </label>
              </div>

              <div style={{ textAlign: 'center', margin: '14px 0', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                — OR PASTE RAW CSV ROWS BELOW —
              </div>

              <textarea
                rows={6}
                className="neo-input"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', resize: 'vertical' }}
                placeholder={`1MS20CS099, John Doe, john.doe@gmail.com, +91 98765 11223, Computer Science, Batch of 2024`}
                value={csvText}
                onChange={e => setCsvText(e.target.value)}
              />

              {importStatus && (
                <div style={{ color: '#0e8a5a', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', marginTop: 10, fontWeight: 700 }}>
                  {importStatus}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button onClick={() => setShowImportModal(false)} className="btn-neo-outline" style={{ flex: 1 }}>
                  CANCEL
                </button>
                <button onClick={handleImportCsv} className="btn-neo-black" style={{ flex: 1 }}>
                  PROCESS & SAVE ↗
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: VIEW PROOF DOCUMENT */}
      {viewingProof && (
        <div className="neo-modal-backdrop" onClick={() => setViewingProof(null)}>
          <div className="neo-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="neo-modal-header">
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 700 }}>DEGREE / ID PROOF</div>
                <div style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>{viewingProof.name} ({viewingProof.roll})</div>
              </div>
              <button onClick={() => setViewingProof(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              {viewingProof.reason && (
                <div style={{ padding: '10px 14px', background: 'var(--bg-blue-tint)', border: '1px solid var(--border-black)', marginBottom: 14, fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                  Note: {viewingProof.reason}
                </div>
              )}

              {viewingProof.familyMembers && viewingProof.familyMembers.length > 0 && (
                <div style={{ padding: '12px 14px', background: 'var(--card-blue-1)', border: '1px solid var(--border-black)', marginBottom: 14 }}>
                  <div className="mono-label" style={{ fontSize: '0.68rem', marginBottom: 6 }}>
                    REQUESTED FAMILY GUESTS ({viewingProof.familyMembers.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {viewingProof.familyMembers.map((guest, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', background: '#fff', padding: '6px 10px', border: '1px solid var(--border-black)' }}>
                        <span style={{ fontWeight: 800 }}>#{idx + 1} {guest.name}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{guest.relation}{guest.age ? ` · ${guest.age} yrs` : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ border: '1px solid var(--border-black)', background: '#000', textAlign: 'center' }}>
                <img
                  src={viewingProof.url}
                  alt="Proof Document"
                  style={{ width: '100%', maxHeight: 440, objectFit: 'contain', display: 'block' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: REJECT PASS */}
      {rejectingId && (
        <div className="neo-modal-backdrop" onClick={() => setRejectingId(null)}>
          <div className="neo-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="neo-modal-header">
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 700 }}>REJECT REGISTRATION</span>
              <button onClick={() => setRejectingId(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
                Provide a reason for rejection. The graduate will see this reason when checking their pass status.
              </p>

              <div style={{ marginBottom: 16 }}>
                <label className="mono-label" style={{ display: 'block', marginBottom: 6 }}>REJECTION REASON</label>
                <textarea
                  rows={3}
                  className="neo-input"
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setRejectingId(null)} className="btn-neo-outline" style={{ flex: 1 }}>
                  CANCEL
                </button>
                <button
                  onClick={() => handleUpdateStatus(rejectingId, 'REJECTED', rejectionReason)}
                  className="btn-neo-black"
                  style={{ flex: 1, background: '#dc2626' }}
                >
                  CONFIRM REJECT ↗
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: EVENT SETTINGS */}
      {showSettingsModal && (
        <div className="neo-modal-backdrop" onClick={() => setShowSettingsModal(false)}>
          <div className="neo-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="neo-modal-header">
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 700 }}>EVENT SETTINGS</span>
              <button onClick={() => setShowSettingsModal(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} style={{ padding: '20px' }}>
              <div style={{ marginBottom: 12 }}>
                <label className="mono-label" style={{ display: 'block', marginBottom: 4 }}>EVENT NAME</label>
                <input
                  type="text"
                  required
                  className="neo-input"
                  value={settingsForm.eventName || ''}
                  onChange={e => setSettingsForm({ ...settingsForm, eventName: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label className="mono-label" style={{ display: 'block', marginBottom: 4 }}>VENUE</label>
                <input
                  type="text"
                  className="neo-input"
                  value={settingsForm.eventVenue || ''}
                  onChange={e => setSettingsForm({ ...settingsForm, eventVenue: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label className="mono-label" style={{ display: 'block', marginBottom: 4 }}>TOTAL VENUE CAPACITY</label>
                <input
                  type="number"
                  className="neo-input"
                  value={settingsForm.totalCapacity || 1000}
                  onChange={e => setSettingsForm({ ...settingsForm, totalCapacity: parseInt(e.target.value, 10) })}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="button" onClick={() => setShowSettingsModal(false)} className="btn-neo-outline" style={{ flex: 1 }}>
                  CANCEL
                </button>
                <button type="submit" className="btn-neo-black" style={{ flex: 1 }}>
                  SAVE SETTINGS ↗
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: DELETE SINGLE PASS & ALLOW RE-REGISTRATION */}
      {deletingAttendee && (
        <div className="neo-modal-backdrop" onClick={() => setDeletingAttendee(null)}>
          <div className="neo-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="neo-modal-header" style={{ background: '#991b1b' }}>
              <span className="mono-tag" style={{ color: '#fee2e2' }}>
                DELETE PASS & ALLOW RE-REGISTRATION
              </span>
              <button onClick={() => setDeletingAttendee(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ background: '#fee2e2', border: '1px solid #dc2626', padding: '16px', marginBottom: 20 }}>
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 900, color: '#991b1b' }}>
                  DELETE PASS FOR {deletingAttendee.fullName.toUpperCase()}?
                </h4>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: '#7f1d1d', marginTop: 4 }}>
                  USN: <strong>{deletingAttendee.usn || deletingAttendee.rollNumber}</strong> · Ticket: {deletingAttendee.ticketCode}
                </p>
              </div>

              <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
                <p style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: 6 }}>This action will immediately:</p>
                <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <li><strong>Invalidate QR code and pass</strong>: Any attempt to scan this pass at gates will be blocked.</li>
                  <li><strong>Unlock re-registration</strong>: The alumnus can go back to the portal, enter this USN, and claim a pass again fresh.</li>
                  <li><strong>Purge active sessions</strong>: Resets any active OTP tokens and sessions for this seat number.</li>
                </ul>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setDeletingAttendee(null)}
                  className="btn-neo-outline"
                  style={{ flex: 1, padding: '12px' }}
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteAttendee(deletingAttendee.id)}
                  disabled={actionLoading === deletingAttendee.id}
                  className="btn-neo-black"
                  style={{ flex: 2, background: '#dc2626', borderColor: '#991b1b', padding: '12px', fontSize: '0.8rem' }}
                >
                  {actionLoading === deletingAttendee.id ? 'DELETING...' : 'YES, DELETE & UNLOCK RE-REGISTER ↗'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: RESET ALL PASSES (DANGER ZONE) */}
      {showResetAllModal && (
        <div className="neo-modal-backdrop" onClick={() => setShowResetAllModal(false)}>
          <div className="neo-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="neo-modal-header" style={{ background: '#7f1d1d' }}>
              <span className="mono-tag" style={{ color: '#fee2e2' }}>
                DANGER ZONE · PURGE ALL REGISTERED PASSES
              </span>
              <button onClick={() => setShowResetAllModal(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ background: '#fee2e2', border: '2px solid #dc2626', padding: '16px', marginBottom: 20 }}>
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 900, color: '#991b1b' }}>
                  PURGE ALL {stats.total} REGISTERED PASSES?
                </h4>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: '#7f1d1d', marginTop: 6 }}>
                  This will permanently delete all claimed passes from the database and invalidate every issued QR code.
                </p>
              </div>

              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
                After this purge is executed, <strong>all alumni listed in the university master directory will be unlocked and permitted to register again</strong> from scratch.
              </p>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowResetAllModal(false)}
                  className="btn-neo-outline"
                  style={{ flex: 1, padding: '12px' }}
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleResetAllAttendees}
                  disabled={actionLoading === 'resetAll'}
                  className="btn-neo-black"
                  style={{ flex: 2, background: '#dc2626', borderColor: '#7f1d1d', padding: '12px', fontSize: '0.8rem' }}
                >
                  {actionLoading === 'resetAll' ? 'PURGING...' : 'YES, PURGE ALL & RESET RE-REGISTRATION ↗'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

