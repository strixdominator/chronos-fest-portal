import crypto from 'crypto';
import { Attendee, EventSettings, AttendeeStatus } from './types';
import { sql } from './neon';
import { supabase, isSupabaseConfigured } from './supabase';
import { safeReadJson, safeWriteJson } from './storage';

// ─── DUAL-WRITE MIRROR HELPER ─────────────────────────────────────────────────
// Mirror writes to Supabase in the background for live dual-redundancy
function mirrorToSupabase(action: () => any): void {
  if (!isSupabaseConfigured) return;
  try {
    Promise.resolve(action()).catch(err => {
      console.warn('[DB DUAL-WRITE] Supabase mirror skipped:', err?.message || err);
    });
  } catch {}
}

function attendeeToRow(a: Attendee) {
  return {
    id: a.id,
    ticket_code: a.ticketCode,
    full_name: a.fullName,
    email: a.email,
    phone: a.phone || '',
    roll_number: a.rollNumber,
    usn: a.usn,
    department: a.department || '',
    year: a.year || '',
    id_card_url: a.idCardUrl || null,
    degree_proof_url: a.degreeProofUrl || null,
    status: a.status,
    rejection_reason: a.rejectionReason || null,
    checked_in: a.checkedIn,
    checked_in_at: a.checkedInAt || null,
    checked_in_by: a.checkedInBy || null,
    registered_at: a.registeredAt,
    approved_at: a.approvedAt || null,
    wristband_color: a.wristbandColor || 'Neon Cyan (General)',
    wristband_number: a.wristbandNumber || null,
    notes: a.notes || null,
    organization: a.organization || null,
    designation: a.designation || null,
    family_count: a.familyCount || 0,
    family_members: a.familyMembers || [],
    total_quota: a.totalQuota || 1,
    admitted_count: a.admittedCount || 0,
    check_in_logs: a.checkInLogs || [],
    verification_method: a.verificationMethod || null,
    is_contact_updated: Boolean(a.isContactUpdated),
    original_email: a.originalEmail || null,
    original_phone: a.originalPhone || null,
    review_reason: a.reviewReason || null,
  };
}

// ─── DEFAULT SETTINGS ──────────────────────────────────────────────────────────
const DEFAULT_SETTINGS: EventSettings = {
  eventName: 'MILAN 2026',
  tagline: 'DBIT Alumni Association | Reconnecting Relations',
  eventDate: 'Saturday, November 7, 2026',
  eventTime: '02:30 PM',
  gatesOpenTime: '02:00 PM',
  eventVenue: 'DBIT Cricket Ground, Bangalore',
  organizer: 'DBIT Alumni Association',
  totalCapacity: 1000,
  isRegistrationOpen: true,
  wristbandColors: ['Royal Blue (Alumni)', 'Gold (VIP/Staff)', 'Navy Blue (General)'],
};

// ─── LOCAL STORAGE FALLBACK HELPERS ───────────────────────────────────────────
function getLocalAttendees(): Attendee[] {
  const list = safeReadJson<any[]>('attendees.json', []);
  return list.map(item => {
    if (item && item.ticket_code && !item.ticketCode) {
      return rowToAttendee(item);
    }
    return item as Attendee;
  });
}

function saveLocalAttendees(list: Attendee[]): void {
  safeWriteJson('attendees.json', list);
}

function saveLocalAttendee(attendee: Attendee): void {
  try {
    const list = getLocalAttendees();
    const usnKey = (attendee.usn || attendee.rollNumber || '').toUpperCase();
    const idx = list.findIndex(a => a.id === attendee.id || (usnKey && (a.usn || a.rollNumber || '').toUpperCase() === usnKey));
    if (idx >= 0) {
      list[idx] = attendee;
    } else {
      list.unshift(attendee);
    }
    saveLocalAttendees(list);
  } catch (err) {
    console.warn('[DB] Failed to save attendee locally:', err);
  }
}

// ─── ROW MAPPERS ───────────────────────────────────────────────────────────────

function rowToAttendee(row: any): Attendee {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    rollNumber: row.roll_number,
    usn: row.usn,
    department: row.department,
    year: row.year,
    batchYear: row.year,
    idCardUrl: row.id_card_url,
    degreeProofUrl: row.degree_proof_url,
    ticketCode: row.ticket_code,
    status: row.status as AttendeeStatus,
    rejectionReason: row.rejection_reason,
    checkedIn: Boolean(row.checked_in),
    checkedInAt: row.checked_in_at,
    checkedInBy: row.checked_in_by,
    registeredAt: row.registered_at,
    approvedAt: row.approved_at,
    wristbandColor: row.wristband_color,
    wristbandNumber: row.wristband_number,
    notes: row.notes,
    organization: row.organization,
    designation: row.designation,
    familyCount: row.family_count ?? 0,
    familyMembers: row.family_members ?? [],
    totalQuota: row.total_quota ?? 1,
    admittedCount: row.admitted_count ?? 0,
    checkInLogs: row.check_in_logs ?? [],
    verificationMethod: row.verification_method,
    isContactUpdated: Boolean(row.is_contact_updated),
    originalEmail: row.original_email,
    originalPhone: row.original_phone,
    reviewReason: row.review_reason,
  };
}

