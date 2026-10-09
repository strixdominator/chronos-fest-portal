import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import * as XLSX from 'xlsx';
import { AlumniRecord, OtpRecord } from './types';
import { safeReadJson, safeWriteJson } from './storage';

declare global {
  var __ALUMNI_MASTER__: AlumniRecord[] | undefined;
  var __ACTIVE_OTPS__: Record<string, OtpRecord> | undefined;
  var __VERIFIED_SESSIONS__: Record<string, any> | undefined;
}

const DATA_DIR = path.join(process.cwd(), 'data');

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
  if (globalThis.__ALUMNI_MASTER__ && globalThis.__ALUMNI_MASTER__.length > 0) {
    return globalThis.__ALUMNI_MASTER__;
  }
  const loaded = safeReadJson<AlumniRecord[]>('alumni_master.json', INITIAL_ALUMNI_MASTER);
  globalThis.__ALUMNI_MASTER__ = loaded;
  return loaded;
}

export function saveAlumniMaster(list: AlumniRecord[]): void {
  globalThis.__ALUMNI_MASTER__ = list;
  safeWriteJson('alumni_master.json', list);
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

export function normalizeDepartmentName(raw?: string, fallback: string = 'Engineering'): string {
  if (!raw) return fallback;
  const nameOnly = raw.replace(/\.[a-zA-Z0-9]+$/, '').trim();
  const s = nameOnly.toLowerCase();

  if (s.includes('info') || s.includes('ise') || s === 'is') return 'ISE';
  if (s.includes('data') || s.includes('aids') || s.includes('ai&ds') || s.includes('ai & ds') || s === 'ad') return 'AI & DS';
  if (s.includes('machine') || s.includes('aiml') || s.includes('ai&ml') || s.includes('ai & ml') || s === 'am' || s === 'ci') return 'AI & ML';
  if (s.includes('electron') || s.includes('ece') || s === 'ec') return 'ECE';
  if (s.includes('mech') || s === 'me') return 'Mechanical';
  if (s.includes('civil') || s === 'cv') return 'Civil';
  if (s.includes('electrical') || s.includes('eee') || s === 'ee') return 'EEE';
  if (s.includes('telecom') || s.includes('tce') || s === 'te' || s === 'tc' || s.includes('ete')) return 'TCE';
  if (s.includes('mba') || s.includes('business admin') || s === 'ba') return 'MBA';
  if (
    s.includes('mtech') || 
    s.includes('m.tech') || 
    s.includes('master of tech') || 
    s === 'scs' || 
    s.includes('mde') ||
    s.includes('vlsi') ||
    s.includes('design engineering') ||
    s.includes('power system') ||
    fallback === 'M.Tech'
  ) return 'M.Tech';
  if (s.includes('computer') || s.includes('cse') || s === 'cs') return 'CSE';

  return fallback || nameOnly.toUpperCase();
}

export function normalizeRecordFromObject(
  row: Record<string, any>, 
  defaultDept: string = 'Engineering',
  defaultBatch: string = 'Alumni'
): AlumniRecord | null {
  const keys = Object.keys(row);
  const findVal = (patterns: string[]) => {
    const key = keys.find(k => patterns.some(p => k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(p)));
    return key ? String(row[key] || '').trim() : '';
  };

  const usn = findVal(['usn', 'roll', 'seat', 'regno', 'id', 'serial']);
  if (!usn || usn.length < 5 || /usn|sl\.?|total|heading|contact|directory|department|batch/i.test(usn)) return null;

  const fullName = findVal(['name', 'studentname', 'fullname', 'candidate']) || 'Graduate';
  if (/name|total|sl\.?|contact|directory|department/i.test(fullName)) return null;

  let officialEmail = findVal(['email', 'mail', 'emailid']).toLowerCase();
  if (officialEmail && (!officialEmail.includes('@') || officialEmail.includes(' '))) officialEmail = '';

  let phone = findVal(['phone', 'mobile', 'contact', 'cell']);
  if (phone) phone = phone.replace(/[^0-9+]/g, '');

  const deptVal = findVal(['dept', 'department', 'branch', 'course', 'special']);
  const department = deptVal ? normalizeDepartmentName(deptVal, defaultDept) : defaultDept;

  const batchVal = findVal(['batch', 'year', 'gradyear', 'passout', 'passing']);
  const cleanBatch = (defaultBatch || '').trim();
  const batchYear = batchVal || (cleanBatch.match(/^\d{4}$/) ? `Batch of ${cleanBatch}` : cleanBatch || 'Alumni');

  return {
    usn: usn.toUpperCase(),
    fullName,
    officialEmail,
    phone,
    department,
    batchYear,
  };
}

export function parseWorkbookBuffer(buffer: Buffer, fileName: string): AlumniRecord[] {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const detectedDept = normalizeDepartmentName(fileName);
  const records: AlumniRecord[] = [];

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;

    const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
    if (!rawRows || rawRows.length < 2) continue;

    let headerIdx = -1;
    let usnCol = -1;
    let nameCol = -1;
    let emailCol = -1;
    let phoneCol = -1;
    let deptCol = -1;
    let batchCol = -1;

    for (let r = 0; r < Math.min(15, rawRows.length); r++) {
      const row = rawRows[r];
      if (!Array.isArray(row)) continue;
      const validCols = row.filter(c => c !== undefined && c !== null && String(c).trim() !== '');
      if (validCols.length < 3) continue;

      const uIdx = row.findIndex(c => typeof c === 'string' && /\busn\b|\broll\b|\bseat\b|\breg\.?\s*no/i.test(c.trim()) && !/student|passed|collect|depart/i.test(c.trim()));
      const nIdx = row.findIndex(c => typeof c === 'string' && /\bname\b|student\s*name|candidate/i.test(c.trim()) && !/org|company|college|depart|collect|passed/i.test(c.trim()));
      if (uIdx !== -1 && nIdx !== -1 && uIdx !== nIdx) {
        headerIdx = r;
        usnCol = uIdx;
        nameCol = nIdx;
        emailCol = row.findIndex(c => typeof c === 'string' && /email|mail/i.test(c.trim()));
        phoneCol = row.findIndex(c => typeof c === 'string' && /phone|mobile|contact|cell/i.test(c.trim()));
        deptCol = row.findIndex(c => typeof c === 'string' && /dept|branch|course|special/i.test(c.trim()));
        batchCol = row.findIndex(c => typeof c === 'string' && /batch|passout|grad/i.test(c.trim()));

        // Also check if previous row had group headers (e.g. 'Contact Number' or 'E-mail ID' right above 'Primary')
        const prevRow = r > 0 && Array.isArray(rawRows[r - 1]) ? rawRows[r - 1] : [];
        if (emailCol === -1) {
          emailCol = prevRow.findIndex(c => typeof c === 'string' && /email|mail/i.test(c.trim()));
        }
        if (phoneCol === -1) {
          phoneCol = prevRow.findIndex(c => typeof c === 'string' && /phone|mobile|contact|cell/i.test(c.trim()));
        }
        break;
      }
    }

    if (headerIdx !== -1) {
      // Find actual data start: skip sub-header rows like 'Primary' / 'Alternate' if present
      let dataStart = headerIdx + 1;
      if (dataStart < rawRows.length && Array.isArray(rawRows[dataStart])) {
        const checkRow = rawRows[dataStart];
        const isSubHeader = checkRow.some(c => typeof c === 'string' && /primary|alternate|personal|official/i.test(c.trim()));
        if (isSubHeader) dataStart++;
      }

      for (let r = dataStart; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (!Array.isArray(row)) continue;
        const usnRaw = String(row[usnCol] || '').trim();
        const cleanUsn = usnRaw.toUpperCase();
        if (!cleanUsn || cleanUsn.length < 5 || /usn|sl\.?|total|heading|contact|directory|department|batch/i.test(cleanUsn)) continue;

        const nameRaw = String(row[nameCol] || '').trim();
        if (!nameRaw || /name|total|sl\.?|contact|directory|department/i.test(nameRaw)) continue;

        let email = emailCol !== -1 ? String(row[emailCol] || '').trim().toLowerCase() : '';
        if (!email || !email.includes('@')) {
          if (emailCol !== -1 && row[emailCol + 1]) {
            const altEmail = String(row[emailCol + 1]).trim().toLowerCase();
            if (altEmail.includes('@') && !altEmail.includes(' ')) email = altEmail;
          }
        }
        if (email && (!email.includes('@') || email.includes(' '))) email = '';

        let phone = phoneCol !== -1 ? String(row[phoneCol] || '').trim().replace(/[^0-9+]/g, '') : '';
        if (phone.length < 10 && phoneCol !== -1 && row[phoneCol + 1]) {
          const altPhone = String(row[phoneCol + 1]).trim().replace(/[^0-9+]/g, '');
          if (altPhone.length >= 10) phone = altPhone;
        }

        let dept = (detectedDept === 'M.Tech' || detectedDept === 'MBA')
          ? detectedDept
          : (deptCol !== -1 && row[deptCol] ? normalizeDepartmentName(String(row[deptCol]), detectedDept) : detectedDept);
        const cleanSheet = sheetName.trim();
        let batch = batchCol !== -1 && row[batchCol] ? String(row[batchCol]).trim() : (cleanSheet.match(/^\d{4}$/) ? `Batch of ${cleanSheet}` : cleanSheet);

        records.push({
          usn: cleanUsn,
          fullName: nameRaw,
          officialEmail: email,
          phone,
          department: dept,
          batchYear: batch,
        });
      }
    } else {
      const jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);
      for (const row of jsonRows) {
        const item = normalizeRecordFromObject(row, detectedDept, sheetName);
        if (item) records.push(item);
      }
    }
  }

  return records;
}

