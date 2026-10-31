import { Attendee, EventSettings, AttendeeStatus } from './types';
import { supabase } from './supabase';
import { safeReadJson, safeWriteJson } from './storage';

// ─── LOCAL STORAGE FALLBACK HELPERS ───────────────────────────────────────────
function getLocalAttendees(): Attendee[] {
  return safeReadJson<Attendee[]>('attendees.json', []);
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
    checkedIn: row.checked_in,
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
    isContactUpdated: row.is_contact_updated,
    originalEmail: row.original_email,
    originalPhone: row.original_phone,
    reviewReason: row.review_reason,
  };
}

function attendeeToRow(a: Attendee) {
  return {
    id: a.id,
    ticket_code: a.ticketCode,
    full_name: a.fullName,
    email: a.email,
    phone: a.phone,
    roll_number: a.rollNumber,
    usn: a.usn || a.rollNumber,
    department: a.department,
    year: a.year,
    id_card_url: a.idCardUrl ?? null,
    degree_proof_url: a.degreeProofUrl ?? null,
    status: a.status,
    rejection_reason: a.rejectionReason ?? null,
    checked_in: a.checkedIn,
    checked_in_at: a.checkedInAt ?? null,
    checked_in_by: a.checkedInBy ?? null,
    registered_at: a.registeredAt,
    approved_at: a.approvedAt ?? null,
    wristband_color: a.wristbandColor ?? 'Neon Cyan (General)',
    wristband_number: a.wristbandNumber ?? null,
    notes: a.notes ?? null,
    organization: a.organization ?? null,
    designation: a.designation ?? null,
    family_count: a.familyCount ?? 0,
    family_members: a.familyMembers ?? [],
    total_quota: a.totalQuota ?? 1,
    admitted_count: a.admittedCount ?? 0,
    check_in_logs: a.checkInLogs ?? [],
    verification_method: a.verificationMethod ?? null,
    is_contact_updated: a.isContactUpdated ?? false,
    original_email: a.originalEmail ?? null,
    original_phone: a.originalPhone ?? null,
    review_reason: a.reviewReason ?? null,
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
    wristbandColors: row.wristband_colors ?? [],
  };
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<EventSettings> {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (!error && data) {
      return rowToSettings(data);
    }
  } catch (e) {
    console.warn('[DB] Supabase getSettings failed, using defaults:', e);
  }
  return DEFAULT_SETTINGS;
}

export async function updateSettings(newSettings: Partial<EventSettings>): Promise<EventSettings> {
  const current = await getSettings();
  const merged = { ...current, ...newSettings };

  try {
    await supabase.from('settings').upsert({
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
    });
  } catch (e) {
    console.warn('[DB] Supabase updateSettings failed:', e);
  }

  return merged;
}

// ─── ATTENDEES ────────────────────────────────────────────────────────────────

export async function getAttendees(): Promise<Attendee[]> {
  try {
    const { data, error } = await supabase
      .from('attendees')
      .select('*')
      .order('registered_at', { ascending: false });

    if (!error && data && Array.isArray(data) && data.length > 0) {
      const list = data.map(rowToAttendee);
      saveLocalAttendees(list);
      return list;
    }
  } catch (err: any) {
    console.warn('[DB] Supabase getAttendees failed/timed out, using local fallback:', err?.message || err);
  }

  return getLocalAttendees();
}

export async function getAttendeeById(id: string): Promise<Attendee | undefined> {
  const cleanId = id.trim();
  try {
    const { data } = await supabase
      .from('attendees')
      .select('*')
      .ilike('id', cleanId)
      .maybeSingle();

    if (data) {
      const attendee = rowToAttendee(data);
      saveLocalAttendee(attendee);
      return attendee;
    }
  } catch (err) {
    console.warn('[DB] Supabase getAttendeeById failed:', err);
  }

  const local = getLocalAttendees();
  return local.find(a => a.id.toLowerCase() === cleanId.toLowerCase());
}

export async function getAttendeeByTicketCode(code: string): Promise<Attendee | undefined> {
  const cleaned = code.trim().toLowerCase();
  try {
    const { data } = await supabase
      .from('attendees')
      .select('*')
      .or(`ticket_code.ilike.${cleaned},id.ilike.${cleaned}`)
      .maybeSingle();

    if (data) {
      const attendee = rowToAttendee(data);
      saveLocalAttendee(attendee);
      return attendee;
    }
  } catch (err) {
    console.warn('[DB] Supabase getAttendeeByTicketCode failed:', err);
  }

  const local = getLocalAttendees();
  return local.find(a => (a.ticketCode?.toLowerCase() === cleaned || a.id.toLowerCase() === cleaned));
}