function rowToSettings(row: any): EventSettings {
  return {
    eventName: row.event_name,
    tagline: row.tagline,
    eventDate: row.event_date,
    eventTime: row.event_time,
    gatesOpenTime: row.gates_open_time,
    eventVenue: row.event_venue,
    organizer: row.organizer,
    totalCapacity: row.total_capacity,
    isRegistrationOpen: row.is_registration_open,
    wristbandColors: Array.isArray(row.wristband_colors)
      ? row.wristband_colors
      : ['Royal Blue (Alumni)', 'Gold (VIP/Staff)', 'Navy Blue (General)'],
  };
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<EventSettings> {
  try {
    const rows = await sql`SELECT * FROM settings WHERE id = 1 LIMIT 1;`;
    if (rows && rows.length > 0) {
      return rowToSettings(rows[0]);
    }
  } catch (e) {
    console.warn('[DB] Neon getSettings failed, falling back to Supabase:', e);
    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
        if (data) return rowToSettings(data);
      } catch {}
    }
  }
  return DEFAULT_SETTINGS;
}

export async function updateSettings(newSettings: Partial<EventSettings>): Promise<EventSettings> {
  const current = await getSettings();
  const merged = { ...current, ...newSettings };

  try {
    await sql`
      INSERT INTO settings (
        id, event_name, tagline, event_date, event_time, gates_open_time,
        event_venue, organizer, total_capacity, is_registration_open, wristband_colors, updated_at
      ) VALUES (
        1, ${merged.eventName}, ${merged.tagline}, ${merged.eventDate}, ${merged.eventTime},
        ${merged.gatesOpenTime}, ${merged.eventVenue}, ${merged.organizer}, ${merged.totalCapacity},
        ${merged.isRegistrationOpen}, ${JSON.stringify(merged.wristbandColors)}, NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        event_name = EXCLUDED.event_name,
        tagline = EXCLUDED.tagline,
        event_date = EXCLUDED.event_date,
        event_time = EXCLUDED.event_time,
        gates_open_time = EXCLUDED.gates_open_time,
        event_venue = EXCLUDED.event_venue,
        organizer = EXCLUDED.organizer,
        total_capacity = EXCLUDED.total_capacity,
        is_registration_open = EXCLUDED.is_registration_open,
        wristband_colors = EXCLUDED.wristband_colors,
        updated_at = NOW();
    `;
    // Dual-write mirror to Supabase
    mirrorToSupabase(() => supabase.from('settings').upsert({
      id: 1,
      event_name: merged.eventName,
      tagline: merged.tagline,
      event_date: merged.eventDate,
      event_time: merged.eventTime,
      gates_open_time: merged.gatesOpenTime,
      event_venue: merged.eventVenue,
      organizer: merged.organizer,
      total_capacity: merged.totalCapacity,
      is_registration_open: merged.isRegistrationOpen,
      wristband_colors: merged.wristbandColors,
    }));
  } catch (e) {
    console.warn('[DB] Neon updateSettings failed:', e);
  }

  return merged;
}

// ─── ATTENDEES STATS (ULTRA-LIGHTWEIGHT < 1KB BANDWIDTH) ─────────────────────