export function syncDataFolderWorkbooks(): {
  totalFiles: number;
  filesProcessed: string[];
  recordsParsed: number;
  departmentStats: Record<string, number>;
  added: number;
  updated: number;
  totalMaster: number;
} {
  ensureDir();
  const allFiles = fs.readdirSync(DATA_DIR);
  const spreadsheetFiles = allFiles.filter(f => /\.(xlsx|xls|csv)$/i.test(f) && !f.startsWith('~$'));

  let allParsedRecords: AlumniRecord[] = [];
  const filesProcessed: string[] = [];

  for (const fileName of spreadsheetFiles) {
    const fullPath = path.join(DATA_DIR, fileName);
    try {
      const buffer = fs.readFileSync(fullPath);
      const records = parseWorkbookBuffer(buffer, fileName);
      if (records.length > 0) {
        allParsedRecords = allParsedRecords.concat(records);
        filesProcessed.push(`${fileName} (${records.length} records)`);
      }
    } catch (err) {
      console.error(`Error reading ${fileName}:`, err);
    }
  }

  const departmentStats: Record<string, number> = {};
  for (const r of allParsedRecords) {
    departmentStats[r.department] = (departmentStats[r.department] || 0) + 1;
  }

  // To remove all previous branches data except CSE:
  // Retain existing CSE records (including manual additions like RAFI AHMAD Z),
  // and re-populate with all records from current uploaded department spreadsheets.
  const existing = getAlumniMaster();
  const cseOnly = existing.filter(item => {
    const d = (item.department || '').toLowerCase();
    return d.includes('cs') || d.includes('computer');
  });

  const map = new Map<string, AlumniRecord>();
  for (const item of cseOnly) {
    map.set(item.usn.trim().toUpperCase(), item);
  }

  let added = 0;
  let updated = 0;

  for (const record of allParsedRecords) {
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

  return {
    totalFiles: spreadsheetFiles.length,
    filesProcessed,
    recordsParsed: allParsedRecords.length,
    departmentStats,
    added,
    updated,
    totalMaster: result.length,
  };
}

const OTP_SECRET = process.env.OTP_SECRET || process.env.BREVO_API_KEY || 'milan-chronos-alumni-otp-hmac-secret-2026';

export function createStatelessOtpToken(
  usn: string,
  code: string,
  target: string,
  channel: 'EMAIL' | 'PHONE',
  expiresAt: number
): string {
  const cleanedUsn = usn.trim().toUpperCase();
  const signature = crypto
    .createHmac('sha256', OTP_SECRET)
    .update(`${cleanedUsn}:${code.trim()}:${expiresAt}:${channel}`)
    .digest('hex');
  const payload = {
    usn: cleanedUsn,
    target,
    channel,
    expiresAt,
    sig: signature,
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

export function verifyStatelessOtpToken(
  usn: string,
  inputCode: string,
  token: string
): { valid: boolean; target?: string; channel?: 'EMAIL' | 'PHONE'; error?: string } {
  try {
    const raw = Buffer.from(token, 'base64').toString('utf-8');
    const data = JSON.parse(raw);
    const cleanedUsn = usn.trim().toUpperCase();
    if (data.usn !== cleanedUsn) {
      return { valid: false, error: 'OTP token mismatch for this USN.' };
    }
    if (Date.now() > data.expiresAt) {
      return { valid: false, error: 'OTP has expired (valid for 10 minutes). Please request a new one.' };
    }
    const expectedSig = crypto
      .createHmac('sha256', OTP_SECRET)
      .update(`${cleanedUsn}:${inputCode.trim()}:${data.expiresAt}:${data.channel}`)
      .digest('hex');
    if (expectedSig !== data.sig) {
      return { valid: false, error: 'Incorrect OTP. Please enter the 6-digit code received.' };
    }
    return { valid: true, target: data.target, channel: data.channel };
  } catch {
    return { valid: false, error: 'Invalid verification token.' };
  }
}

function getActiveOtps(): Record<string, OtpRecord> {
  const disk = safeReadJson<Record<string, OtpRecord>>('active_otps.json', {});
  const memory = globalThis.__ACTIVE_OTPS__ || {};
  return { ...disk, ...memory };
}

function saveActiveOtps(otps: Record<string, OtpRecord>): void {
  globalThis.__ACTIVE_OTPS__ = otps;
  safeWriteJson('active_otps.json', otps);
}

// In-Memory & File-Backed OTP Store with Stateless HMAC fallback
export function createOtp(
  usn: string, 
  channel: 'EMAIL' | 'PHONE',
  customTarget?: string
): { otp: string; target: string; maskedTarget: string; statelessToken: string } | null {
  const alumnus = findAlumnusByUsn(usn);
  const target = customTarget || (channel === 'EMAIL' ? alumnus?.officialEmail : alumnus?.phone);
  if (!target) return null;

  const otps = getActiveOtps();
  const cleanedUsn = usn.trim().toUpperCase();

  // Generate 6-digit OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const maskedTarget = channel === 'EMAIL' ? maskEmail(target) : maskPhone(target);
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  otps[cleanedUsn] = {
    usn: cleanedUsn,
    code,
    channel,
    target,
    expiresAt,
  };

  saveActiveOtps(otps);
  const statelessToken = createStatelessOtpToken(cleanedUsn, code, target, channel, expiresAt);

  return { otp: code, target, maskedTarget, statelessToken };
}

export function verifyOtp(
  usn: string, 
  inputCode: string,
  statelessToken?: string
): { 
  valid: boolean; 
  error?: string; 
  target?: string; 
  channel?: 'EMAIL' | 'PHONE' 
} {
  const cleanedUsn = usn.trim().toUpperCase();
  const cleanCode = inputCode.trim();
  const otps = getActiveOtps();

  const record = otps[cleanedUsn];

  // 1. Primary Check: In-memory & disk active OTP store
  if (record) {
    if (Date.now() > record.expiresAt) {
      delete otps[cleanedUsn];
      saveActiveOtps(otps);
      return { valid: false, error: 'OTP has expired (valid for 10 minutes). Please request a new one.' };
    }

    if (record.code.trim() !== cleanCode) {
      return { valid: false, error: 'Incorrect OTP. Please enter the 6-digit code received.' };
    }

    const target = record.target;
    const channel = record.channel;

    // Consume OTP
    delete otps[cleanedUsn];
    saveActiveOtps(otps);

    return { valid: true, target, channel };
  }

  // 2. Secondary Resilient Check: Cryptographic Stateless Token
  // Protects against Render container rebuilds and Vercel multi-lambda cold starts
  if (statelessToken) {
    const statelessResult = verifyStatelessOtpToken(cleanedUsn, cleanCode, statelessToken);
    if (statelessResult.valid) {
      return { valid: true, target: statelessResult.target, channel: statelessResult.channel };
    }
    if (statelessResult.error && !statelessResult.error.includes('Invalid verification token')) {
      return { valid: false, error: statelessResult.error };
    }
  }

  return { valid: false, error: 'No active OTP found for this USN. Please request one.' };
}

export function createVerifiedSession(usn: string, contactInfo?: { email?: string; phone?: string }): string {
  const sessions = {
    ...safeReadJson<Record<string, any>>('verified_sessions.json', {}),
    ...(globalThis.__VERIFIED_SESSIONS__ || {})
  };

  const token = `VTOK_${Math.random().toString(36).substring(2, 8).toUpperCase()}_${Date.now()}`;
  sessions[token] = {
    usn: usn.trim().toUpperCase(),
    email: contactInfo?.email,
    phone: contactInfo?.phone,
    expiresAt: Date.now() + 20 * 60 * 1000, // 20 minutes to complete registration
  };

  globalThis.__VERIFIED_SESSIONS__ = sessions;
  safeWriteJson('verified_sessions.json', sessions);
  return token;
}

export function getSessionData(token: string): { usn: string; email?: string; phone?: string } | null {
  const sessions = {
    ...safeReadJson<Record<string, any>>('verified_sessions.json', {}),
    ...(globalThis.__VERIFIED_SESSIONS__ || {})
  };
  const record = sessions[token];
  if (!record) return null;
  if (Date.now() > record.expiresAt) return null;
  return record;
}

export function verifySessionToken(usn: string, token: string): boolean {
  const session = getSessionData(token);
  if (!session) return false;
  return session.usn.toUpperCase() === usn.trim().toUpperCase();
}

export function clearAlumniSession(usn?: string): void {
  const otps = getActiveOtps();
  if (usn) {
    delete otps[usn.trim().toUpperCase()];
  } else {
    for (const key of Object.keys(otps)) delete otps[key];
  }
  saveActiveOtps(otps);

  const sessions = {
    ...safeReadJson<Record<string, any>>('verified_sessions.json', {}),
    ...(globalThis.__VERIFIED_SESSIONS__ || {})
  };
  if (usn) {
    const cleanedUsn = usn.trim().toUpperCase();
    for (const token of Object.keys(sessions)) {
      if (sessions[token]?.usn?.toUpperCase() === cleanedUsn) {
        delete sessions[token];
      }
    }
  } else {
    for (const key of Object.keys(sessions)) delete sessions[key];
  }
  globalThis.__VERIFIED_SESSIONS__ = sessions;
  safeWriteJson('verified_sessions.json', sessions);
}

