import fs from 'fs';
import path from 'path';
import { AlumniRecord, OtpRecord } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const ALUMNI_FILE = path.join(DATA_DIR, 'alumni_master.json');
const OTPS_FILE = path.join(DATA_DIR, 'active_otps.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'verified_sessions.json');

const INITIAL_ALUMNI_MASTER: AlumniRecord[] = [
  {
    usn: "1MS20CS042",
    fullName: "Aarav Sharma",
    officialEmail: "aarav.sharma@alumni.college.edu",
    phone: "+91 98765 43210",
    department: "Computer Science & Engineering",
    batchYear: "Batch of 2024"
  },
  {
    usn: "1MS19EC115",
    fullName: "Priya Nair",
    officialEmail: "priya.nair@alumni.college.edu",
    phone: "+91 98234 56789",
    department: "Electronics & Communication",
    batchYear: "Batch of 2023"
  },
  {
    usn: "1MS20ME088",
    fullName: "Rohan Varma",
    officialEmail: "rohan.v@alumni.college.edu",
    phone: "+91 99112 23344",
    department: "Mechanical Engineering",
    batchYear: "Batch of 2024"
  },
  {
    usn: "1MS19BT032",
    fullName: "Ananya Iyer",
    officialEmail: "ananya.iyer@alumni.college.edu",
    phone: "+91 98450 12345",
    department: "Biotechnology",
    batchYear: "Batch of 2023"
  },
  {
    usn: "1MS20CS105",
    fullName: "Vikram Aditya",
    officialEmail: "vikram.aditya@gmail.com",
    phone: "+91 98111 22334",
    department: "Computer Science & Engineering",
    batchYear: "Batch of 2024"
  },
  {
    usn: "1MS18CV021",
    fullName: "Sneha Kulkarni",
    officialEmail: "sneha.k@outlook.com",
    phone: "+91 97444 55667",
    department: "Civil Engineering",
    batchYear: "Batch of 2022"
  },
  {
    usn: "1MS20IS055",
    fullName: "Tanvi Deshmukh",
    officialEmail: "tanvi.d@alumni.college.edu",
    phone: "+91 98999 11223",
    department: "Information Science & Engg",
    batchYear: "Batch of 2024"
  },
  {
    usn: "1MS19EE040",
    fullName: "Karthik Reddy",
    officialEmail: "karthik.reddy@gmail.com",
    phone: "+91 96555 44332",
    department: "Electrical & Electronics",
    batchYear: "Batch of 2023"
  },
  // Backward compatibility alias for earlier demo
  {
    usn: "2023CS104",
    fullName: "Aarav Sharma",
    officialEmail: "aarav.sharma@college.edu",
    phone: "+91 98765 43210",
    department: "Computer Science & Engineering",
    batchYear: "Batch of 2023"
  }
];

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function maskEmail(email?: string): string {
  if (!email || typeof email !== 'string') return '';
  const trimmed = email.trim();
  if (!trimmed || !trimmed.includes('@')) return trimmed;
  const [user, domain] = trimmed.split('@');
  if (user.length <= 2) return `${user[0]}*@${domain}`;
  const visibleStart = user.slice(0, 2);
  const visibleEnd = user.slice(-1);
  return `${visibleStart}••••${visibleEnd}@${domain}`;
}

export function maskPhone(phone?: string): string {
  if (!phone || typeof phone !== 'string') return '';
  const clean = phone.trim();
  if (!clean) return '';
  const digitsOnly = clean.replace(/\D/g, '');
  if (digitsOnly.length >= 10) {
    const last10 = digitsOnly.slice(-10);
    return `+91 ${last10.slice(0, 2)}•••• ••${last10.slice(-2)}`;
  }
  if (clean.length < 6) return clean;
  const prefix = clean.slice(0, Math.min(4, clean.length - 4));
  const suffix = clean.slice(-4);
  return `${prefix} •••• ••${suffix}`;
}

export function getAlumniMaster(): AlumniRecord[] {
  ensureDir();
  if (!fs.existsSync(ALUMNI_FILE)) {
    fs.writeFileSync(ALUMNI_FILE, JSON.stringify(INITIAL_ALUMNI_MASTER, null, 2));
    return INITIAL_ALUMNI_MASTER;
  }
  try {
    const raw = fs.readFileSync(ALUMNI_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return INITIAL_ALUMNI_MASTER;
  }
}

export function saveAlumniMaster(list: AlumniRecord[]): void {
  ensureDir();
  fs.writeFileSync(ALUMNI_FILE, JSON.stringify(list, null, 2));
}

export function findAlumnusByUsn(usn: string): AlumniRecord | undefined {
  const master = getAlumniMaster();
  const cleaned = usn.trim().toUpperCase();
  return master.find(a => a.usn.trim().toUpperCase() === cleaned);
}

export function importAlumniRecords(newRecords: AlumniRecord[]): { added: number; updated: number; total: number } {
  const existing = getAlumniMaster();
  const map = new Map<string, AlumniRecord>();

  for (const item of existing) {
    map.set(item.usn.trim().toUpperCase(), item);
  }

  let added = 0;
  let updated = 0;

  for (const record of newRecords) {
    if (!record.usn) continue;
    const key = record.usn.trim().toUpperCase();
    if (map.has(key)) {
      map.set(key, { ...map.get(key)!, ...record, usn: key });
      updated++;
    } else {
      map.set(key, { ...record, usn: key });
      added++;
    }
  }

  const result = Array.from(map.values());
  saveAlumniMaster(result);
  return { added, updated, total: result.length };
}

// In-Memory & File-Backed OTP Store
export function createOtp(
  usn: string, 
  channel: 'EMAIL' | 'PHONE',
  customTarget?: string
): { otp: string; target: string; maskedTarget: string } | null {
  const alumnus = findAlumnusByUsn(usn);
  const target = customTarget || (channel === 'EMAIL' ? alumnus?.officialEmail : alumnus?.phone);
  if (!target) return null;

  ensureDir();
  let otps: Record<string, OtpRecord> = {};
  if (fs.existsSync(OTPS_FILE)) {
    try {
      otps = JSON.parse(fs.readFileSync(OTPS_FILE, 'utf-8'));
    } catch {
      otps = {};
    }
  }

  // Generate 6-digit OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const maskedTarget = channel === 'EMAIL' ? maskEmail(target) : maskPhone(target);

  otps[usn.trim().toUpperCase()] = {
    usn: usn.trim().toUpperCase(),
    code,
    channel,
    target,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
  };

  fs.writeFileSync(OTPS_FILE, JSON.stringify(otps, null, 2));

  return { otp: code, target, maskedTarget };
}

export function verifyOtp(usn: string, inputCode: string): { 
  valid: boolean; 
  error?: string; 
  target?: string; 
  channel?: 'EMAIL' | 'PHONE' 
} {
  ensureDir();
  if (!fs.existsSync(OTPS_FILE)) {
    return { valid: false, error: 'No OTP requested. Please request an OTP first.' };
  }

  let otps: Record<string, OtpRecord> = {};
  try {
    otps = JSON.parse(fs.readFileSync(OTPS_FILE, 'utf-8'));
  } catch {
    return { valid: false, error: 'OTP record corrupted. Please request a new OTP.' };
  }

  const record = otps[usn.trim().toUpperCase()];
  if (!record) {
    return { valid: false, error: 'No active OTP found for this USN. Please request one.' };
  }

  if (Date.now() > record.expiresAt) {
    delete otps[usn.trim().toUpperCase()];
    fs.writeFileSync(OTPS_FILE, JSON.stringify(otps, null, 2));
    return { valid: false, error: 'OTP has expired (valid for 10 minutes). Please request a new one.' };
  }

  if (record.code.trim() !== inputCode.trim()) {
    return { valid: false, error: 'Incorrect OTP. Please enter the 6-digit code received.' };
  }

  const target = record.target;
  const channel = record.channel;

  // Consume OTP
  delete otps[usn.trim().toUpperCase()];
  fs.writeFileSync(OTPS_FILE, JSON.stringify(otps, null, 2));

  return { valid: true, target, channel };
}

export function createVerifiedSession(usn: string, contactInfo?: { email?: string; phone?: string }): string {
  ensureDir();
  let sessions: Record<string, { usn: string; email?: string; phone?: string; expiresAt: number }> = {};
  if (fs.existsSync(SESSIONS_FILE)) {
    try {
      sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
    } catch {
      sessions = {};
    }
  }

  const token = `VTOK_${Math.random().toString(36).substring(2, 8).toUpperCase()}_${Date.now()}`;
  sessions[token] = {
    usn: usn.trim().toUpperCase(),
    email: contactInfo?.email,
    phone: contactInfo?.phone,
    expiresAt: Date.now() + 20 * 60 * 1000, // 20 minutes to complete registration
  };

  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
  return token;
}

export function getSessionData(token: string): { usn: string; email?: string; phone?: string } | null {
  ensureDir();
  if (!fs.existsSync(SESSIONS_FILE)) return null;
  try {
    const sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
    const record = sessions[token];
    if (!record) return null;
    if (Date.now() > record.expiresAt) return null;
    return record;
  } catch {
    return null;
  }
}

export function verifySessionToken(usn: string, token: string): boolean {
  const session = getSessionData(token);
  if (!session) return false;
  return session.usn.toUpperCase() === usn.trim().toUpperCase();
}

export function clearAlumniSession(usn?: string): void {
  ensureDir();
  if (fs.existsSync(OTPS_FILE)) {
    try {
      if (usn) {
        const otps = JSON.parse(fs.readFileSync(OTPS_FILE, 'utf-8'));
        delete otps[usn.trim().toUpperCase()];
        fs.writeFileSync(OTPS_FILE, JSON.stringify(otps, null, 2));
      } else {
        fs.writeFileSync(OTPS_FILE, JSON.stringify({}, null, 2));
      }
    } catch {
      // ignore
    }
  }

  if (fs.existsSync(SESSIONS_FILE)) {
    try {
      if (usn) {
        const sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
        const cleanedUsn = usn.trim().toUpperCase();
        for (const token of Object.keys(sessions)) {
          if (sessions[token]?.usn?.toUpperCase() === cleanedUsn) {
            delete sessions[token];
          }
        }
        fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
      } else {
        fs.writeFileSync(SESSIONS_FILE, JSON.stringify({}, null, 2));
      }
    } catch {
      // ignore
    }
  }
}