export async function getAttendeeStats(): Promise<{
  total: number;
  capacity: number;
  pending: number;
  approved: number;
  checkedIn: number;
  admittedPeople: number;
  remainingAtGate: number;
  rejected: number;
}> {
  try {
    const counts = await sql`
      SELECT
        count(*)::int as total,
        count(*) FILTER (WHERE status = 'PENDING')::int as pending,
        count(*) FILTER (WHERE status = 'APPROVED')::int as approved,
        count(*) FILTER (WHERE status = 'REJECTED')::int as rejected,
        count(*) FILTER (WHERE checked_in = true)::int as checked_in,
        coalesce(sum(case when checked_in = true then greatest(coalesce(admitted_count, 1), 1) else coalesce(admitted_count, 0) end), 0)::int as admitted_people
      FROM attendees;
    `;
    const settings = await getSettings();
    if (counts && counts.length > 0) {
      const r = counts[0];
      return {
        total: r.total || 0,
        capacity: settings.totalCapacity,
        pending: r.pending || 0,
        approved: r.approved || 0,
        checkedIn: r.checked_in || 0,
        admittedPeople: r.admitted_people || r.checked_in || 0,
        remainingAtGate: Math.max(0, (r.approved || 0) - (r.checked_in || 0)),
        rejected: r.rejected || 0,
      };
    }
  } catch (err) {
    console.warn('[DB] Neon getAttendeeStats failed, falling back to Supabase:', err);
    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase.from('attendees').select('status, checked_in, admitted_count, total_quota');
        if (data) {
          const settings = await getSettings();
          const pending = data.filter(a => a.status === 'PENDING').length;
          const approved = data.filter(a => a.status === 'APPROVED').length;
          const rejected = data.filter(a => a.status === 'REJECTED').length;
          const checkedIn = data.filter(a => a.checked_in).length;
          const admittedPeople = data.reduce((acc, a) => {
            if (a.admitted_count && a.admitted_count > 0) return acc + a.admitted_count;
            if (a.checked_in) return acc + (a.total_quota || 1);
            return acc;
          }, 0);
          return {
            total: data.length,
            capacity: settings.totalCapacity,
            pending,
            approved,
            checkedIn,
            admittedPeople,
            remainingAtGate: Math.max(0, approved - checkedIn),
            rejected,
          };
        }
      } catch {}
    }
  }

  const local = getLocalAttendees();
  const settings = await getSettings();
  const pending = local.filter(a => a.status === 'PENDING').length;
  const approved = local.filter(a => a.status === 'APPROVED').length;
  const rejected = local.filter(a => a.status === 'REJECTED').length;
  const checkedIn = local.filter(a => a.checkedIn).length;
  const admittedPeople = local.reduce((acc, a) => {
    if (a.admittedCount && a.admittedCount > 0) return acc + a.admittedCount;
    if (a.checkedIn) return acc + (a.totalQuota || 1);
    return acc;
  }, 0);
  return {
    total: local.length,
    capacity: settings.totalCapacity,
    pending,
    approved,
    checkedIn,
    admittedPeople,
    remainingAtGate: Math.max(0, approved - checkedIn),
    rejected,
  };
}

// ─── ATTENDEES ────────────────────────────────────────────────────────────────

export async function getAttendees(): Promise<Attendee[]> {
  try {
    // Optimized: Do NOT fetch massive base64 image columns in list queries to save 99.2% network bandwidth
    const rows = await sql`
      SELECT
        id, ticket_code, full_name, email, phone, roll_number, usn,
        department, year, status, rejection_reason, checked_in, checked_in_at,
        checked_in_by, registered_at, approved_at, wristband_color, wristband_number,
        notes, organization, designation, family_count, family_members, total_quota,
        admitted_count, check_in_logs, verification_method, is_contact_updated,
        original_email, original_phone, review_reason,
        CASE WHEN id_card_url IS NOT NULL THEN 'EXISTS' ELSE NULL END as id_card_url,
        CASE WHEN degree_proof_url IS NOT NULL THEN 'EXISTS' ELSE NULL END as degree_proof_url
      FROM attendees
      ORDER BY registered_at DESC;
    `;
    if (rows && Array.isArray(rows) && rows.length > 0) {
      const list = rows.map(rowToAttendee);
      saveLocalAttendees(list);
      return list;
    }
  } catch (err: any) {
    console.warn('[DB] Neon getAttendees failed, falling back to Supabase:', err?.message || err);
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('attendees')
          .select('id, ticket_code, full_name, email, phone, roll_number, usn, department, year, status, rejection_reason, checked_in, checked_in_at, checked_in_by, registered_at, approved_at, wristband_color, wristband_number, notes, organization, designation, family_count, family_members, total_quota, admitted_count, check_in_logs, verification_method, is_contact_updated, original_email, original_phone, review_reason, id_card_url, degree_proof_url')
          .order('registered_at', { ascending: false });
        if (!error && data && data.length > 0) {
          console.log('[DB] Supabase getAttendees fallback succeeded, count:', data.length);
          const list = data.map(rowToAttendee);
          saveLocalAttendees(list);
          return list;
        }
      } catch (sErr) {
        console.warn('[DB] Supabase getAttendees fallback error:', sErr);
      }
    }
  }

  return getLocalAttendees();
}

export async function getAttendeeById(id: string): Promise<Attendee | undefined> {
  const cleanId = id.trim();
  try {
    const rows = await sql`
      SELECT * FROM attendees WHERE id ILIKE ${cleanId} LIMIT 1;
    `;
    if (rows && rows.length > 0) {
      const attendee = rowToAttendee(rows[0]);
      saveLocalAttendee(attendee);
      return attendee;
    }
  } catch (err) {
    console.warn('[DB] Neon getAttendeeById failed, falling back to Supabase:', err);
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('attendees').select('*').ilike('id', cleanId).maybeSingle();
        if (!error && data) {
          const attendee = rowToAttendee(data);
          saveLocalAttendee(attendee);
          return attendee;
        }
      } catch {}
    }
  }

  const local = getLocalAttendees();
  return local.find(a => a.id.toLowerCase() === cleanId.toLowerCase());
}

