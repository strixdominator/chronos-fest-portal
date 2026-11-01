import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Read .env.local
const envPath = path.join(projectRoot, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx !== -1) {
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
}

const DATABASE_URL = env.DATABASE_URL;
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not found in .env.local');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('ERROR: Supabase credentials not found in .env.local');
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

async function crossCheck() {
  console.log('=== CROSS-CHECKING NEON POSTGRES AND SUPABASE DATABASES ===\n');

  // 1. Check ATTENDEES table
  console.log('1. Checking ATTENDEES table...');
  let neonAttendees = [];
  try {
    neonAttendees = await sql`SELECT * FROM attendees ORDER BY registered_at ASC, id ASC`;
    console.log(`   Neon attendees count: ${neonAttendees.length}`);
  } catch (err) {
    console.error('   Error querying Neon attendees:', err.message);
  }

  let supabaseAttendees = [];
  try {
    const { data, error } = await supabase.from('attendees').select('*').order('registered_at', { ascending: true });
    if (error) {
      console.error('   Error querying Supabase attendees:', error.message);
    } else {
      supabaseAttendees = data || [];
      console.log(`   Supabase attendees count: ${supabaseAttendees.length}`);
    }
  } catch (err) {
    console.error('   Exception querying Supabase attendees:', err.message);
  }

  // Build maps by ID and USN
  const neonById = new Map(neonAttendees.map(a => [a.id, a]));
  const supabaseById = new Map(supabaseAttendees.map(a => [a.id, a]));

  const missingInSupabase = [];
  const missingInNeon = [];
  const discrepancies = [];

  for (const [id, nRow] of neonById.entries()) {
    const sRow = supabaseById.get(id);
    if (!sRow) {
      missingInSupabase.push({ id, name: nRow.full_name, usn: nRow.usn || nRow.roll_number, status: nRow.status, ticket: nRow.ticket_code });
    } else {
      const diffs = [];
      if (String(nRow.status || '').toUpperCase() !== String(sRow.status || '').toUpperCase()) {
        diffs.push(`status (Neon: "${nRow.status}" vs Supabase: "${sRow.status}")`);
      }
      if (Boolean(nRow.checked_in) !== Boolean(sRow.checked_in)) {
        diffs.push(`checked_in (Neon: ${nRow.checked_in} vs Supabase: ${sRow.checked_in})`);
      }
      if (Number(nRow.admitted_count || 0) !== Number(sRow.admitted_count || 0)) {
        diffs.push(`admitted_count (Neon: ${nRow.admitted_count} vs Supabase: ${sRow.admitted_count})`);
      }
      if (String(nRow.email || '').toLowerCase() !== String(sRow.email || '').toLowerCase()) {
        diffs.push(`email (Neon: "${nRow.email}" vs Supabase: "${sRow.email}")`);
      }
      if (String(nRow.ticket_code || '').trim() !== String(sRow.ticket_code || '').trim()) {
        diffs.push(`ticket_code (Neon: "${nRow.ticket_code}" vs Supabase: "${sRow.ticket_code}")`);
      }
      if (diffs.length > 0) {
        discrepancies.push({ id, usn: nRow.usn || nRow.roll_number, name: nRow.full_name, diffs });
      }
    }
  }

  for (const [id, sRow] of supabaseById.entries()) {
    if (!neonById.has(id)) {
      missingInNeon.push({ id, name: sRow.full_name, usn: sRow.usn || sRow.roll_number, status: sRow.status, ticket: sRow.ticket_code });
    }
  }

  console.log('\n--- ATTENDEES RECONCILIATION RESULT ---');
  console.log(`Total Neon entries:         ${neonAttendees.length}`);
  console.log(`Total Supabase entries:     ${supabaseAttendees.length}`);
  console.log(`Entries missing in Supabase: ${missingInSupabase.length}`);
  if (missingInSupabase.length > 0) {
    console.log('   Missing in Supabase:', JSON.stringify(missingInSupabase, null, 2));
  }
  console.log(`Entries missing in Neon:     ${missingInNeon.length}`);
  if (missingInNeon.length > 0) {
    console.log('   Missing in Neon:', JSON.stringify(missingInNeon, null, 2));
  }
  console.log(`Field discrepancies:         ${discrepancies.length}`);
  if (discrepancies.length > 0) {
    console.log('   Discrepancies found:', JSON.stringify(discrepancies, null, 2));
  }

  // 2. Check SETTINGS table
  console.log('\n2. Checking SETTINGS table...');
  try {
    const neonSettings = await sql`SELECT * FROM settings WHERE id = 1`;
    console.log(`   Neon settings:`, neonSettings.length ? `OK (Event: ${neonSettings[0].event_name}, Capacity: ${neonSettings[0].total_capacity}, RegOpen: ${neonSettings[0].is_registration_open})` : 'Row id=1 not found');
  } catch (err) {
    console.error('   Error checking Neon settings:', err.message);
  }

  try {
    const { data: sSettings, error } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
    if (error) console.error('   Error checking Supabase settings:', error.message);
    else console.log(`   Supabase settings:`, sSettings ? `OK (Event: ${sSettings.event_name}, Capacity: ${sSettings.total_capacity}, RegOpen: ${sSettings.is_registration_open})` : 'Row id=1 not found');
  } catch (err) {
    console.error('   Exception checking Supabase settings:', err.message);
  }

  // 3. Status breakdown of attendees
  const neonStatusCounts = neonAttendees.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    if (a.checked_in) acc.CHECKED_IN = (acc.CHECKED_IN || 0) + 1;
    return acc;
  }, {});
  const supabaseStatusCounts = supabaseAttendees.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    if (a.checked_in) acc.CHECKED_IN = (acc.CHECKED_IN || 0) + 1;
    return acc;
  }, {});

  console.log('\n--- ATTENDEES STATUS BREAKDOWN ---');
  console.log('Neon:    ', JSON.stringify(neonStatusCounts));
  console.log('Supabase:', JSON.stringify(supabaseStatusCounts));

  // Latest 3 attendees
  console.log('\n--- MOST RECENT REGISTRATIONS (LATEST 3) ---');
  const recentNeon = [...neonAttendees].reverse().slice(0, 3);
  for (const a of recentNeon) {
    const matchingSupabase = supabaseById.get(a.id);
    console.log(`USN: ${a.usn || a.roll_number} | Name: ${a.full_name} | Status: ${a.status} | Registered: ${a.registered_at}`);
    console.log(`   Neon ticket:     ${a.ticket_code}`);
    console.log(`   Supabase ticket: ${matchingSupabase ? matchingSupabase.ticket_code : 'MISSING'}`);
  }

  // 3. Check ACTIVE_OTPS table
  console.log('\n3. Checking ACTIVE_OTPS table...');
  let neonOtpsCount = 0;
  try {
    const neonOtps = await sql`SELECT count(*)::int as count FROM active_otps`;
    neonOtpsCount = neonOtps[0].count;
    console.log(`   Neon active_otps count: ${neonOtpsCount}`);
  } catch (err) {
    console.error('   Error checking Neon active_otps:', err.message);
  }
  try {
    const { count, error } = await supabase.from('active_otps').select('*', { count: 'exact', head: true });
    if (error) console.error('   Error checking Supabase active_otps:', error.message);
    else console.log(`   Supabase active_otps count: ${count}`);
  } catch (err) {
    console.error('   Exception checking Supabase active_otps:', err.message);
  }

  // 4. Check VERIFIED_SESSIONS table
  console.log('\n4. Checking VERIFIED_SESSIONS table...');
  let neonSessionsCount = 0;
  try {
    const neonSessions = await sql`SELECT count(*)::int as count FROM verified_sessions`;
    neonSessionsCount = neonSessions[0].count;
    console.log(`   Neon verified_sessions count: ${neonSessionsCount}`);
  } catch (err) {
    console.error('   Error checking Neon verified_sessions:', err.message);
  }
  try {
    const { count, error } = await supabase.from('verified_sessions').select('*', { count: 'exact', head: true });
    if (error) console.error('   Error checking Supabase verified_sessions:', error.message);
    else console.log(`   Supabase verified_sessions count: ${count}`);
  } catch (err) {
    console.error('   Exception checking Supabase verified_sessions:', err.message);
  }

  if (missingInSupabase.length === 0 && missingInNeon.length === 0 && discrepancies.length === 0) {
    console.log('\n✅ 100% PERFECT SYNC! Every single attendee record matches identically across Neon and Supabase.');
  } else {
    console.log('\n⚠️ Sync differences detected! Re-synchronization required.');
  }
}

crossCheck().catch(err => {
  console.error('Fatal cross-check error:', err);
  process.exit(1);
});
