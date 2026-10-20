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
    totalFamilyMembers: 0,
    totalPeople: 0,
    capacity: 1000,
    pending: 0,
    approved: 0,
    approvedPeople: 0,
    checkedIn: 0,
    admittedPeople: 0,
    remainingAtGate: 0,
    rejected: 0,
  });
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [isLiveSyncing, setIsLiveSyncing] = useState<boolean>(false);

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'CHECKED_IN' | 'REJECTED'>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Delete & Re-registration state
  const [deletingAttendee, setDeletingAttendee] = useState<Attendee | null>(null);
  const [showResetAllModal, setShowResetAllModal] = useState(false);


  // Alumni Master state
  const [alumniList, setAlumniList] = useState<AlumniRecord[]>([]);
  const [alumniSearch, setAlumniSearch] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [departmentCounts, setDepartmentCounts] = useState<Record<string, number>>({});
  const [syncingDataFolder, setSyncingDataFolder] = useState<boolean>(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Selected ID / Degree Proof modal
  const [viewingProof, setViewingProof] = useState<{
    name: string;
    url: string;
    roll: string;
    reason?: string;
    organization?: string;
    designation?: string;
  } | null>(null);

  // Rejection modal
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('USN details could not be verified with university records.');

  // Settings modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsForm, setSettingsForm] = useState<Partial<EventSettings>>({});

  useEffect(() => {
    const saved = sessionStorage.getItem('dbit_admin_passcode');
    if (saved && saved.trim() === 'alumni#milan') {
      setAdminPasscode(saved.trim());
      setIsAuthenticated(true);
    }
  }, []);

  const fetchAttendees = async (silent: boolean = false, overridePasscode?: string) => {
    if (!silent) setLoading(true);
    else setIsLiveSyncing(true);

    const effectivePasscode = overridePasscode ?? adminPasscode;

    try {
      const queryParams = new URLSearchParams();
      if (statusFilter !== 'ALL') queryParams.set('status', statusFilter);
      if (search) queryParams.set('search', search);
      queryParams.set('_t', Date.now().toString());

      const res = await fetch(`/api/attendees?${queryParams.toString()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'x-admin-passcode': effectivePasscode,
        },
      });
      const data = await res.json();
      if (data.success) {
        setAttendees(data.attendees || []);
        setStats(data.stats);
        setSettings(data.settings);
        if (!silent) setSettingsForm(data.settings);
        setLastSyncedAt(new Date());
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setLoading(false);
      setIsLiveSyncing(false);
    }
  };

  const fetchAlumniMaster = async () => {
    try {
      const res = await fetch(`/api/alumni/master?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'x-admin-passcode': adminPasscode,
        },
      });
      const data = await res.json();
      if (data.success) {
        setAlumniList(data.alumni || []);
        if (data.departmentCounts) {
          setDepartmentCounts(data.departmentCounts);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isAuthenticated && adminPasscode) {
      if (activeSection === 'ATTENDEES') {
        fetchAttendees(false, adminPasscode);
      } else {
        fetchAlumniMaster();
      }
    }
  }, [isAuthenticated, adminPasscode, activeSection, statusFilter, search]);

  // Real-time automatic polling every 3 seconds to sync live DB changes
  useEffect(() => {
    if (!isAuthenticated || !adminPasscode) return;

    const interval = setInterval(() => {
      if (activeSection === 'ATTENDEES') {
        fetchAttendees(true, adminPasscode); // silent background fetch
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isAuthenticated, adminPasscode, activeSection, statusFilter, search]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = adminPasscode.trim();
    if (cleaned === 'alumni#milan') {
      setIsAuthenticated(true);
      setAuthError('');
      sessionStorage.setItem('dbit_admin_passcode', cleaned);
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
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-passcode': adminPasscode 
        },
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
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-passcode': adminPasscode 
        },
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
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-passcode': adminPasscode 
        },
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
      const res = await fetch(`/api/attendees/${id}?_t=${Date.now()}`, {
        method: 'DELETE',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'x-admin-passcode': adminPasscode,
        },
      });
      const data = await res.json();
      if (data.success) {
        setAttendees(prev => prev.filter(a => a.id !== id));
        setDeletingAttendee(null);
        await fetchAttendees();
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
      const res = await fetch(`/api/attendees?_t=${Date.now()}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'x-admin-passcode': adminPasscode,
        },
        body: JSON.stringify({ resetAll: true }),
      });
      const data = await res.json();
      if (data.success) {
        setAttendees([]);
        setShowResetAllModal(false);
        await fetchAttendees();
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


  // Import Multiple Excel (.xlsx, .xls) or CSV files
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      setImportStatus(`Reading and normalizing ${files.length} spreadsheet file(s)...`);
      const res = await fetch('/api/alumni/master', {
        method: 'POST',
        headers: {
          'x-admin-passcode': adminPasscode,
        },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setImportStatus(data.message || `Successfully imported records!`);
        fetchAlumniMaster();
        setTimeout(() => {
          setShowImportModal(false);
          setImportStatus(null);
        }, 2000);
      } else {
        alert(data.error || 'Failed to import Excel files.');
        setImportStatus(null);
      }
    } catch (err: any) {
      alert('Upload error: ' + err.message);
      setImportStatus(null);
    }
  };

  // Sync all Excel/CSV files in data/ directory
  const handleSyncDataFolder = async () => {
    setSyncingDataFolder(true);
    try {
      const res = await fetch('/api/alumni/master?action=syncDataDir', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-passcode': adminPasscode 
        },
      });
      const data = await res.json();
      if (data.success) {
        alert(`Sync Complete!\n\n${data.message}\nTotal Master Alumni Records on file: ${data.totalMaster}`);
        fetchAlumniMaster();
      } else {
        alert(data.error || 'Failed to sync data folder.');
      }
    } catch (err: any) {
      alert('Sync error: ' + err.message);
    } finally {
      setSyncingDataFolder(false);
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
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-passcode': adminPasscode 
        },
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
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-passcode': adminPasscode 
        },
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
    if (selectedDeptFilter !== 'ALL') {
      const d = (a.department || '').toLowerCase();
      const target = selectedDeptFilter.toLowerCase();
      if (d !== target) {
        if (selectedDeptFilter === 'CSE' && !d.includes('cse') && !d.includes('computer')) return false;
        if (selectedDeptFilter === 'ISE' && !d.includes('ise') && !d.includes('info') && d !== 'is') return false;
        if (selectedDeptFilter === 'AI & DS' && !d.includes('data') && !d.includes('aids') && !d.includes('ai&ds') && !d.includes('ai & ds') && d !== 'ad') return false;
        if (selectedDeptFilter === 'AI & ML' && !d.includes('machine') && !d.includes('aiml') && !d.includes('ai&ml') && !d.includes('ai & ml') && d !== 'am') return false;
        if (selectedDeptFilter === 'ECE' && !d.includes('ece') && !d.includes('electron') && d !== 'ec') return false;
        if (selectedDeptFilter === 'Mechanical' && !d.includes('mech') && d !== 'me') return false;
        if (selectedDeptFilter === 'Civil' && !d.includes('civil') && d !== 'cv') return false;
        if (selectedDeptFilter === 'EEE' && !d.includes('eee') && !d.includes('electrical') && d !== 'ee') return false;
        if (selectedDeptFilter === 'TCE' && !d.includes('tce') && !d.includes('telecom') && d !== 'te' && d !== 'tc') return false;
        if (selectedDeptFilter === 'MBA' && !d.includes('mba') && !d.includes('business')) return false;
        if (selectedDeptFilter === 'M.Tech' && !d.includes('mtech') && !d.includes('m.tech') && d !== 'scs') return false;
      }
    }

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
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-passcode': adminPasscode 
        },
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
                <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1 }}>
                  MILAN<span style={{ color: '#93c5fd' }}>2026</span>
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 1.4, color: '#A9B8D8' }}>
                  DBIT ALUMNI ASSOCIATION
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className="mono-tag" style={{ color: '#93c5fd', fontSize: 11, letterSpacing: 1.5 }}>
                COMMAND AUTHORIZATION
              </span>
              <span style={{ width: 24, height: 2, background: 'var(--color-gold)', borderRadius: 2 }} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, margin: '2px 0 4px' }}>
              Admin Command Center
            </h2>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#A9B8D8', letterSpacing: 1 }}>
              7 NOVEMBER 2026 · 2:30 PM (GATES: 2:00 PM) · DBIT CRICKET GROUND
            </div>
          </div>

          <div className="dbit-auth-body">
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--text-body)', marginBottom: 20 }}>
              Enter administrator passcode to access review queues, graduate directory, and gate systems.
            </p>

            {authError && (
              <div style={{ padding: '10px 14px', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, color: '#991b1b', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, marginBottom: 16 }}>
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
                style={{ width: '100%', padding: '14px', borderRadius: 8 }}
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
      <div className="dbit-top-hub">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img 
            src="/assets/66eff0e624600df79e9f69030275731c.png" 
            alt="Don Bosco Institute of Technology emblem" 
            style={{ width: 38, height: 'auto', display: 'block' }} 
          />
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1 }}>
              MILAN<span style={{ color: 'var(--color-blue)' }}>2026</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: 1.2, color: 'var(--text-muted)' }}>
              DBIT ALUMNI ASSOCIATION
            </div>
          </div>
          <span style={{ height: 20, width: 1, background: 'var(--border-color)', margin: '0 4px' }} />
          <span className="mono-tag" style={{ color: 'var(--color-blue)', fontSize: 11 }}>
            COMMAND CENTER
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
          <Link
            href="/scanner"
            target="_blank"
            className="btn-neo-outline"
            style={{ padding: '8px 14px', fontSize: '0.75rem', borderRadius: 8 }}
          >
            2. GATE SCANNER ↗
          </Link>
          <span
            className="btn-neo-black"
            style={{ padding: '8px 14px', fontSize: '0.75rem', cursor: 'default', borderRadius: 8 }}
          >
            3. ADMIN CENTER (ACTIVE)
          </span>
          <button
            onClick={() => {
              sessionStorage.removeItem('dbit_admin_passcode');
              setIsAuthenticated(false);
              setAdminPasscode('');
            }}
            className="btn-neo-outline"
            style={{ padding: '8px 14px', fontSize: '0.75rem', borderRadius: 8, color: '#dc2626', borderColor: '#fca5a5', cursor: 'pointer' }}
          >
            LOGOUT
          </button>
        </div>
      </div>

      {/* TOP COMMAND HEADER */}
      <div className="dbit-dashboard-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            <span className="mono-tag" style={{ fontSize: 13, letterSpacing: 1.8 }}>ALUMNI MEET · MILAN 2026</span>
            <span style={{ display: 'block', width: 36, height: 3, background: 'var(--color-gold)', borderRadius: 2 }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-muted)', fontWeight: 700 }}>
              7 NOVEMBER 2026 · 2:30 PM · GATES OPEN 2:00 PM · DBIT CRICKET GROUND, BANGALORE
            </span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 3.5vw, 2.8rem)', fontWeight: 700, color: 'var(--color-navy)' }}>
            Organizer Command Center
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-body)', marginTop: 4 }}>
            {settings?.eventName || "MILAN 2026"} · {alumniList.length} Verified Master Alumni Records on File
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 14px',
            background: '#ffffff',
            border: '1px solid var(--border-color)',
            borderRadius: 8,
            boxShadow: '0 2px 6px rgba(14, 31, 69, 0.05)'
          }}>
            <span style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: isLiveSyncing ? '0 0 10px #10b981' : '0 0 4px #10b981',
              transition: 'box-shadow 0.2s ease',
            }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-main)' }}>
              LIVE DB AUTO-SYNC (3s)
            </span>
            {lastSyncedAt && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                · {lastSyncedAt.toLocaleTimeString()}
              </span>
            )}
          </div>

          <button
            onClick={() => setShowSettingsModal(true)}
            className="btn-neo-outline"
            style={{ padding: '10px 18px', fontSize: '0.78rem', borderRadius: 8 }}
          >
            <Settings size={14} />
            EVENT SETTINGS ↗
          </button>
          <a
            href={`/api/export?passcode=${encodeURIComponent(adminPasscode)}`}
            download="milan2026_registration_responses.csv"
            className="btn-neo-outline"
            style={{
              padding: '10px 18px',
              fontSize: '0.78rem',
              borderRadius: 8,
              background: '#fef9c3',
              borderColor: '#fde047',
              color: '#854d0e',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              textDecoration: 'none'
            }}
          >
            <Download size={15} />
            DOWNLOAD CSV ↗
          </a>
          <button
            onClick={() => fetchAttendees(false)}
            className="btn-neo-black"
            style={{ padding: '10px 18px', fontSize: '0.78rem', borderRadius: 8 }}
            title="Force immediate reload from database"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            REFRESH DB ↗
          </button>
        </div>
      </div>

      {/* STAT COUNTERS GRID - REAL-TIME DB METRICS */}
      <div className="dbit-stat-grid">
        <div className="neo-stat-card">
          <span className="mono-label">TOTAL REGISTRATIONS</span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 700, margin: '8px 0 2px', color: 'var(--color-navy)' }}>
            {stats.total} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/ {stats.capacity} max</span>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {stats.approved} approved passes · {stats.pending} pending
          </span>
        </div>

        <div className="neo-stat-card">
          <span className="mono-label">ACTIVE PASSES ISSUED</span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 700, margin: '8px 0 2px', color: 'var(--color-blue)' }}>
            {stats.approved}
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Official registered alumni
          </span>
        </div>

        <div className="neo-stat-card">
          <span className="mono-label">GATE ADMITTED</span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 700, margin: '8px 0 2px', color: '#0e8a5a' }}>
            {stats.checkedIn}
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {Math.max(0, stats.approved - stats.checkedIn)} passes yet to arrive
          </span>
        </div>

        <div className="neo-stat-card" style={{ background: stats.pending > 0 ? '#fef3c7' : '#ffffff', borderColor: stats.pending > 0 ? '#fcd34d' : 'var(--border-color)' }}>
          <span className="mono-label" style={{ color: stats.pending > 0 ? '#78350f' : undefined }}>NEEDS MANUAL REVIEW</span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 700, margin: '8px 0 2px', color: stats.pending > 0 ? '#b45309' : undefined }}>
            {stats.pending}
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: stats.pending > 0 ? '#92400e' : 'var(--text-muted)' }}>
            Awaiting committee verification
          </span>
        </div>

        <div className="neo-stat-card">
          <span className="mono-label">DENIED / REJECTED</span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 700, margin: '8px 0 2px', color: '#dc2626' }}>
            {stats.rejected}
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Denied verification requests
          </span>
        </div>
      </div>

      {/* MAIN SECTIONS TAB STRIP */}
      <div style={{ padding: '0 32px 0' }}>
        <div className="neo-tabs-header">
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
              borderBottom: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
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
                  onClick={() => setStatusFilter('PENDING')}
                  className={statusFilter === 'PENDING' ? 'btn-neo-black' : 'btn-neo-outline'}
                  style={{ padding: '8px 14px', fontSize: '0.76rem' }}
                >
                  NEEDS REVIEW ({stats.pending})
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
                <a
                  href={`/api/export?passcode=${encodeURIComponent(adminPasscode)}`}
                  download="milan2026_registration_responses.csv"
                  className="btn-neo-yellow"
                  style={{
                    whiteSpace: 'nowrap',
                    padding: '9px 14px',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#fde047',
                    color: '#000',
                    border: '1.5px solid #000',
                    boxShadow: '2px 2px 0 #000'
                  }}
                  title="Download all attendee registration form responses as CSV"
                >
                  <Download size={13} />
                  DOWNLOAD RESPONSES (CSV) ↗
                </a>
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
                    <th>ORGANISATION & ROLE</th>
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
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.88rem', background: '#EAF0FB', color: 'var(--color-blue)', padding: '3px 8px', border: '1px solid #C4D5F6', borderRadius: 4 }}>
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
                          <div style={{ fontWeight: 700, fontSize: '0.84rem' }}>
                            {attendee.organization || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not provided</span>}
                          </div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                            {attendee.designation || 'Alumnus'}
                          </div>
                        </td>

                        <td>
                          {attendee.status === 'APPROVED' && !attendee.checkedIn && (!attendee.admittedCount || attendee.admittedCount === 0) && (
                            <span className="neo-badge neo-badge-approved">APPROVED</span>
                          )}
                          {attendee.status === 'APPROVED' && !attendee.checkedIn && attendee.admittedCount && attendee.admittedCount > 0 && (
                            <span className="neo-badge" style={{ background: 'var(--card-blue-2)', color: '#0f2b5c' }}>
                              ADMITTED
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
                                    organization: attendee.organization,
                                    designation: attendee.designation,
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
            {/* Top controls strip */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 14,
              marginBottom: 16,
              paddingBottom: 16,
              borderBottom: '1px solid var(--border-color)'
            }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-navy)' }}>
                  COLLEGE ALUMNI MASTER DIRECTORY ({alumniList.length} TOTAL RECORDS)
                </h3>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Pre-approved graduate database across all college departments. Only USNs listed here can claim a pass or request OTP.
                </p>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="SEARCH USN, NAME, EMAIL..."
                  className="neo-input"
                  style={{ width: 220, padding: '10px 14px', fontSize: '0.82rem' }}
                  value={alumniSearch}
                  onChange={e => setAlumniSearch(e.target.value)}
                />
                <button
                  onClick={handleSyncDataFolder}
                  disabled={syncingDataFolder}
                  className="btn-neo-outline"
                  style={{ fontSize: '0.78rem', padding: '10px 16px', borderRadius: 8, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  title="Scan all .xlsx and .csv files in data/ directory and sync into database"
                >
                  <RefreshCw size={13} className={syncingDataFolder ? 'animate-spin' : ''} />
                  {syncingDataFolder ? 'SYNCING...' : 'SYNC "DATA/" FOLDER ↗'}
                </button>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="btn-neo-black"
                  style={{ fontSize: '0.78rem', padding: '10px 18px', borderRadius: 8, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Upload size={13} />
                  IMPORT FILES ↗
                </button>
              </div>
            </div>

            {/* Department Filter Tabs */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              marginBottom: 20,
              paddingBottom: 16,
              borderBottom: '1px dashed var(--border-color)'
            }}>
              {[
                { id: 'ALL', label: 'ALL DEPARTMENTS' },
                { id: 'CSE', label: 'CSE' },
                { id: 'ISE', label: 'ISE' },
                { id: 'AI & DS', label: 'AI & DS' },
                { id: 'AI & ML', label: 'AI & ML' },
                { id: 'ECE', label: 'ECE' },
                { id: 'Mechanical', label: 'MECHANICAL' },
                { id: 'Civil', label: 'CIVIL' },
                { id: 'EEE', label: 'EEE' },
                { id: 'TCE', label: 'TCE' },
                { id: 'MBA', label: 'MBA' },
                { id: 'M.Tech', label: 'M.TECH' },
              ].map(dept => {
                const count = dept.id === 'ALL'
                  ? alumniList.length
                  : (departmentCounts[dept.id] || alumniList.filter(a => {
                      const d = (a.department || '').toLowerCase();
                      const target = dept.id.toLowerCase();
                      if (d === target) return true;
                      if (dept.id === 'CSE') return d.includes('cse') || d.includes('computer');
                      if (dept.id === 'ISE') return d.includes('ise') || d.includes('info') || d === 'is';
                      if (dept.id === 'AI & DS') return d.includes('data') || d.includes('aids') || d.includes('ai&ds') || d.includes('ai & ds') || d === 'ad';
                      if (dept.id === 'AI & ML') return d.includes('machine') || d.includes('aiml') || d.includes('ai&ml') || d.includes('ai & ml') || d === 'am';
                      if (dept.id === 'ECE') return d.includes('ece') || d.includes('electron') || d === 'ec';
                      if (dept.id === 'Mechanical') return d.includes('mech') || d === 'me';
                      if (dept.id === 'Civil') return d.includes('civil') || d === 'cv';
                      if (dept.id === 'EEE') return d.includes('eee') || d.includes('electrical') || d === 'ee';
                      if (dept.id === 'TCE') return d.includes('tce') || d.includes('telecom') || d === 'te' || d === 'tc';
                      if (dept.id === 'MBA') return d.includes('mba') || d.includes('business');
                      if (dept.id === 'M.Tech') return d.includes('mtech') || d.includes('m.tech') || d === 'scs';
                      return false;
                    }).length);
                const isActive = selectedDeptFilter === dept.id;
                return (
                  <button
                    key={dept.id}
                    onClick={() => setSelectedDeptFilter(dept.id)}
                    className={isActive ? 'btn-neo-black' : 'btn-neo-outline'}
                    style={{
                      padding: '5px 10px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      borderRadius: 6,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <span>{dept.label}</span>
                    <span style={{
                      fontSize: '0.64rem',
                      background: isActive ? '#fff' : 'var(--color-navy)',
                      color: isActive ? 'var(--color-navy)' : '#fff',
                      padding: '1px 5px',
                      borderRadius: 4
                    }}>
                      {count}
                    </span>
                  </button>
                );
              })}
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
                  {filteredAlumni.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        NO RECORDS FOUND FOR {selectedDeptFilter} DEPT. CLICK &quot;IMPORT FILES&quot; OR &quot;SYNC DATA FOLDER&quot; TO ADD EXCEL FILES.
                      </td>
                    </tr>
                  ) : (
                    filteredAlumni.map((alumnus, idx) => (
                      <tr key={idx}>
                        <td>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.88rem', background: '#EAF0FB', color: 'var(--color-blue)', padding: '3px 8px', border: '1px solid #C4D5F6', borderRadius: 4 }}>
                            {alumnus.usn}
                          </span>
                        </td>
                        <td><strong>{alumnus.fullName}</strong></td>
                        <td>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, background: '#f1f5f9', padding: '2px 6px', border: '1px solid #cbd5e1' }}>
                            {alumnus.department}
                          </span>
                        </td>
                        <td><span className="neo-badge neo-badge-approved">{alumnus.batchYear}</span></td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{alumnus.officialEmail || '—'}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{alumnus.phone || '—'}</td>
                      </tr>
                    ))
                  )}
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
                    border: '1px solid var(--border-color)',
                    borderRadius: 8,
                    background: testResult.isReal ? '#EAF0FB' : '#ffffff',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8rem'
                  }}>
                    <div style={{ fontWeight: 700, marginBottom: 4, color: testResult.isReal ? 'var(--color-navy)' : 'var(--text-main)' }}>
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
                <span className="mono-tag" style={{ color: 'var(--color-blue)' }}>CREDENTIALS GUIDE</span>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-navy)', margin: '6px 0 2px' }}>
                  Gmail SMTP Configuration
                </h3>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--text-body)', marginBottom: 16 }}>
                  How to link free real Gmail delivery in <code>.env.local</code>:
                </p>

                <ol style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', lineHeight: 1.8, paddingLeft: 18, color: 'var(--text-main)' }}>
                  <li>Open Google Account: <strong>Security Settings</strong></li>
                  <li>Ensure <strong>2-Step Verification</strong> is ON.</li>
                  <li>Go to <strong>App Passwords</strong> and create one for <strong>MilanFest</strong>.</li>
                  <li>Copy the 16-character generated password.</li>
                  <li>Save in <code>.env.local</code>:</li>
                </ol>

                <div style={{ background: 'var(--color-navy)', color: '#ffffff', padding: '14px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', marginTop: 12, border: '1px solid var(--border-color)', borderRadius: 8 }}>
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
          <div className="neo-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 580 }}>
            <div className="neo-modal-header">
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 700 }}>IMPORT COLLEGE ALUMNI DATABASE</span>
              <button onClick={() => setShowImportModal(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{
                border: '2px dashed var(--border-color)',
                borderRadius: 8,
                padding: '28px',
                textAlign: 'center',
                background: '#F8FAFC',
                marginBottom: 16,
                cursor: 'pointer'
              }}>
                <input
                  type="file"
                  multiple
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  id="excel-file-input"
                />
                <label htmlFor="excel-file-input" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <Upload size={32} color="var(--color-blue)" />
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-navy)' }}>
                    Click to Select Files (.xlsx, .xls, .csv)
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.4, maxWidth: 440 }}>
                    Select single or multiple department spreadsheets (e.g. <strong>ISE.xlsx</strong>, <strong>AIDS.xlsx</strong>, <strong>AIML.xlsx</strong>, <strong>ECE.xlsx</strong>, <strong>Mechanical.xlsx</strong>, <strong>Civil.xlsx</strong>, <strong>EEE.xlsx</strong>, <strong>TCE.xlsx</strong>, <strong>MBA.xlsx</strong>, <strong>MTech.xlsx</strong>).
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--color-blue)', fontWeight: 700, marginTop: 4 }}>
                    ✓ Multi-sheet workbooks & batches are automatically parsed
                  </span>
                </label>
              </div>

              <div style={{ padding: '12px 14px', background: '#EAF0FB', border: '1px solid var(--border-color)', borderRadius: 8, marginBottom: 14 }}>
                <div className="mono-label" style={{ fontSize: '0.65rem', marginBottom: 2, color: 'var(--color-blue)' }}>PRO-TIP: LOCAL FOLDER SYNC</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--text-main)', lineHeight: 1.4 }}>
                  You can also directly copy/paste your department files into the project&apos;s <code>data/</code> folder and click <strong>&quot;SYNC DATA/ FOLDER&quot;</strong> in the directory header!
                </div>
              </div>

              <div style={{ textAlign: 'center', margin: '14px 0', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                — OR PASTE RAW CSV ROWS BELOW —
              </div>

              <textarea
                rows={5}
                className="neo-input"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', resize: 'vertical' }}
                placeholder={`1DB20IS045, John Doe, john.doe@gmail.com, 9876543210, ISE, Batch of 2024\n1DB21EC088, Jane Smith, jane@gmail.com, 9876511223, ECE, Batch of 2025`}
                value={csvText}
                onChange={e => setCsvText(e.target.value)}
              />

              {importStatus && (
                <div style={{ color: '#0e8a5a', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', marginTop: 12, fontWeight: 700, padding: '8px 12px', background: '#ecfdf5', border: '1px solid #059669', borderRadius: 6 }}>
                  {importStatus}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button onClick={() => setShowImportModal(false)} className="btn-neo-outline" style={{ flex: 1, borderRadius: 8 }}>
                  CANCEL
                </button>
                <button onClick={handleImportCsv} className="btn-neo-black" style={{ flex: 1, borderRadius: 8 }}>
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
                <div style={{ padding: '10px 14px', background: '#F8FAFC', border: '1px solid var(--border-color)', borderRadius: 8, marginBottom: 14, fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                  Note: {viewingProof.reason}
                </div>
              )}

              {viewingProof.organization && (
                <div style={{ padding: '12px 14px', background: '#EAF0FB', border: '1px solid var(--border-color)', borderRadius: 8, marginBottom: 14 }}>
                  <div className="mono-label" style={{ fontSize: '0.68rem', marginBottom: 4, color: 'var(--color-blue)' }}>
                    PROFESSIONAL AFFILIATION
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-navy)' }}>
                    {viewingProof.organization} · {viewingProof.designation || 'Alumnus'}
                  </div>
                </div>
              )}

              <div style={{ border: '1px solid var(--border-color)', borderRadius: 8, overflow: 'hidden', background: '#0E1F45', textAlign: 'center' }}>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label className="mono-label" style={{ display: 'block', marginBottom: 4 }}>EVENT DATE</label>
                  <input
                    type="text"
                    className="neo-input"
                    value={settingsForm.eventDate || 'Saturday, November 7, 2026'}
                    onChange={e => setSettingsForm({ ...settingsForm, eventDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mono-label" style={{ display: 'block', marginBottom: 4 }}>EVENT TIME</label>
                  <input
                    type="text"
                    className="neo-input"
                    value={settingsForm.eventTime || '02:30 PM'}
                    onChange={e => setSettingsForm({ ...settingsForm, eventTime: e.target.value })}
                  />
                </div>
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
              <button onClick={() => setDeletingAttendee(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '16px', marginBottom: 20 }}>
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 700, color: '#991b1b' }}>
                  DELETE PASS FOR {deletingAttendee.fullName.toUpperCase()}?
                </h4>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: '#7f1d1d', marginTop: 4 }}>
                  USN: <strong>{deletingAttendee.usn || deletingAttendee.rollNumber}</strong> · Ticket: {deletingAttendee.ticketCode}
                </p>
              </div>

              <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.88rem', color: 'var(--text-body)', marginBottom: 20, lineHeight: 1.6 }}>
                <p style={{ fontWeight: 600, color: 'var(--color-navy)', marginBottom: 6 }}>This action will immediately:</p>
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
                  style={{ flex: 1, padding: '12px', borderRadius: 8 }}
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteAttendee(deletingAttendee.id)}
                  disabled={actionLoading === deletingAttendee.id}
                  className="btn-neo-black"
                  style={{ flex: 2, background: '#dc2626', borderColor: '#991b1b', padding: '12px', fontSize: '0.8rem', borderRadius: 8 }}
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
              <button onClick={() => setShowResetAllModal(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '16px', marginBottom: 20 }}>
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, color: '#991b1b' }}>
                  PURGE ALL {stats.total} REGISTERED PASSES?
                </h4>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: '#7f1d1d', marginTop: 6 }}>
                  This will permanently delete all claimed passes from the database and invalidate every issued QR code.
                </p>
              </div>

              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.88rem', color: 'var(--text-body)', marginBottom: 20, lineHeight: 1.6 }}>
                After this purge is executed, <strong>all alumni listed in the university master directory will be unlocked and permitted to register again</strong> from scratch.
              </p>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowResetAllModal(false)}
                  className="btn-neo-outline"
                  style={{ flex: 1, padding: '12px', borderRadius: 8 }}
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleResetAllAttendees}
                  disabled={actionLoading === 'resetAll'}
                  className="btn-neo-black"
                  style={{ flex: 2, background: '#dc2626', borderColor: '#7f1d1d', padding: '12px', fontSize: '0.8rem', borderRadius: 8 }}
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

