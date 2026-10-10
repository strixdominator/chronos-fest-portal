import { NextRequest } from 'next/server';

interface RateLimitRecord {
  timestamps: number[];
  lockedUntil?: number;
  failedAttempts?: number;
}

// In-memory sliding window rate limiter store
const memoryStore = new Map<string, RateLimitRecord>();

// Clean up stale records periodically (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of memoryStore.entries()) {
      // Remove timestamps older than 1 hour
      record.timestamps = record.timestamps.filter(t => now - t < 3600_000);
      if (record.timestamps.length === 0 && (!record.lockedUntil || record.lockedUntil < now)) {
        memoryStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Extract true client IP from standard proxy headers (Render, Vercel, Cloudflare, AWS)
 */
export function getClientIp(request: NextRequest): string {
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp) return xRealIp.trim();

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // First IP in chain is the original client IP
    const parts = forwarded.split(',');
    return parts[0].trim();
  }

  return '127.0.0.1';
}

/**
 * Generic sliding window rate limiter
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now();
  let record = memoryStore.get(key);

  if (!record) {
    record = { timestamps: [] };
    memoryStore.set(key, record);
  }

  // Remove timestamps outside window
  record.timestamps = record.timestamps.filter(t => now - t < windowMs);

  if (record.timestamps.length >= maxRequests) {
    const oldest = record.timestamps[0];
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec,
    };
  }

  record.timestamps.push(now);
  return {
    allowed: true,
    remaining: maxRequests - record.timestamps.length,
    retryAfterSec: 0,
  };
}

/**
 * Specialized OTP dispatch security checks:
 * 1. 60-second cooldown between resends for the same USN
 * 2. Max 5 OTPs per USN per hour (prevents draining email quota & inbox spamming)
 * 3. Max 10 OTP requests per IP per 10 minutes (prevents bot flood across USNs)
 */
export function checkOtpDispatchLimits(
  usn: string,
  ip: string
): { allowed: boolean; error?: string; retryAfterSec?: number } {
  const now = Date.now();
  const cleanedUsn = usn.trim().toUpperCase();

  // 1. IP-level flood protection (10 requests per 10 mins)
  const ipCheck = checkRateLimit(`ip_otp_send:${ip}`, 10, 10 * 60 * 1000);
  if (!ipCheck.allowed) {
    return {
      allowed: false,
      error: `Too many verification requests from your connection. Please wait ${ipCheck.retryAfterSec} seconds.`,
      retryAfterSec: ipCheck.retryAfterSec,
    };
  }

  // 2. USN 60-second cooldown
  const cooldownKey = `usn_cooldown:${cleanedUsn}`;
  const cooldownRecord = memoryStore.get(cooldownKey);
  if (cooldownRecord && cooldownRecord.timestamps.length > 0) {
    const lastSent = cooldownRecord.timestamps[cooldownRecord.timestamps.length - 1];
    const elapsed = now - lastSent;
    if (elapsed < 60_000) {
      const waitSec = Math.ceil((60_000 - elapsed) / 1000);
      return {
        allowed: false,
        error: `Please wait ${waitSec} seconds before requesting another verification code.`,
        retryAfterSec: waitSec,
      };
    }
  }

  // 3. USN hourly cap (Max 5 per hour to protect Brevo free quota)
  const hourlyKey = `usn_hourly:${cleanedUsn}`;
  const hourlyCheck = checkRateLimit(hourlyKey, 5, 60 * 60 * 1000);
  if (!hourlyCheck.allowed) {
    return {
      allowed: false,
      error: `Maximum verification attempts reached for this USN (5 per hour). Please contact the event desk or try again in ${hourlyCheck.retryAfterSec} seconds.`,
      retryAfterSec: hourlyCheck.retryAfterSec,
    };
  }

  // Record timestamp for cooldown
  let cRecord = memoryStore.get(cooldownKey);
  if (!cRecord) {
    cRecord = { timestamps: [] };
    memoryStore.set(cooldownKey, cRecord);
  }
  cRecord.timestamps.push(now);

  return { allowed: true };
}

/**
 * OTP Brute-force protection:
 * Max 5 failed OTP attempts per USN before locking for 15 minutes.
 */
export function checkOtpVerifyAttempts(usn: string): { allowed: boolean; error?: string } {
  const now = Date.now();
  const cleanedUsn = usn.trim().toUpperCase();
  const lockKey = `otp_lock:${cleanedUsn}`;
  const record = memoryStore.get(lockKey);

  if (record?.lockedUntil && now < record.lockedUntil) {
    const remainingSec = Math.ceil((record.lockedUntil - now) / 1000);
    return {
      allowed: false,
      error: `Too many incorrect attempts. This USN is locked for ${remainingSec} seconds for security.`,
    };
  }

  return { allowed: true };
}

export function recordFailedOtpAttempt(usn: string): { attemptsLeft: number; locked: boolean; error?: string } {
  const cleanedUsn = usn.trim().toUpperCase();
  const lockKey = `otp_lock:${cleanedUsn}`;
  let record = memoryStore.get(lockKey);

  if (!record) {
    record = { timestamps: [], failedAttempts: 0 };
    memoryStore.set(lockKey, record);
  }

  record.failedAttempts = (record.failedAttempts || 0) + 1;
  const attemptsLeft = Math.max(0, 5 - record.failedAttempts);

  if (record.failedAttempts >= 5) {
    record.lockedUntil = Date.now() + 15 * 60 * 1000; // 15-minute lockout
    return {
      attemptsLeft: 0,
      locked: true,
      error: 'Security alert: 5 incorrect OTP attempts detected. This USN has been locked for 15 minutes to protect your identity.',
    };
  }

  return {
    attemptsLeft,
    locked: false,
    error: `Incorrect OTP. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining before security lock.`,
  };
}

export function resetFailedOtpAttempts(usn: string): void {
  const cleanedUsn = usn.trim().toUpperCase();
  memoryStore.delete(`otp_lock:${cleanedUsn}`);
}
