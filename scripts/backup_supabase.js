const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envFile = path.join(process.cwd(), '.env.local');
const env = Object.fromEntries(
  fs.readFileSync(envFile, 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false },
});

async function runBackup() {
  console.log(`Connecting to Supabase (${url})...`);
  try {
    const { data: attendees, error: attErr } = await supabase
      .from('attendees')
      .select('*')
      .order('registered_at', { ascending: false });

    if (attErr) {
      console.error('Error fetching attendees:', attErr.message);
      return;
    }

    console.log(`Successfully fetched ${attendees?.length || 0} attendees!`);

    const { data: settings, error: setErr } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    const backupData = {
      timestamp: new Date().toISOString(),
      totalAttendees: attendees?.length || 0,
      attendees: attendees || [],
      settings: settings || null,
    };

    const outPath = path.join(process.cwd(), 'data', 'attendees_backup.json');
    fs.writeFileSync(outPath, JSON.stringify(backupData, null, 2), 'utf8');
    console.log(`Backup saved to ${outPath}`);

    // Also update data/attendees.json
    const localAttendeesPath = path.join(process.cwd(), 'data', 'attendees.json');
    fs.writeFileSync(localAttendeesPath, JSON.stringify(attendees || [], null, 2), 'utf8');
    console.log(`Updated ${localAttendeesPath} with live data!`);
  } catch (err) {
    console.error('Backup failed:', err);
  }
}

runBackup();

