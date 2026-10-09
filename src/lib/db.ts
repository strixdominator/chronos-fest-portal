import fs from 'fs';
import path from 'path';
import { Attendee, EventSettings, AttendeeStatus } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const ATTENDEES_FILE = path.join(DATA_DIR, 'attendees.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

const DEFAULT_SETTINGS: EventSettings = {
  eventName: "CHRONOS FEST 2026",
  tagline: "The Future of Beats & Innovation | University Grand Finale",
  eventDate: "Saturday, October 24, 2026",
  eventTime: "04:30 PM Onwards (Gates Close at 07:00 PM)",
  eventVenue: "University Grand Arena & Central Amphitheatre",
  organizer: "Student Council & Security Affairs Committee",
  totalCapacity: 1000,
  isRegistrationOpen: true,
  wristbandColors: ["Neon Cyan (General)", "Electric Violet (VIP/Performer)", "Amber Gold (Council Staff)"],
};

const INITIAL_ATTENDEES: Attendee[] = [
  {
    id: "ATT-1001",
    fullName: "Aarav Sharma",
    email: "aarav.sharma@college.edu",
    phone: "+91 98765 43210",
    rollNumber: "2023CS104",
    department: "Computer Science & Engineering",
    year: "3rd Year",
    ticketCode: "TKT-CHRONOS-8942",
    status: "APPROVED",
    checkedIn: false,
    registeredAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    approvedAt: new Date(Date.now() - 86400000).toISOString(),
    wristbandColor: "Neon Cyan (General)",
  },
  {
    id: "ATT-1002",
    fullName: "Priya Nair",
    email: "priya.nair@college.edu",
    phone: "+91 98234 56789",
    rollNumber: "2022EC215",
    department: "Electronics & Communication",
    year: "4th Year",
    ticketCode: "TKT-CHRONOS-3129",
    status: "APPROVED",
    checkedIn: true,
    checkedInAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    checkedInBy: "Gate Volunteer #1 (North Arch)",
    registeredAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    approvedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    wristbandColor: "Neon Cyan (General)",
  },
  {
    id: "ATT-1003",
    fullName: "Rohan Varma",
    email: "rohan.v@college.edu",
    phone: "+91 99112 23344",
    rollNumber: "2024ME089",
    department: "Mechanical Engineering",
    year: "2nd Year",
    ticketCode: "TKT-CHRONOS-7410",
    status: "PENDING",
    checkedIn: false,
    registeredAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: "ATT-1004",
    fullName: "Ananya Iyer",
    email: "ananya.iyer@college.edu",
    phone: "+91 98450 12345",
    rollNumber: "2023BT032",
    department: "Biotechnology",
    year: "3rd Year",
    ticketCode: "TKT-CHRONOS-6591",
    status: "PENDING",
    checkedIn: false,
    registeredAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "ATT-1005",
    fullName: "Kunal Mehra",
    email: "kunal.fake@gmail.com",
    phone: "+91 91234 56789",
    rollNumber: "UNKNOWN-999",
    department: "Information Technology",
    year: "1st Year",
    ticketCode: "TKT-CHRONOS-1102",
    status: "REJECTED",
    rejectionReason: "Invalid Student ID card provided. Not enrolled in college records.",
    checkedIn: false,
    registeredAt: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: "ATT-1006",
    fullName: "Sneha Patel",
    email: "sneha.p@college.edu",
    phone: "+91 97654 32198",
    rollNumber: "2022CS241",
    department: "Computer Science & Engineering",
    year: "4th Year",
    ticketCode: "TKT-CHRONOS-9943",
    status: "APPROVED",
    checkedIn: false,
    registeredAt: new Date(Date.now() - 86400000).toISOString(),
    approvedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    wristbandColor: "Neon Cyan (General)",
  }
];

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getSettings(): EventSettings {
  ensureDir();
  if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2));
    return DEFAULT_SETTINGS;
  }
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function updateSettings(newSettings: Partial<EventSettings>): EventSettings {
  ensureDir();
  const current = getSettings();
  const updated = { ...current, ...newSettings };
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2));
  return updated;
}