export async function getAttendeeByTicketCode(code: string): Promise<Attendee | undefined> {
  const cleaned = code.trim().toLowerCase();
  try {
    const rows = await sql`
      SELECT * FROM attendees WHERE ticket_code ILIKE ${cleaned} LIMIT 1;
    `;
    if (rows && rows.length > 0) {
      const attendee = rowToAttendee(rows[0]);
      saveLocalAttendee(attendee);
      return attendee;
    }
  } catch (err) {
    console.warn('[DB] Neon getAttendeeByTicketCode failed, falling back to Supabase:', err);
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('attendees')
          .select('*')
          .ilike('ticket_code', cleaned)
          .maybeSingle();
        if (!error && data) {
          const attendee = rowToAttendee(data);
          saveLocalAttendee(attendee);
          return attendee;
        }
      } catch {}
    }
  }

  const local = getLocalAttendees();
  return local.find(a => a.ticketCode?.toLowerCase() === cleaned);
}

export async function getAttendeeByUsn(usn: string): Promise<Attendee | undefined> {
  const cleaned = usn.trim().toUpperCase();
  try {
    const rows = await sql`
      SELECT * FROM attendees WHERE usn ILIKE ${cleaned} OR roll_number ILIKE ${cleaned} LIMIT 1;
    `;
    if (rows && rows.length > 0) {
      const attendee = rowToAttendee(rows[0]);
      saveLocalAttendee(attendee);
      return attendee;
    }
  } catch (err: any) {
    console.warn('[DB] Neon getAttendeeByUsn failed, falling back to Supabase:', err?.message || err);
    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase
          .from('attendees')
          .select('*')
          .or(`usn.ilike.${cleaned},roll_number.ilike.${cleaned}`)
          .maybeSingle();
        if (data) {
          const attendee = rowToAttendee(data);
          saveLocalAttendee(attendee);
          return attendee;
        }
      } catch {}
    }
  }

  const local = getLocalAttendees();
  return local.find(a => (a.usn || a.rollNumber || '').trim().toUpperCase() === cleaned);
}

