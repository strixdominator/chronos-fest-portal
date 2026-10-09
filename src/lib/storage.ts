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
 * 1. If a modified copy was written to the writable directory, use that.
 * 2. Otherwise use the bundled file in process.cwd()/data.
 */
export function getReadFilePath(filename: string): string {
  const writablePath = path.join(WRITABLE_DATA_DIR, filename);
  if (fs.existsSync(writablePath)) {
    return writablePath;
  }
  return path.join(BUNDLED_DATA_DIR, filename);
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
 * First tries the designated writable path (in /tmp on Vercel).
 * If that fails, falls back to os.tmpdir directly.
 */
export function safeWriteJson(filename: string, data: any): boolean {
  try {
    const targetPath = getWriteFilePath(filename);
    fs.writeFileSync(targetPath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.warn(`[STORAGE] Write failed at target path for ${filename}, attempting tmp fallback:`, err);
    try {
      const fallbackPath = path.join(os.tmpdir(), filename);
      fs.writeFileSync(fallbackPath, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (err2) {
      console.error(`[STORAGE] Critical: Could not write ${filename} to disk:`, err2);
      return false;
    }
  }
}
