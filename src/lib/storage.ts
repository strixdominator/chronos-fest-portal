import fs from 'fs';
import path from 'path';
import os from 'os';

// Bundled read-only app directory (e.g. /var/task/data on Vercel)
const BUNDLED_DATA_DIR = path.join(process.cwd(), 'data');

// Detect serverless environment (Vercel, AWS Lambda, etc.)
const IS_SERVERLESS = Boolean(
  process.env.VERCEL || 
  process.env.AWS_LAMBDA_FUNCTION_NAME || 
  process.env.NOW_REGION || 
  process.env.VERCEL_ENV
);

// On serverless, /tmp is the only writable directory on disk
const WRITABLE_DATA_DIR = IS_SERVERLESS
  ? path.join(os.tmpdir(), 'milan_data')
  : BUNDLED_DATA_DIR;

function ensureWritableDir() {
  if (!fs.existsSync(WRITABLE_DATA_DIR)) {
    try {
      fs.mkdirSync(WRITABLE_DATA_DIR, { recursive: true });
    } catch (e) {
      // In case creating subfolder fails, will fallback to os.tmpdir directly
    }
  }
}

/**
 * Returns the best path to read from:
 * Inspects writable directory, /tmp directory, and bundled data directory.
 * If multiple exist, chooses the newest modified file so updates are never lost.
 */
export function getReadFilePath(filename: string): string {
  const candidates = [
    path.join(WRITABLE_DATA_DIR, filename),
    path.join(os.tmpdir(), filename),
    path.join(os.tmpdir(), 'milan_data', filename),
    path.join(BUNDLED_DATA_DIR, filename),
  ];

  let newestPath: string | null = null;
  let newestMtime = -1;

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(/*turbopackIgnore: true*/ candidate)) {
        const stats = fs.statSync(/*turbopackIgnore: true*/ candidate);
        if (stats.mtimeMs > newestMtime) {
          newestMtime = stats.mtimeMs;
          newestPath = candidate;
        }
      }
    } catch {}
  }

  return newestPath || path.join(BUNDLED_DATA_DIR, filename);
}

/**
 * Returns the writable path for storing data.
 */
export function getWriteFilePath(filename: string): string {
  ensureWritableDir();
  return path.join(WRITABLE_DATA_DIR, filename);
}

/**
 * Safely reads JSON from disk. Never throws.
 */
export function safeReadJson<T>(filename: string, fallback: T): T {
  try {
    const filePath = getReadFilePath(filename);
    if (!fs.existsSync(/*turbopackIgnore: true*/ filePath)) {
      return fallback;
    }
    const raw = fs.readFileSync(/*turbopackIgnore: true*/ filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[STORAGE] Read error for ${filename}, using fallback:`, err);
    return fallback;
  }
}

/**
 * Safely writes JSON to disk with zero crash risk. Never throws.
 * Writes to designated writable path and synchronizes to tmp fallback.
 */
export function safeWriteJson(filename: string, data: any): boolean {
  const jsonStr = JSON.stringify(data, null, 2);
  let wrote = false;

  try {
    const targetPath = getWriteFilePath(filename);
    fs.writeFileSync(targetPath, jsonStr, 'utf-8');
    wrote = true;
  } catch (err) {
    console.warn(`[STORAGE] Write failed at target path for ${filename}, attempting tmp fallback:`, err);
  }

  try {
    const fallbackPath = path.join(os.tmpdir(), filename);
    if (fallbackPath !== getWriteFilePath(filename)) {
      fs.writeFileSync(fallbackPath, jsonStr, 'utf-8');
      wrote = true;
    }
  } catch (err2) {
    if (!wrote) {
      console.error(`[STORAGE] Critical: Could not write ${filename} to disk:`, err2);
    }
  }

  return wrote;
}