export async function getAttendeeByUsn(usn: string): Promise<Attendee | undefined> {
  const cleaned = usn.trim().toUpperCase();
  try {
    const { data, error } = await supabase
      .from('attendees')
      .select('*')
      .or(`usn.ilike.${cleaned},roll_number.ilike.${cleaned}`)
      .maybeSingle();

    if (!error && data) {
      const attendee = rowToAttendee(data);
      saveLocalAttendee(attendee);
      return attendee;
    }
  } catch (err: any) {
    console.warn('[DB] Supabase getAttendeeByUsn failed, using local:', err?.message || err);
  }

  const local = getLocalAttendees();
  return local.find(a => (a.usn || a.rollNumber || '').trim().toUpperCase() === cleaned);
}

async function getNextAttendeeIdAndTicket(): Promise<{ id: string; ticketCode: string }> {
  const existingIds = new Set<string>();
  const existingTickets = new Set<string>();

  try {
    const { data } = await supabase.from('attendees').select('id, ticket_code');
    for (const row of data || []) {
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
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const candidate = `TKT-CHRONOS-${randomSuffix}${Math.floor(1000 + Math.random() * 9000)}`;
    if (!existingTickets.has(candidate)) {
      ticketCode = candidate;
      break;
    }
  }
  if (!ticketCode) {
    ticketCode = `TKT-CHRONOS-${Date.now().toString(36).toUpperCase()}`;
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

  // Check for duplicate USN (check Supabase and local cache)
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
  // Retry loop up to 5 attempts to guarantee zero primary key collisions
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

    // Try Supabase insert
    try {
      const { error } = await supabase.from('attendees').insert(attendeeToRow(newAttendee));
      if (error) {
        lastError = error;
        console.warn(`[DB] Supabase createAttendee attempt ${attempt + 1}:`, error.message);
        if (error.message.includes('unique constraint') || error.message.includes('duplicate key')) {
          await new Promise(r => setTimeout(r, 100));
          continue;
        }
      }
    } catch (insertErr: any) {
      console.warn(`[DB] Supabase insert timed out/errored, persisting locally:`, insertErr?.message || insertErr);
    }

    // Always persist to local storage backup
    saveLocalAttendee(newAttendee);

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
  const updates: any = { status };

  if (status === 'APPROVED') {
    updates.approved_at = new Date().toISOString();
    updates.rejection_reason = null;
    if (wristbandColor) updates.wristband_color = wristbandColor;
  } else if (status === 'REJECTED') {
    updates.rejection_reason = rejectionReason || 'Details did not match official college records.';
  }

  const { data, error } = await supabase
    .from('attendees')
    .update(updates)
    .ilike('id', id)
    .select()
    .maybeSingle();

  if (error || !data) return null;
  return rowToAttendee(data);
}

export async function bulkApproveAttendees(ids: string[]): Promise<number> {
  if (!ids.length) return 0;

  const { data, error } = await supabase
    .from('attendees')
    .update({ status: 'APPROVED', approved_at: new Date().toISOString() })
    .in('id', ids)
    .eq('status', 'PENDING')
    .select();

  if (error) {
    console.error('[DB] bulkApprove error:', error.message);
    return 0;
  }

  return data?.length ?? 0;
}

export async function deleteAttendee(
  idOrUsn: string
): Promise<{ success: boolean; deletedAttendee?: Attendee; error?: string }> {
  const query = idOrUsn.trim();

  let foundAttendee: Attendee | undefined = undefined;

  // Try finding in Supabase
  try {
    const { data: found } = await supabase
      .from('attendees')
      .select('*')
      .or(`id.ilike.${query},usn.ilike.${query},roll_number.ilike.${query},ticket_code.ilike.${query}`)
      .maybeSingle();

    if (found) {
      foundAttendee = rowToAttendee(found);
      await supabase.from('attendees').delete().eq('id', found.id);
    }
  } catch (err) {
    console.warn('[DB] Supabase deleteAttendee error:', err);
  }

  // Remove from local storage
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

  if (!foundAttendee) return { success: false, error: 'Attendee pass not found.' };
  return { success: true, deletedAttendee: foundAttendee };
}

export async function deleteAllAttendees(): Promise<{ success: boolean; count: number }> {
  let count = 0;
  try {
    const { count: c } = await supabase
      .from('attendees')
      .select('*', { count: 'exact', head: true });
    count = c ?? 0;
    await supabase.from('attendees').delete().neq('id', '');
  } catch (e) {
    console.warn('[DB] Supabase deleteAllAttendees error:', e);
  }

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
    const { data, error } = await supabase
      .from('attendees')
      .delete()
      .in('id', ids)
      .select();
    if (!error && data) count = data.length;
  } catch (e) {
    console.warn('[DB] Supabase deleteSelectedAttendees error:', e);
  }

  const local = getLocalAttendees();
  const updated = local.filter(a => !ids.includes(a.id));
  saveLocalAttendees(updated);

  return { success: true, count: Math.max(count, ids.length) };
}

export async function resetCheckIn(id: string): Promise<Attendee | null> {
  const { data, error } = await supabase
    .from('attendees')
    .update({
      checked_in: false,
      checked_in_at: null,
      checked_in_by: null,
      admitted_count: 0,
      check_in_logs: [],
    })
    .ilike('id', id)
    .select()
    .maybeSingle();

  if (error || !data) return null;
  return rowToAttendee(data);
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

  // 1. Try Supabase combined query
  try {
    const { data } = await supabase
      .from('attendees')
      .select('*')
      .or(`id.ilike.${q},ticket_code.ilike.${q},usn.ilike.${q},roll_number.ilike.${q}`)
      .maybeSingle();

    if (data) {
      const attendee = rowToAttendee(data);
      saveLocalAttendee(attendee);
      return attendee;
    }
  } catch (e) {
    console.warn('[DB] Supabase findAttendeeByQuery error:', e);
  }

  // 2. Check local fallback
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

  if (currentRemaining <= 0) {
    return { status: 'ALREADY_CHECKED_IN', message: `FRAUD ALERT: All ${totalQuota} of ${totalQuota} quotas already admitted!`, attendee, remaining: 0, totalQuota };
  }

  const requested = (admittingCount !== undefined && admittingCount > 0) ? admittingCount : currentRemaining;
  const countToAdmit = Math.min(requested, currentRemaining);
  const newAdmitted = currentAdmitted + countToAdmit;
  const newRemaining = totalQuota - newAdmitted;
  const isFullyExhausted = newRemaining <= 0;

  const existingLogs = attendee.checkInLogs ?? [];
  const newLog = {
    timestamp: new Date().toISOString(),
    admitted: countToAdmit,
    gateVolunteer: volunteerName,
    notes: isFullyExhausted ? `Quota completed (${newAdmitted}/${totalQuota})` : `Partial entry (${newAdmitted}/${totalQuota})`,
  };

  const { data: updated, error } = await supabase
    .from('attendees')
    .update({
      total_quota: totalQuota,
      admitted_count: newAdmitted,
      checked_in: isFullyExhausted,
      checked_in_at: new Date().toISOString(),
      checked_in_by: volunteerName,
      check_in_logs: [...existingLogs, newLog],
    })
    .eq('id', attendee.id)
    .select()
    .maybeSingle();

  if (error || !updated) {
    return { status: 'NOT_FOUND', message: 'Database error during check-in. Try again.' };
  }

  const updatedAttendee = rowToAttendee(updated);

  if (isFullyExhausted) {
    return { status: 'SUCCESS', message: `FINAL ENTRY GRANTED! Admitted ${countToAdmit} member(s). All ${totalQuota} of ${totalQuota} quotas used. Issue ${countToAdmit} ${attendee.wristbandColor || 'Neon Cyan'} wristband(s). Pass is now EXPIRED.`, attendee: updatedAttendee, admittedNow: countToAdmit, remaining: 0, totalQuota };
  }

  return { status: 'PARTIAL_ENTRY', message: `PARTIAL ENTRY GRANTED! Admitted ${countToAdmit} member(s). Issue ${countToAdmit} ${attendee.wristbandColor || 'Neon Cyan'} wristband(s). ${newRemaining} admission(s) remaining.`, attendee: updatedAttendee, admittedNow: countToAdmit, remaining: newRemaining, totalQuota };
}