export function getAttendees(): Attendee[] {
  ensureDir();
  if (!fs.existsSync(ATTENDEES_FILE)) {
    fs.writeFileSync(ATTENDEES_FILE, JSON.stringify(INITIAL_ATTENDEES, null, 2));
    return INITIAL_ATTENDEES;
  }
  try {
    const raw = fs.readFileSync(ATTENDEES_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return INITIAL_ATTENDEES;
  }
}

export function saveAttendees(attendees: Attendee[]): void {
  ensureDir();
  fs.writeFileSync(ATTENDEES_FILE, JSON.stringify(attendees, null, 2));
}

export function getAttendeeById(id: string): Attendee | undefined {
  const attendees = getAttendees();
  return attendees.find(a => a.id.toLowerCase() === id.toLowerCase());
}

export function getAttendeeByTicketCode(code: string): Attendee | undefined {
  const attendees = getAttendees();
  const cleaned = code.trim().toLowerCase();
  return attendees.find(a => 
    a.ticketCode.toLowerCase() === cleaned || 
    a.id.toLowerCase() === cleaned
  );
}

export function createAttendee(
  data: Omit<Attendee, 'id' | 'ticketCode' | 'status' | 'checkedIn' | 'registeredAt'> & { 
    isVerifiedOtp?: boolean;
    familyCount?: number;
    familyMembers?: { name: string; relation: string; age?: string }[];
  }
): { success: boolean; attendee?: Attendee; error?: string } {
  const attendees = getAttendees();
  const usnKey = (data.usn || data.rollNumber).trim().toUpperCase();

  // Check duplicate roll number / USN or email
  const existing = attendees.find(
    a => (a.usn || a.rollNumber).trim().toUpperCase() === usnKey ||
         a.email.trim().toLowerCase() === data.email.trim().toLowerCase()
  );

  if (existing) {
    return {
      success: false,
      error: `An entry pass is already registered for USN "${usnKey}". Please look up your ticket pass.`
    };
  }

  // Generate unique codes
  const count = attendees.length + 1001;
  const id = `ATT-${count}`;
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const ticketCode = `TKT-CHRONOS-${randomSuffix}${Math.floor(1000 + Math.random() * 9000)}`;

  const isApproved = Boolean(data.isVerifiedOtp);
  const familyCount = Math.min(4, Math.max(0, Number(data.familyCount) || 0));
  const totalQuota = 1 + familyCount;
  const familyMembers = Array.isArray(data.familyMembers) ? data.familyMembers.slice(0, familyCount) : [];

  const newAttendee: Attendee = {
    ...data,
    usn: usnKey,
    rollNumber: usnKey,
    id,
    ticketCode,
    status: isApproved ? 'APPROVED' : 'PENDING',
    approvedAt: isApproved ? new Date().toISOString() : undefined,
    verificationMethod: isApproved ? 'OTP_VERIFIED' : 'MANUAL_REVIEW_REQUEST',
    checkedIn: false,
    registeredAt: new Date().toISOString(),
    wristbandColor: "Neon Cyan (General)",
    familyCount,
    familyMembers,
    totalQuota,
    admittedCount: 0,
    checkInLogs: [],
  };

  attendees.unshift(newAttendee);
  saveAttendees(attendees);

  return { success: true, attendee: newAttendee };
}

export function updateAttendeeStatus(
  id: string, 
  status: AttendeeStatus, 
  rejectionReason?: string,
  wristbandColor?: string
): Attendee | null {
  const attendees = getAttendees();
  const index = attendees.findIndex(a => a.id.toLowerCase() === id.toLowerCase());
  if (index === -1) return null;

  attendees[index].status = status;
  if (status === 'APPROVED') {
    attendees[index].approvedAt = new Date().toISOString();
    attendees[index].rejectionReason = undefined;
    if (wristbandColor) {
      attendees[index].wristbandColor = wristbandColor;
    }
  } else if (status === 'REJECTED') {
    attendees[index].rejectionReason = rejectionReason || "Details did not match official college records.";
  }

  saveAttendees(attendees);
  return attendees[index];
}

export function bulkApproveAttendees(ids: string[]): number {
  const attendees = getAttendees();
  let count = 0;
  const idSet = new Set(ids.map(i => i.toLowerCase()));

  for (const attendee of attendees) {
    if (idSet.has(attendee.id.toLowerCase()) && attendee.status === 'PENDING') {
      attendee.status = 'APPROVED';
      attendee.approvedAt = new Date().toISOString();
      count++;
    }
  }

  if (count > 0) {
    saveAttendees(attendees);
  }
  return count;
}

export function normalizeScanCode(rawCode: string): string {
  if (!rawCode || typeof rawCode !== 'string') return '';
  let cleaned = rawCode.trim();

  // Try decoding URI component
  try {
    cleaned = decodeURIComponent(cleaned);
  } catch {}

  // If JSON payload was passed
  try {
    if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
      const parsed = JSON.parse(cleaned);
      cleaned = parsed.ticketCode || parsed.id || parsed.code || parsed.usn || cleaned;
    }
  } catch {}

  // If full URL with /ticket/[id]
  if (cleaned.includes('/ticket/')) {
    const afterTicket = cleaned.split('/ticket/')[1];
    if (afterTicket) {
      cleaned = afterTicket.split('?')[0].split('#')[0].split('/')[0].trim();
    }
  }

  // If query parameter ?code=... or ?ticket=... or ?id=... or ?usn=...
  if (cleaned.includes('code=')) {
    const m = cleaned.match(/[?&]code=([^&#]+)/);
    if (m) cleaned = m[1].trim();
  } else if (cleaned.includes('ticket=')) {
    const m = cleaned.match(/[?&]ticket=([^&#]+)/);
    if (m) cleaned = m[1].trim();
  } else if (cleaned.includes('id=')) {
    const m = cleaned.match(/[?&]id=([^&#]+)/);
    if (m) cleaned = m[1].trim();
  } else if (cleaned.includes('usn=')) {
    const m = cleaned.match(/[?&]usn=([^&#]+)/);
    if (m) cleaned = m[1].trim();
  }

  // Strip trailing slashes, hashes, query strings
  cleaned = cleaned.split('?')[0].split('#')[0].replace(/\/+$/, '').trim();

  return cleaned;
}

export function getScanPreview(ticketOrId: string): {
  status: 'READY' | 'ALREADY_CHECKED_IN' | 'PENDING' | 'REJECTED' | 'NOT_FOUND';
  message: string;
  attendee?: Attendee;
  totalQuota: number;
  admittedCount: number;
  remaining: number;
} {
  const attendees = getAttendees();
  const query = normalizeScanCode(ticketOrId).toLowerCase();

  const attendee = attendees.find(a => 
    a.ticketCode.toLowerCase() === query || 
    a.id.toLowerCase() === query ||
    (a.usn && a.usn.toLowerCase() === query) ||
    a.rollNumber.toLowerCase() === query
  );

  if (!attendee) {
    return {
      status: 'NOT_FOUND',
      message: 'Invalid Ticket or QR Code. No registration found in system.',
      totalQuota: 0,
      admittedCount: 0,
      remaining: 0,
    };
  }

  const totalQuota = attendee.totalQuota || (1 + (attendee.familyCount || 0));
  const admittedCount = attendee.admittedCount ?? (attendee.checkedIn ? totalQuota : 0);
  const remaining = Math.max(0, totalQuota - admittedCount);

  if (attendee.status === 'PENDING') {
    return {
      status: 'PENDING',
      message: 'Entry Denied: Registration is PENDING APPROVAL by the committee.',
      attendee,
      totalQuota,
      admittedCount,
      remaining,
    };
  }

  if (attendee.status === 'REJECTED') {
    return {
      status: 'REJECTED',
      message: `Entry Denied: Registration was REJECTED (${attendee.rejectionReason || 'Invalid Graduate ID'}).`,
      attendee,
      totalQuota,
      admittedCount,
      remaining,
    };
  }

  if (remaining <= 0) {
    const lastCheckIn = attendee.checkInLogs && attendee.checkInLogs.length > 0
      ? attendee.checkInLogs[attendee.checkInLogs.length - 1]
      : null;
    const timeStr = lastCheckIn ? new Date(lastCheckIn.timestamp).toLocaleTimeString() : (attendee.checkedInAt ? new Date(attendee.checkedInAt).toLocaleTimeString() : 'earlier');
    
    return {
      status: 'ALREADY_CHECKED_IN',
      message: `PASS QUOTA EXHAUSTED: All ${totalQuota} of ${totalQuota} members have already entered! Last checked in at ${timeStr}.`,
      attendee,
      totalQuota,
      admittedCount,
      remaining: 0,
    };
  }

  return {
    status: 'READY',
    message: admittedCount > 0 
      ? `Partial entry active: ${admittedCount} already admitted, ${remaining} admissions remaining.`
      : `Verified pass: ${totalQuota} total admission(s) available.`,
    attendee,
    totalQuota,
    admittedCount,
    remaining,
  };
}

export function checkInAttendee(
  ticketOrId: string, 
  volunteerName = "Main Gate Staff",
  admittingCount?: number
): {
  status: 'SUCCESS' | 'PARTIAL_ENTRY' | 'ALREADY_CHECKED_IN' | 'PENDING' | 'REJECTED' | 'NOT_FOUND';
  message: string;
  attendee?: Attendee;
  admittedNow?: number;
  remaining?: number;
  totalQuota?: number;
} {
  const attendees = getAttendees();
  const query = normalizeScanCode(ticketOrId).toLowerCase();
  
  const attendee = attendees.find(a => 
    a.ticketCode.toLowerCase() === query || 
    a.id.toLowerCase() === query ||
    (a.usn && a.usn.toLowerCase() === query) ||
    a.rollNumber.toLowerCase() === query
  );

  if (!attendee) {
    return {
      status: 'NOT_FOUND',
      message: 'Invalid Ticket or QR Code. No registration found in system.',
    };
  }

  if (attendee.status === 'PENDING') {
    return {
      status: 'PENDING',
      message: 'Entry Denied: Registration is still PENDING APPROVAL by admin team.',
      attendee,
    };
  }

  if (attendee.status === 'REJECTED') {
    return {
      status: 'REJECTED',
      message: `Entry Denied: Registration was REJECTED (${attendee.rejectionReason || 'Invalid Student ID'}).`,
      attendee,
    };
  }

  const totalQuota = attendee.totalQuota || (1 + (attendee.familyCount || 0));
  const currentAdmitted = attendee.admittedCount ?? (attendee.checkedIn ? totalQuota : 0);
  const currentRemaining = Math.max(0, totalQuota - currentAdmitted);

  if (currentRemaining <= 0) {
    return {
      status: 'ALREADY_CHECKED_IN',
      message: `FRAUD ALERT: All ${totalQuota} of ${totalQuota} quotas already admitted! All wristbands were issued.`,
      attendee,
      remaining: 0,
      totalQuota,
    };
  }

  // How many members are entering in this scan
  const requested = (admittingCount !== undefined && admittingCount > 0) ? admittingCount : currentRemaining;
  const countToAdmit = Math.min(requested, currentRemaining);
  const newAdmitted = currentAdmitted + countToAdmit;
  const newRemaining = totalQuota - newAdmitted;
  const isFullyExhausted = newRemaining <= 0;

  attendee.totalQuota = totalQuota;
  attendee.admittedCount = newAdmitted;
  attendee.checkedIn = isFullyExhausted;
  attendee.checkedInAt = new Date().toISOString();
  attendee.checkedInBy = volunteerName;

  if (!attendee.checkInLogs) {
    attendee.checkInLogs = [];
  }
  attendee.checkInLogs.push({
    timestamp: new Date().toISOString(),
    admitted: countToAdmit,
    gateVolunteer: volunteerName,
    notes: isFullyExhausted ? `Quota completed (${newAdmitted}/${totalQuota})` : `Partial entry (${newAdmitted}/${totalQuota})`
  });

  saveAttendees(attendees);

  if (isFullyExhausted) {
    return {
      status: 'SUCCESS',
      message: `FINAL ENTRY GRANTED! Admitted ${countToAdmit} member(s). All ${totalQuota} of ${totalQuota} quotas are used. Issue ${countToAdmit} ${attendee.wristbandColor || 'Neon Cyan'} wristband(s). Pass is now EXPIRED.`,
      attendee,
      admittedNow: countToAdmit,
      remaining: 0,
      totalQuota,
    };
  }

  return {
    status: 'PARTIAL_ENTRY',
    message: `PARTIAL ENTRY GRANTED! Admitted ${countToAdmit} member(s). Issue ${countToAdmit} ${attendee.wristbandColor || 'Neon Cyan'} wristband(s). ${newRemaining} admission(s) remaining for late arrivals.`,
    attendee,
    admittedNow: countToAdmit,
    remaining: newRemaining,
    totalQuota,
  };
}

export function resetCheckIn(id: string): Attendee | null {
  const attendees = getAttendees();
  const index = attendees.findIndex(a => a.id.toLowerCase() === id.toLowerCase());
  if (index === -1) return null;

  attendees[index].checkedIn = false;
  attendees[index].checkedInAt = undefined;
  attendees[index].checkedInBy = undefined;
  attendees[index].admittedCount = 0;
  attendees[index].checkInLogs = [];
  saveAttendees(attendees);
  return attendees[index];
}

export function deleteAttendee(idOrUsn: string): { success: boolean; deletedAttendee?: Attendee; error?: string } {
  const attendees = getAttendees();
  const query = idOrUsn.trim().toLowerCase();
  const index = attendees.findIndex(a => 
    a.id.toLowerCase() === query || 
    (a.usn && a.usn.toLowerCase() === query) ||
    a.rollNumber.toLowerCase() === query ||
    a.ticketCode.toLowerCase() === query
  );

  if (index === -1) {
    return { success: false, error: 'Attendee pass not found.' };
  }

  const [deleted] = attendees.splice(index, 1);
  saveAttendees(attendees);
  return { success: true, deletedAttendee: deleted };
}

export function deleteAllAttendees(): { success: boolean; count: number } {
  const attendees = getAttendees();
  const count = attendees.length;
  saveAttendees([]);
  return { success: true, count };
}

export function deleteSelectedAttendees(ids: string[]): { success: boolean; count: number } {
  const attendees = getAttendees();
  const idSet = new Set(ids.map(i => i.trim().toLowerCase()));
  const remaining = attendees.filter(a => 
    !idSet.has(a.id.toLowerCase()) && 
    !(a.usn && idSet.has(a.usn.toLowerCase())) &&
    !idSet.has(a.rollNumber.toLowerCase())
  );
  const count = attendees.length - remaining.length;
  saveAttendees(remaining);
  return { success: true, count };
}

