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
  Sparkles
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

  // Alumni Master state
  const [alumniList, setAlumniList] = useState<AlumniRecord[]>([]);
  const [alumniSearch, setAlumniSearch] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Selected ID / Degree Proof modal
  const [viewingProof, setViewingProof] = useState<{ name: string; url: string; roll: string; reason?: string } | null>(null);

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
        const parts = line.split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
        // Ignore header line if present
        if (i === 0 && (parts[0].toLowerCase().includes('usn') || parts[0].toLowerCase().includes('roll'))) {
          continue;
        }

        if (parts.length >= 2) {
          records.push({
            usn: parts[0],
            fullName: parts[1] || 'Graduate',
            officialEmail: parts[2] || '',
            phone: parts[3] || '',
            department: parts[4] || 'Engineering',
            batchYear: parts[5] || 'Batch of 2024',
          });
        }
      }

      if (records.length === 0) {
        alert('No valid records parsed from CSV text.');
        return;
      }

      const res = await fetch('/api/alumni/master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records }),
      });
      const data = await res.json();

      if (data.success) {
        setImportStatus(`Imported ${data.added} new graduates (${data.updated} updated). Total in directory: ${data.total}`);
        fetchAlumniMaster();
        setTimeout(() => {
          setShowImportModal(false);
          setImportStatus(null);
          setCsvText('');
        }, 1500);
      }
    } catch (e: any) {
      alert('Import error: ' + e.message);
    }
  };

  // Filtered alumni master
  const filteredAlumni = alumniList.filter(a => {
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

  if (!isAuthenticated) {
    return (
      <div style={{ maxWidth: 440, margin: '60px auto', padding: '0 20px' }}>
        <div className="glass-panel" style={{ padding: '36px', textAlign: 'center' }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(157, 78, 221, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <Lock size={28} color="#c084fc" />
          </div>

          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>
            Event Organizers Portal
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4, marginBottom: 20 }}>
            Enter Master Admin Passcode to review student registrations, inspect changed contact requests, or upload the alumni database.
          </p>

          {authError && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px',
              color: '#fca5a5',
              fontSize: '0.85rem',
              marginBottom: 16
            }}>
              {authError}
            </div>
          )}

          <form onSubmit={handleAuth}>
            <div className="form-group" style={{ textAlign: 'left' }}>
              <label className="form-label">Admin Passcode</label>
              <input
                type="password"
                placeholder="Enter Administrator Passcode"
                className="form-input"
                value={adminPasscode}
                onChange={e => setAdminPasscode(e.target.value)}
                autoFocus
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 16, padding: '12px' }}
            >
              Sign In to Command Center
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px 80px' }}>
      {/* 3-PORTAL QUICK ACCESS NAVIGATOR (ADMIN MASTER ACCESS) */}
      <div style={{
        background: 'rgba(14, 18, 30, 0.9)',
        border: '1px solid rgba(0, 242, 254, 0.25)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 18px',
        marginBottom: 20,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-sub)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ORGANIZER PORTAL HUB:
          </span>
          <span style={{ fontSize: '0.78rem', color: '#fff' }}>
            Switch between the 3 event applications
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <Link
            href="/"
            target="_blank"
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem', padding: '6px 14px' }}
          >
            <Users size={14} color="var(--accent-cyan)" />
            1. Alumni Registration Page
            <ExternalLink size={12} />
          </Link>

          <Link
            href="/scanner"
            target="_blank"
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem', padding: '6px 14px', border: '1px solid rgba(0, 242, 254, 0.4)' }}
          >
            <QrCode size={14} color="var(--accent-cyan)" />
            2. Gate Security Scanner
            <ExternalLink size={12} />
          </Link>

          <span
            className="btn btn-primary"
            style={{ fontSize: '0.82rem', padding: '6px 14px', cursor: 'default' }}
          >
            <ShieldCheck size={14} />
            3. Admin Portal (Active)
          </span>
        </div>
      </div>

      {/* Top Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>
              Organizer Command Center
            </h1>
            <span className="brand-badge">ADMIN</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {settings?.eventName} · {alumniList.length} Registered Master Alumni in Directory
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {/* Main Section Selector */}
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-sm)', padding: 3, display: 'flex' }}>
            <button
              onClick={() => setActiveSection('ATTENDEES')}
              className={`btn ${activeSection === 'ATTENDEES' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', fontSize: '0.82rem', border: 'none' }}
            >
              <ShieldCheck size={14} />
              Review Queue & Passes
            </button>
            <button
              onClick={() => setActiveSection('MASTER_DIRECTORY')}
              className={`btn ${activeSection === 'MASTER_DIRECTORY' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', fontSize: '0.82rem', border: 'none' }}
            >
              <FileSpreadsheet size={14} />
              Alumni Master Database
            </button>
            <button
              onClick={() => setActiveSection('GATEWAYS')}
              className={`btn ${activeSection === 'GATEWAYS' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', fontSize: '0.82rem', border: 'none' }}
            >
              <Mail size={14} />
              Real OTP & Gateways
            </button>
          </div>

          <a href="/api/export" download className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
            <Download size={16} />
            Export CSV
          </a>
          <button onClick={fetchAttendees} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* METRIC COUNTER CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '16px',
        marginBottom: 28
      }}>
        {/* Total Registrations */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-sub)', fontWeight: 600 }}>TOTAL PASSES CLAIMED</span>
            <Users size={18} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginTop: 8 }}>
            {stats.total} <span style={{ fontSize: '0.9rem', color: 'var(--text-sub)' }}>/ {stats.capacity}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {Math.round((stats.total / (stats.capacity || 1000)) * 100)}% of venue capacity filled
          </div>
        </div>

        {/* Pending Review Queue (Highlight) */}
        <div className="glass-panel" style={{
          padding: '20px',
          border: stats.pending > 0 ? '1px solid rgba(245, 158, 11, 0.4)' : undefined,
          background: stats.pending > 0 ? 'rgba(245, 158, 11, 0.08)' : undefined
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--status-pending)', fontWeight: 700 }}>NEEDS MANUAL REVIEW</span>
            <Clock size={18} color="var(--status-pending)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--status-pending)', marginTop: 8 }}>
            {stats.pending}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Alumni requesting contact updates
          </div>
        </div>

        {/* Approved Passes */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--status-approved)', fontWeight: 600 }}>OTP VERIFIED PASSES</span>
            <CheckCircle2 size={18} color="var(--status-approved)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--status-approved)', marginTop: 8 }}>
            {stats.approved}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Active QR codes issued
          </div>
        </div>

        {/* Checked In / Wristband Given */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>WRISTBANDS ISSUED</span>
            <QrCode size={18} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: 8 }}>
            {stats.checkedIn}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {stats.remainingAtGate} approved yet to scan at gate
          </div>
        </div>

        {/* Rejected / Denied */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--status-rejected)', fontWeight: 600 }}>DENIED</span>
            <XCircle size={18} color="var(--status-rejected)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--status-rejected)', marginTop: 8 }}>
            {stats.rejected}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Flagged unverified entries
          </div>
        </div>
      </div>

      {/* SECTION 1: ATTENDEES & MANUAL REVIEW QUEUE */}
      {activeSection === 'ATTENDEES' && (
        <>
          {/* FILTER TABS & SEARCH BAR */}
          <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: 20 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 14 }}>
              {/* Tabs */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button
                  onClick={() => setStatusFilter('PENDING')}
                  className={`btn ${statusFilter === 'PENDING' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.82rem', padding: '8px 14px' }}
                >
                  Needs Review ({stats.pending})
                </button>
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`btn ${statusFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.82rem', padding: '8px 14px' }}
                >
                  All Passes ({stats.total})
                </button>
                <button
                  onClick={() => setStatusFilter('APPROVED')}
                  className={`btn ${statusFilter === 'APPROVED' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.82rem', padding: '8px 14px' }}
                >
                  Approved ({stats.approved})
                </button>
                <button
                  onClick={() => setStatusFilter('CHECKED_IN')}
                  className={`btn ${statusFilter === 'CHECKED_IN' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.82rem', padding: '8px 14px' }}
                >
                  Checked In ({stats.checkedIn})
                </button>
                <button
                  onClick={() => setStatusFilter('REJECTED')}
                  className={`btn ${statusFilter === 'REJECTED' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.82rem', padding: '8px 14px' }}
                >
                  Rejected ({stats.rejected})
                </button>
              </div>

              {/* Search Input */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 260 }}>
                <input
                  type="text"
                  placeholder="Search USN, Name, Dept..."
                  className="form-input"
                  style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {statusFilter === 'PENDING' && stats.pending > 0 && (
                  <button
                    onClick={handleBulkApprove}
                    disabled={actionLoading === 'bulk'}
                    className="btn btn-success"
                    style={{ fontSize: '0.82rem', padding: '8px 14px', whiteSpace: 'nowrap' }}
                  >
                    <Check size={14} />
                    Approve All Pending ({stats.pending})
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ATTENDEE TABLE */}
          <div className="glass-panel" style={{ overflow: 'hidden' }}>
            <div className="data-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Graduate Name & Pass ID</th>
                    <th>USN</th>
                    <th>Dept & Batch</th>
                    <th>Contact & Verification</th>
                    <th>Status</th>
                    <th>Review Reason / Proof</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {attendees.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        No passes match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    attendees.map(attendee => (
                      <tr key={attendee.id}>
                        <td>
                          <div>
                            <strong style={{ color: '#fff', fontSize: '0.95rem' }}>{attendee.fullName}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-sub)', fontFamily: 'monospace' }}>
                              {attendee.id} · {attendee.ticketCode}
                            </div>
                            {attendee.totalQuota && attendee.totalQuota > 1 && (
                              <div style={{ marginTop: 4 }}>
                                <span style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  color: 'var(--accent-cyan)',
                                  background: 'rgba(0, 242, 254, 0.1)',
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  border: '1px solid rgba(0, 242, 254, 0.25)'
                                }}>
                                  👨‍👩‍👧 Group Pass ({attendee.totalQuota} Total)
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        <td>
                          <span style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            color: 'var(--accent-cyan)',
                            background: 'rgba(0, 242, 254, 0.08)',
                            padding: '3px 8px',
                            borderRadius: 4
                          }}>
                            {attendee.usn || attendee.rollNumber}
                          </span>
                        </td>

                        <td>
                          <div style={{ fontSize: '0.85rem', color: '#fff' }}>{attendee.department}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>{attendee.year}</div>
                        </td>

                        <td>
                          <div>
                            <div style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>{attendee.email}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>{attendee.phone}</div>
                            {attendee.verificationMethod === 'OTP_VERIFIED' ? (
                              <span style={{ fontSize: '0.7rem', color: 'var(--status-approved)', display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                                <KeyRound size={11} />
                                OTP Verified
                              </span>
                            ) : attendee.isContactUpdated ? (
                              <span style={{ fontSize: '0.7rem', color: 'var(--status-pending)', display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                                <AlertTriangle size={11} />
                                Contact Changed
                              </span>
                            ) : null}
                          </div>
                        </td>

                        <td>
                          <div>
                            {attendee.status === 'APPROVED' && !attendee.checkedIn && (!attendee.admittedCount || attendee.admittedCount === 0) && (
                              <span className="badge badge-approved">Approved</span>
                            )}
                            {attendee.status === 'APPROVED' && !attendee.checkedIn && attendee.admittedCount && attendee.admittedCount > 0 && (
                              <span className="badge badge-approved" style={{ background: 'rgba(0, 242, 254, 0.15)', color: 'var(--accent-cyan)' }}>
                                Partial ({attendee.admittedCount}/{attendee.totalQuota || 1})
                              </span>
                            )}
                            {attendee.status === 'APPROVED' && attendee.checkedIn && (
                              <span className="badge badge-checkedin">
                                {attendee.totalQuota && attendee.totalQuota > 1 ? `All ${attendee.totalQuota} Admitted` : 'Wristband Given'}
                              </span>
                            )}
                            {attendee.status === 'PENDING' && (
                              <span className="badge badge-pending">Needs Review</span>
                            )}
                            {attendee.status === 'REJECTED' && (
                              <span className="badge badge-rejected">Rejected</span>
                            )}
                            {attendee.checkedInAt && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-sub)', marginTop: 3 }}>
                                Scanned {new Date(attendee.checkedInAt).toLocaleTimeString()}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Review Reason & Proof */}
                        <td>
                          {attendee.reviewReason ? (
                            <div style={{ maxWidth: 220 }}>
                              <p style={{ fontSize: '0.75rem', color: '#fef3c7', lineHeight: 1.3 }}>
                                {attendee.reviewReason}
                              </p>
                              {attendee.degreeProofUrl && (
                                <button
                                  onClick={() => setViewingProof({
                                    name: attendee.fullName,
                                    url: attendee.degreeProofUrl!,
                                    roll: attendee.usn || attendee.rollNumber,
                                    reason: attendee.reviewReason
                                  })}
                                  className="btn btn-secondary"
                                  style={{ padding: '3px 8px', fontSize: '0.72rem', marginTop: 4 }}
                                >
                                  <Eye size={11} />
                                  View Proof
                                </button>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>Verified via DB</span>
                          )}
                        </td>

                        {/* Actions column */}
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <Link
                              href={`/ticket/${attendee.id}`}
                              target="_blank"
                              className="btn btn-secondary"
                              style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                              title="View Digital Pass"
                            >
                              <ExternalLink size={13} />
                            </Link>

                            {attendee.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => handleUpdateStatus(attendee.id, 'APPROVED')}
                                  disabled={actionLoading === attendee.id}
                                  className="btn btn-success"
                                  style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                                >
                                  <Check size={14} />
                                  Approve Pass
                                </button>
                                <button
                                  onClick={() => setRejectingId(attendee.id)}
                                  disabled={actionLoading === attendee.id}
                                  className="btn btn-outline-danger"
                                  style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                                >
                                  <X size={14} />
                                  Reject
                                </button>
                              </>
                            )}

                            {attendee.status === 'APPROVED' && (
                              <button
                                onClick={() => setRejectingId(attendee.id)}
                                className="btn btn-outline-danger"
                                style={{ padding: '6px 8px', fontSize: '0.75rem' }}
                                title="Revoke Approval"
                              >
                                <X size={13} />
                              </button>
                            )}

                            {attendee.checkedIn && (
                              <button
                                onClick={() => handleResetCheckIn(attendee.id)}
                                className="btn btn-secondary"
                                style={{ padding: '6px 8px', fontSize: '0.75rem' }}
                                title="Reset Check-in (Gate Mistake)"
                              >
                                <RotateCcw size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* SECTION 2: ALUMNI MASTER DIRECTORY & CSV IMPORT */}
      {activeSection === 'MASTER_DIRECTORY' && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                <GraduationCap size={20} color="var(--accent-cyan)" />
                College Alumni Master Directory ({alumniList.length} Graduates)
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 2 }}>
                This is your college's pre-approved student database. Only USNs listed here can request an OTP or claim a pass.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="text"
                placeholder="Search Master USN or Name..."
                className="form-input"
                style={{ width: 240, padding: '8px 12px', fontSize: '0.85rem' }}
                value={alumniSearch}
                onChange={e => setAlumniSearch(e.target.value)}
              />
              <button onClick={() => setShowImportModal(true)} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
                <Upload size={16} />
                Import Alumni CSV
              </button>
            </div>
          </div>

          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>USN</th>
                  <th>Graduate Full Name</th>
                  <th>Department</th>
                  <th>Batch</th>
                  <th>Registered Email</th>
                  <th>Registered Phone</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlumni.map((alumnus, idx) => (
                  <tr key={idx}>
                    <td>
                      <span style={{
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        color: 'var(--accent-cyan)',
                        background: 'rgba(0, 242, 254, 0.08)',
                        padding: '3px 8px',
                        borderRadius: 4
                      }}>
                        {alumnus.usn}
                      </span>
                    </td>
                    <td><strong style={{ color: '#fff' }}>{alumnus.fullName}</strong></td>
                    <td style={{ color: 'var(--text-muted)' }}>{alumnus.department}</td>
                    <td><span className="badge badge-approved" style={{ fontSize: '0.7rem' }}>{alumnus.batchYear}</span></td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#cbd5e1' }}>{alumnus.officialEmail}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#cbd5e1' }}>{alumnus.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 3: REAL OTP & GATEWAY LIVE TESTING */}
      {activeSection === 'GATEWAYS' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
          {/* Card 1: Live Dispatch Tester */}
          <div className="glass-panel" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(0, 242, 254, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Send size={20} color="var(--accent-cyan)" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', color: '#fff', fontWeight: 700 }}>Live OTP Dispatch Tester</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Send a real test email or SMS to verify your keys immediately</p>
              </div>
            </div>

            <form onSubmit={handleTestNotification}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <button
                  type="button"
                  onClick={() => setTestType('EMAIL')}
                  className={`btn ${testType === 'EMAIL' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, fontSize: '0.82rem' }}
                >
                  <Mail size={15} />
                  Test Email OTP
                </button>
                <button
                  type="button"
                  onClick={() => setTestType('PHONE')}
                  className={`btn ${testType === 'PHONE' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, fontSize: '0.82rem' }}
                >
                  <Phone size={15} />
                  Test SMS OTP
                </button>
              </div>

              <div className="form-group">
                <label className="form-label">
                  {testType === 'EMAIL' ? 'Enter Test Recipient Email' : 'Enter 10-Digit Mobile Number (+91)'}
                </label>
                <input
                  type={testType === 'EMAIL' ? 'email' : 'tel'}
                  required
                  placeholder={testType === 'EMAIL' ? 'e.g. yourname@gmail.com' : 'e.g. 9876543210'}
                  className="form-input"
                  value={testTarget}
                  onChange={e => setTestTarget(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={testingGate}
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px', marginTop: 8 }}
              >
                {testingGate ? 'Delivering...' : `Send Test ${testType === 'EMAIL' ? 'Email' : 'SMS'} Now`}
              </button>
            </form>

            {/* Test Output */}
            {testResult && (
              <div style={{
                marginTop: 16,
                padding: '14px',
                borderRadius: 'var(--radius-sm)',
                background: testResult.isReal ? 'rgba(16, 185, 129, 0.12)' : 'rgba(0, 242, 254, 0.08)',
                border: `1px solid ${testResult.isReal ? 'rgba(16, 185, 129, 0.35)' : 'rgba(0, 242, 254, 0.25)'}`,
                fontSize: '0.82rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: testResult.isReal ? 'var(--status-approved)' : 'var(--accent-cyan)', marginBottom: 4 }}>
                  <Sparkles size={16} />
                  <span>{testResult.isReal ? 'REAL DELIVERY SUCCESS!' : 'SIMULATION MODE OUTPUT'}</span>
                </div>
                <div style={{ color: '#fff', marginBottom: 4 }}>{testResult.message}</div>
                {testResult.testOtp && (
                  <div style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    Generated Code: <strong>{testResult.testOtp}</strong> · Provider: {testResult.provider || testResult.deliveryProvider}
                  </div>
                )}
                {testResult.error && (
                  <div style={{ color: '#fca5a5', marginTop: 4 }}>{testResult.error}</div>
                )}
              </div>
            )}
          </div>

          {/* Card 2: 60-Second Setup Guide */}
          <div className="glass-panel" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(157, 78, 221, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <KeyRound size={20} color="#c084fc" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', color: '#fff', fontWeight: 700 }}>60-Second Gmail Setup</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>How to activate 100% free real email sending</p>
              </div>
            </div>

            <div style={{ fontSize: '0.83rem', color: '#cbd5e1', lineHeight: 1.6 }}>
              <ol style={{ paddingLeft: 18, margin: 0 }}>
                <li style={{ marginBottom: 8 }}>
                  Open your Google Account: <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-cyan)', textDecoration: 'underline' }}>Security Settings <ExternalLink size={12} style={{ display: 'inline' }} /></a>
                </li>
                <li style={{ marginBottom: 8 }}>
                  Make sure <strong>2-Step Verification</strong> is ON.
                </li>
                <li style={{ marginBottom: 8 }}>
                  Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-cyan)', textDecoration: 'underline' }}>App Passwords <ExternalLink size={12} style={{ display: 'inline' }} /></a>.
                </li>
                <li style={{ marginBottom: 8 }}>
                  Name it <strong>CollegeFest</strong> and click <strong>Create</strong>.
                </li>
                <li style={{ marginBottom: 8 }}>
                  Google gives you a 16-character code (e.g. <code>abcd efgh ijkl mnop</code>).
                </li>
                <li>
                  Save it in your <code>.env.local</code> file:
                  <div style={{ background: '#000', padding: '8px 12px', borderRadius: 6, marginTop: 6, fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--accent-cyan)' }}>
                    GMAIL_USER=yourfest@gmail.com<br />
                    GMAIL_APP_PASSWORD=abcdefghijklmnop
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT ALUMNI CSV MODAL */}
      {showImportModal && (
        <div className="modal-backdrop" onClick={() => setShowImportModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: '1.2rem', color: '#fff' }}>Import Alumni Database (CSV / Text)</h3>
              <button onClick={() => setShowImportModal(false)} className="btn btn-secondary" style={{ padding: 6 }}>
                <X size={18} />
              </button>
            </div>

            <div style={{
              border: '2px dashed var(--border-focus)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              textAlign: 'center',
              background: 'rgba(0, 242, 254, 0.05)',
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
              <label htmlFor="excel-file-input" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <Upload size={28} color="var(--accent-cyan)" />
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
                  Click to Upload Excel Sheet (.xlsx / .xls / .csv)
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>
                  Auto-detects USN, Student Name, Email, Phone, Branch & Batch
                </span>
              </label>
            </div>

            <div style={{ textAlign: 'center', margin: '10px 0', color: 'var(--text-sub)', fontSize: '0.8rem' }}>
              — OR PASTE CSV ROWS BELOW —
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 8 }}>
              Format: <code style={{ color: 'var(--accent-cyan)' }}>USN, Full Name, Email, Phone, Department, Batch</code>
            </p>

            <textarea
              rows={8}
              className="form-textarea"
              style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}
              placeholder={`1MS20CS099, John Doe, john.doe@alumni.college.edu, +91 98765 11223, Computer Science, Batch of 2024\n1MS20EC045, Jane Smith, jane.smith@gmail.com, +91 98222 33445, Electronics, Batch of 2024`}
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
            />

            {importStatus && (
              <div style={{ color: 'var(--status-approved)', fontSize: '0.85rem', marginTop: 10, fontWeight: 600 }}>
                {importStatus}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => setShowImportModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                Cancel
              </button>
              <button onClick={handleImportCsv} className="btn btn-primary" style={{ flex: 1 }}>
                Process & Save to Directory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW PROOF PHOTO MODAL */}
      {viewingProof && (
        <div className="modal-backdrop" onClick={() => setViewingProof(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', color: '#fff' }}>Proof of Graduation / ID</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {viewingProof.name} ({viewingProof.roll})
                </p>
              </div>
              <button onClick={() => setViewingProof(null)} className="btn btn-secondary" style={{ padding: 6 }}>
                <X size={18} />
              </button>
            </div>

            {viewingProof.reason && (
              <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: 6, marginBottom: 12, fontSize: '0.82rem', color: '#fef3c7' }}>
                Note: {viewingProof.reason}
              </div>
            )}

            <div style={{ background: '#000', borderRadius: 'var(--radius-sm)', overflow: 'hidden', textAlign: 'center' }}>
              <img
                src={viewingProof.url}
                alt="Proof Document"
                style={{ width: '100%', maxHeight: 420, objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectingId && (
        <div className="modal-backdrop" onClick={() => setRejectingId(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 440, padding: 24 }}>
            <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: 6 }}>Reject Registration</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              Provide a reason. The student will see this when looking up their pass.
            </p>

            <div className="form-group">
              <label className="form-label">Rejection Reason</label>
              <textarea
                rows={3}
                className="form-textarea"
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => setRejectingId(null)} className="btn btn-secondary" style={{ flex: 1 }}>
                Cancel
              </button>
              <button
                onClick={() => handleUpdateStatus(rejectingId, 'REJECTED', rejectionReason)}
                className="btn btn-danger"
                style={{ flex: 1 }}
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