async function getNextAttendeeIdAndTicket(): Promise<{ id: string; ticketCode: string }> {
  const existingIds = new Set<string>();
  const existingTickets = new Set<string>();

  try {
    const rows = await sql`SELECT id, ticket_code FROM attendees;`;
    for (const row of rows || []) {
      if (row.id) existingIds.add(row.id);
      if (row.ticket_code) existingTickets.add(row.ticket_code);
    }
  } catch {}

  const local = getLocalAttendees();
  for (const row of local) {
    if (row.id) existingIds.add(row.id);
    if (row.ticketCode) existingTickets.add(row.ticketCode);
  }

  let maxNum = 1000;
  for (const rowId of existingIds) {
    if (typeof rowId === 'string' && rowId.startsWith('ATT-')) {
      const num = parseInt(rowId.replace('ATT-', ''), 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  let nextSeq = maxNum + 1;
  while (existingIds.has(`ATT-${nextSeq}`)) {
    nextSeq++;
  }

  const id = `ATT-${nextSeq}`;

  let ticketCode = '';
  for (let attempt = 0; attempt < 50; attempt++) {
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    const randomDigits = crypto.randomInt(1000, 9999);
    const candidate = `TKT-CHRONOS-${randomHex}${randomDigits}`;
    if (!existingTickets.has(candidate)) {
      ticketCode = candidate;
      break;
    }
  }
  if (!ticketCode) {
    ticketCode = `TKT-CHRONOS-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
  }

  return { id, ticketCode };
}

export async function createAttendee(
  data: Omit<Attendee, 'id' | 'ticketCode' | 'status' | 'checkedIn' | 'registeredAt'> & {
    isVerifiedOtp?: boolean;
    familyCount?: number;
    familyMembers?: { name: string; relation: string; age?: string }[];
  }
): Promise<{ success: boolean; attendee?: Attendee; error?: string }> {
  const usnKey = (data.usn || data.rollNumber).trim().toUpperCase();

  // Check for duplicate USN (check Neon and local cache)
  const existing = await getAttendeeByUsn(usnKey);
  if (existing) {
    return {
      success: false,
      error: `An entry pass is already registered for USN "${usnKey}". Please look up your ticket pass.`,
    };
  }

  const isApproved = Boolean(data.isVerifiedOtp);
  const cleanYear = (data.year || '').replace(/^Batch of\s*/i, '').trim() || data.year || 'Alumni';

  let lastError: any = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { id, ticketCode } = await getNextAttendeeIdAndTicket();

    const newAttendee: Attendee = {
      ...(data as any),
      usn: usnKey,
      rollNumber: usnKey,
      year: cleanYear,
      id,
      ticketCode,
      status: isApproved ? 'APPROVED' : 'PENDING',
      approvedAt: isApproved ? new Date().toISOString() : undefined,
      verificationMethod: isApproved ? 'OTP_VERIFIED' : 'MANUAL_REVIEW_REQUEST',
      checkedIn: false,
      registeredAt: new Date().toISOString(),
      wristbandColor: 'Neon Cyan (General)',
      organization: data.organization ? String(data.organization).trim() : undefined,
      designation: data.designation ? String(data.designation).trim() : undefined,
      familyCount: 0,
      familyMembers: [],
      totalQuota: 1,
      admittedCount: 0,
      checkInLogs: [],
    };

    try {
      await sql`
        INSERT INTO attendees (
          id, ticket_code, full_name, email, phone, roll_number, usn, department, year,
          id_card_url, degree_proof_url, status, rejection_reason, checked_in, checked_in_at,
          checked_in_by, registered_at, approved_at, wristband_color, wristband_number, notes,
          organization, designation, family_count, family_members, total_quota, admitted_count,
          check_in_logs, verification_method, is_contact_updated, original_email, original_phone,
          review_reason
        ) VALUES (
          ${newAttendee.id}, ${newAttendee.ticketCode}, ${newAttendee.fullName}, ${newAttendee.email},
          ${newAttendee.phone || ''}, ${newAttendee.rollNumber}, ${newAttendee.usn}, ${newAttendee.department || ''},
          ${newAttendee.year || ''}, ${newAttendee.idCardUrl || null}, ${newAttendee.degreeProofUrl || null},
          ${newAttendee.status}, ${newAttendee.rejectionReason || null}, ${newAttendee.checkedIn},
          ${newAttendee.checkedInAt || null}, ${newAttendee.checkedInBy || null}, ${newAttendee.registeredAt},
          ${newAttendee.approvedAt || null}, ${newAttendee.wristbandColor || 'Neon Cyan (General)'},
          ${newAttendee.wristbandNumber || null}, ${newAttendee.notes || null}, ${newAttendee.organization || null},
          ${newAttendee.designation || null}, ${newAttendee.familyCount || 0}, ${JSON.stringify(newAttendee.familyMembers || [])},
          ${newAttendee.totalQuota || 1}, ${newAttendee.admittedCount || 0}, ${JSON.stringify(newAttendee.checkInLogs || [])},
          ${newAttendee.verificationMethod || null}, ${Boolean(newAttendee.isContactUpdated)},
          ${newAttendee.originalEmail || null}, ${newAttendee.originalPhone || null}, ${newAttendee.reviewReason || null}
        );
      `;
    } catch (insertErr: any) {
      lastError = insertErr;
      console.warn(`[DB] Neon createAttendee attempt ${attempt + 1}:`, insertErr.message);
      if (insertErr.message.includes('unique constraint') || insertErr.message.includes('duplicate key')) {
        await new Promise(r => setTimeout(r, 100));
        continue;
      }
    }

    // Always persist to local backup
    saveLocalAttendee(newAttendee);

    // Dual-write mirror to Supabase in background
    mirrorToSupabase(() => supabase.from('attendees').upsert(attendeeToRow(newAttendee)));

    return { success: true, attendee: newAttendee };
  }

  return { success: false, error: 'Database error: ' + (lastError?.message || 'Failed to save attendee record.') };
}

export async function updateAttendeeStatus(
  id: string,
  status: AttendeeStatus,
  rejectionReason?: string,
  wristbandColor?: string
): Promise<Attendee | null> {
  const approvedAt = status === 'APPROVED' ? new Date().toISOString() : null;
  const reason = status === 'REJECTED' ? (rejectionReason || 'Details did not match official college records.') : null;

  // Dual-write mirror to Supabase
  mirrorToSupabase(() => supabase.from('attendees').update({
    status,
    approved_at: approvedAt,
    rejection_reason: reason,
    ...(wristbandColor ? { wristband_color: wristbandColor } : {})
  }).eq('id', id.trim()));

  try {
    const rows = await sql`
      UPDATE attendees
      SET status = ${status},
          approved_at = COALESCE(${approvedAt}, approved_at),
          rejection_reason = ${reason},
          wristband_color = COALESCE(${wristbandColor || null}, wristband_color)
      WHERE id ILIKE ${id.trim()}
      RETURNING *;
    `;
    if (rows && rows.length > 0) {
      const attendee = rowToAttendee(rows[0]);
      saveLocalAttendee(attendee);
      return attendee;
    }
  } catch (err) {
    console.warn('[DB] Neon updateAttendeeStatus failed:', err);
  }

  const local = getLocalAttendees();
  const a = local.find(x => x.id.toLowerCase() === id.trim().toLowerCase());
  if (a) {
    a.status = status;
    if (approvedAt) a.approvedAt = approvedAt;
    if (reason) a.rejectionReason = reason;
    if (wristbandColor) a.wristbandColor = wristbandColor;
    saveLocalAttendees(local);
    return a;
  }
  return null;
}

export async function bulkApproveAttendees(ids: string[]): Promise<number> {
  if (!ids.length) return 0;
  const approvedAt = new Date().toISOString();

  // Dual-write mirror to Supabase
  mirrorToSupabase(() => supabase.from('attendees').update({
    status: 'APPROVED',
    approved_at: approvedAt,
  }).in('id', ids).eq('status', 'PENDING'));

  let count = 0;
  try {
    for (const id of ids) {
      await sql`
        UPDATE attendees
        SET status = 'APPROVED', approved_at = ${approvedAt}
        WHERE id = ${id} AND status = 'PENDING';
      `;
      count++;
    }
  } catch (err: any) {
    console.error('[DB] Neon bulkApprove error:', err.message);
  }

  const local = getLocalAttendees();
  for (const a of local) {
    if (ids.includes(a.id) && a.status === 'PENDING') {
      a.status = 'APPROVED';
      a.approvedAt = approvedAt;
    }
  }
  saveLocalAttendees(local);

  return count;
}

export async function deleteAttendee(
  idOrUsn: string
): Promise<{ success: boolean; deletedAttendee?: Attendee; error?: string }> {
  const query = idOrUsn.trim();
  let foundAttendee: Attendee | undefined = undefined;

  try {
    const rows = await sql`
      DELETE FROM attendees
      WHERE id ILIKE ${query} OR usn ILIKE ${query} OR roll_number ILIKE ${query} OR ticket_code ILIKE ${query}
      RETURNING *;
    `;
    if (rows && rows.length > 0) {
      foundAttendee = rowToAttendee(rows[0]);
    }
  } catch (err: any) {
    console.warn('[DB] Neon deleteAttendee error:', err.message);
  }

  const local = getLocalAttendees();
  const localIdx = local.findIndex(a =>
    a.id.toLowerCase() === query.toLowerCase() ||
    (a.usn && a.usn.toLowerCase() === query.toLowerCase()) ||
    (a.rollNumber && a.rollNumber.toLowerCase() === query.toLowerCase()) ||
    (a.ticketCode && a.ticketCode.toLowerCase() === query.toLowerCase())
  );

  if (localIdx >= 0) {
    if (!foundAttendee) foundAttendee = local[localIdx];
    local.splice(localIdx, 1);
    saveLocalAttendees(local);
  }

  if (foundAttendee) {
    mirrorToSupabase(() => supabase.from('attendees').delete().eq('id', foundAttendee!.id));
  }

  if (!foundAttendee) return { success: false, error: 'Attendee pass not found.' };
  return { success: true, deletedAttendee: foundAttendee };
}

export async function deleteAllAttendees(): Promise<{ success: boolean; count: number }> {
  let count = 0;
  try {
    const c = await sql`SELECT count(*)::int as total FROM attendees;`;
    count = c[0]?.total || 0;
    await sql`DELETE FROM attendees;`;
  } catch (e: any) {
    console.warn('[DB] Neon deleteAllAttendees error:', e.message);
  }

  mirrorToSupabase(() => supabase.from('attendees').delete().neq('id', ''));

  const local = getLocalAttendees();
  if (local.length > count) count = local.length;
  saveLocalAttendees([]);

  return { success: true, count };
}

export async function deleteSelectedAttendees(
  ids: string[]
): Promise<{ success: boolean; count: number }> {
  let count = 0;
  try {
    for (const id of ids) {
      await sql`DELETE FROM attendees WHERE id = ${id};`;
      count++;
    }
  } catch (e: any) {
    console.warn('[DB] Neon deleteSelectedAttendees error:', e.message);
  }

  mirrorToSupabase(() => supabase.from('attendees').delete().in('id', ids));

  const local = getLocalAttendees();
  const updated = local.filter(a => !ids.includes(a.id));
  saveLocalAttendees(updated);

  return { success: true, count: Math.max(count, ids.length) };
}

export async function resetCheckIn(id: string): Promise<Attendee | null> {
  mirrorToSupabase(() => supabase.from('attendees').update({
    checked_in: false,
    checked_in_at: null,
    checked_in_by: null,
    admitted_count: 0,
    check_in_logs: [],
  }).eq('id', id.trim()));

  try {
    const rows = await sql`
      UPDATE attendees
      SET checked_in = FALSE,
          checked_in_at = NULL,
          checked_in_by = NULL,
          admitted_count = 0,
          check_in_logs = '[]'::jsonb
      WHERE id ILIKE ${id.trim()}
      RETURNING *;
    `;
    if (rows && rows.length > 0) {
      const attendee = rowToAttendee(rows[0]);
      saveLocalAttendee(attendee);
      return attendee;
    }
  } catch (err: any) {
    console.warn('[DB] Neon resetCheckIn error:', err.message);
  }

  const local = getLocalAttendees();
  const a = local.find(x => x.id.toLowerCase() === id.trim().toLowerCase());
  if (a) {
    a.checkedIn = false;
    a.checkedInAt = undefined;
    a.checkedInBy = undefined;
    a.admittedCount = 0;
    a.checkInLogs = [];
    saveLocalAttendees(local);
    return a;
  }
  return null;
}

// ─── SCAN / CHECK-IN ──────────────────────────────────────────────────────────

export function normalizeScanCode(rawCode: string): string {
  if (!rawCode || typeof rawCode !== 'string') return '';
  let cleaned = rawCode.trim();

  try { cleaned = decodeURIComponent(cleaned); } catch {}

  try {
    if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
      const parsed = JSON.parse(cleaned);
      cleaned = parsed.ticketCode || parsed.id || parsed.code || parsed.usn || cleaned;
    }
  } catch {}

  if (cleaned.includes('/ticket/')) {
    const afterTicket = cleaned.split('/ticket/')[1];
    if (afterTicket) cleaned = afterTicket.split('?')[0].split('#')[0].split('/')[0].trim();
  }

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

  cleaned = cleaned.split('?')[0].split('#')[0].replace(/\/+$/, '').trim();
  return cleaned;
}

async function findAttendeeByQuery(query: string): Promise<Attendee | undefined> {
  const q = query.trim();
  if (!q) return undefined;

  try {
    const rows = await sql`
      SELECT * FROM attendees
      WHERE id ILIKE ${q} OR ticket_code ILIKE ${q} OR usn ILIKE ${q} OR roll_number ILIKE ${q}
      LIMIT 1;
    `;
    if (rows && rows.length > 0) {
      const attendee = rowToAttendee(rows[0]);
      saveLocalAttendee(attendee);
      return attendee;
    }
  } catch (e) {
    console.warn('[DB] Neon findAttendeeByQuery error:', e);
  }

  const clean = q.toLowerCase();
  const local = getLocalAttendees();
  return local.find(a =>
    a.id?.toLowerCase() === clean ||
    a.ticketCode?.toLowerCase() === clean ||
    a.usn?.toLowerCase() === clean ||
    a.rollNumber?.toLowerCase() === clean
  );
}

export async function getScanPreview(ticketOrId: string): Promise<{
  status: 'READY' | 'ALREADY_CHECKED_IN' | 'PENDING' | 'REJECTED' | 'NOT_FOUND';
  message: string;
  attendee?: Attendee;
  totalQuota: number;
  admittedCount: number;
  remaining: number;
}> {
  const query = normalizeScanCode(ticketOrId);
  const attendee = await findAttendeeByQuery(query);

  if (!attendee) {
    return { status: 'NOT_FOUND', message: 'Invalid Ticket or QR Code. No registration found in system.', totalQuota: 0, admittedCount: 0, remaining: 0 };
  }

  const totalQuota = attendee.totalQuota || (1 + (attendee.familyCount || 0));
  const admittedCount = attendee.admittedCount ?? (attendee.checkedIn ? totalQuota : 0);
  const remaining = Math.max(0, totalQuota - admittedCount);

  if (attendee.status === 'PENDING') {
    return { status: 'PENDING', message: 'Entry Denied: Registration is PENDING APPROVAL by the committee.', attendee, totalQuota, admittedCount, remaining };
  }
  if (attendee.status === 'REJECTED') {
    return { status: 'REJECTED', message: `Entry Denied: Registration was REJECTED (${attendee.rejectionReason || 'Invalid Graduate ID'}).`, attendee, totalQuota, admittedCount, remaining };
  }
  if (remaining <= 0) {
    const timeStr = attendee.checkedInAt ? new Date(attendee.checkedInAt).toLocaleTimeString() : 'earlier';
    return { status: 'ALREADY_CHECKED_IN', message: `PASS QUOTA EXHAUSTED: All ${totalQuota} of ${totalQuota} members have already entered! Last checked in at ${timeStr}.`, attendee, totalQuota, admittedCount, remaining: 0 };
  }

  return {
    status: 'READY',
    message: admittedCount > 0 ? `Partial entry active: ${admittedCount} already admitted, ${remaining} admissions remaining.` : `Verified pass: ${totalQuota} total admission(s) available.`,
    attendee, totalQuota, admittedCount, remaining,
  };
}

export async function checkInAttendee(
  ticketOrId: string,
  volunteerName = 'Main Gate Staff',
  admittingCount?: number
): Promise<{
  status: 'SUCCESS' | 'PARTIAL_ENTRY' | 'ALREADY_CHECKED_IN' | 'PENDING' | 'REJECTED' | 'NOT_FOUND';
  message: string;
  attendee?: Attendee;
  admittedNow?: number;
  remaining?: number;
  totalQuota?: number;
}> {
  const query = normalizeScanCode(ticketOrId);
  const attendee = await findAttendeeByQuery(query);

  if (!attendee) return { status: 'NOT_FOUND', message: 'Invalid Ticket or QR Code. No registration found in system.' };
  if (attendee.status === 'PENDING') return { status: 'PENDING', message: 'Entry Denied: Registration is still PENDING APPROVAL by admin team.', attendee };
  if (attendee.status === 'REJECTED') return { status: 'REJECTED', message: `Entry Denied: Registration was REJECTED (${attendee.rejectionReason || 'Invalid Student ID'}).`, attendee };

  const totalQuota = attendee.totalQuota || (1 + (attendee.familyCount || 0));
  const currentAdmitted = attendee.admittedCount ?? (attendee.checkedIn ? totalQuota : 0);
  const currentRemaining = Math.max(0, totalQuota - currentAdmitted);

  // If already checked in and no extra count was requested
  if (currentRemaining <= 0 && (!admittingCount || admittingCount <= 0)) {
    return { status: 'ALREADY_CHECKED_IN', message: `FRAUD ALERT: All ${totalQuota} of ${totalQuota} quotas already admitted!`, attendee, remaining: 0, totalQuota };
  }

  // Count to admit in this action (supports extra people beyond quota via volunteer override)
  const requested = (admittingCount !== undefined && admittingCount > 0) ? admittingCount : (currentRemaining > 0 ? currentRemaining : 1);
  const countToAdmit = Math.max(1, requested);

  const newAdmitted = currentAdmitted + countToAdmit;
  const newTotalQuota = Math.max(totalQuota, newAdmitted);
  const newRemaining = Math.max(0, newTotalQuota - newAdmitted);
  const isFullyExhausted = newRemaining <= 0;
  const extraGuests = newTotalQuota > totalQuota ? (newTotalQuota - totalQuota) : 0;

  const existingLogs = attendee.checkInLogs ?? [];
  const newLog = {
    timestamp: new Date().toISOString(),
    admitted: countToAdmit,
    gateVolunteer: volunteerName,
    notes: extraGuests > 0 
      ? `Admitted ${countToAdmit} person(s) (${extraGuests} extra guest(s) authorized at gate by volunteer ${volunteerName}). Total admitted: ${newAdmitted}`
      : (isFullyExhausted ? `Quota completed (${newAdmitted}/${newTotalQuota})` : `Partial entry (${newAdmitted}/${newTotalQuota})`),
  };

  let updatedAttendee: Attendee = {
    ...attendee,
    totalQuota: newTotalQuota,
    admittedCount: newAdmitted,
    checkedIn: true,
    checkedInAt: new Date().toISOString(),
    checkedInBy: volunteerName,
    checkInLogs: [...existingLogs, newLog],
  };

  try {
    const rows = await sql`
      UPDATE attendees
      SET total_quota = ${newTotalQuota},
          admitted_count = ${newAdmitted},
          checked_in = true,
          checked_in_at = NOW(),
          checked_in_by = ${volunteerName},
          check_in_logs = ${JSON.stringify([...existingLogs, newLog])}
      WHERE id = ${attendee.id}
      RETURNING *;
    `;
    if (rows && rows.length > 0) {
      updatedAttendee = rowToAttendee(rows[0]);
    }
  } catch (err) {
    console.warn('[DB] Neon checkIn update error:', err);
  }

  saveLocalAttendee(updatedAttendee);

  // Dual-write mirror to Supabase
  mirrorToSupabase(() => supabase.from('attendees').update({
    total_quota: newTotalQuota,
    admitted_count: newAdmitted,
    checked_in: true,
    checked_in_at: new Date().toISOString(),
    checked_in_by: volunteerName,
    check_in_logs: [...existingLogs, newLog],
  }).eq('id', attendee.id));

  const wristband = attendee.wristbandColor || 'Neon Cyan';
  const extraMsg = extraGuests > 0 ? ` (includes ${extraGuests} extra guest${extraGuests > 1 ? 's' : ''})` : '';

  if (isFullyExhausted) {
    return {
      status: 'SUCCESS',
      message: `ENTRY GRANTED! Admitted ${countToAdmit} member(s)${extraMsg}. Total admitted: ${newAdmitted}. Issue ${countToAdmit} ${wristband} wristband(s).`,
      attendee: updatedAttendee,
      admittedNow: countToAdmit,
      remaining: 0,
      totalQuota: newTotalQuota
    };
  }

  return { status: 'PARTIAL_ENTRY', message: `PARTIAL ENTRY GRANTED! Admitted ${countToAdmit} member(s). Issue ${countToAdmit} ${attendee.wristbandColor || 'Neon Cyan'} wristband(s). ${newRemaining} admission(s) remaining.`, attendee: updatedAttendee, admittedNow: countToAdmit, remaining: newRemaining, totalQuota };
}
