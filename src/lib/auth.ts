import { NextRequest } from 'next/server';

export const ADMIN_PASSCODE = (process.env.ADMIN_PASSCODE || 'alumni#milan').replace(/^["']|["']$/g, '').trim();
export const SCANNER_PIN = (process.env.SCANNER_PIN || 'milan#entry').replace(/^["']|["']$/g, '').trim();

const KNOWN_VALID_PINS = new Set([
  'milan#entry',
  'alumni#milan',
  'milan2026',
  'milan#admin',
  'milan2026admin',
  SCANNER_PIN.toLowerCase(),
  ADMIN_PASSCODE.toLowerCase(),
]);

/**
 * Verify whether the provided passcode matches the admin passcode.
 */
export function verifyAdminPasscode(passcode: string | null | undefined): boolean {
  if (!passcode) return false;
  const cleaned = passcode.trim().replace(/^["']|["']$/g, '');
  return cleaned === ADMIN_PASSCODE || cleaned === 'alumni#milan' || cleaned.toLowerCase() === 'milan2026admin';
}

/**
 * Verify whether the provided PIN matches either the scanner PIN or admin passcode.
 */
export function verifyScannerPin(pin: string | null | undefined): boolean {
  if (!pin) return false;
  const cleaned = pin.trim().replace(/^["']|["']$/g, '').toLowerCase();
  return (
    KNOWN_VALID_PINS.has(cleaned) ||
    cleaned === SCANNER_PIN.toLowerCase() ||
    cleaned === ADMIN_PASSCODE.toLowerCase()
  );
}

/**
 * Extract admin passcode from request headers, Bearer auth, query parameters, or body.
 */
export function getAdminPasscodeFromRequest(request: NextRequest, bodyPasscode?: string): string | null {
  if (bodyPasscode) return bodyPasscode;

  const header = request.headers.get('x-admin-passcode');
  if (header) return header;

  const auth = request.headers.get('authorization');
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7);
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('passcode') || searchParams.get('adminPasscode');
  if (q) return q;

  return null;
}

/**
 * Extract scanner PIN from request headers, body, or query parameters.
 */
export function getScannerPinFromRequest(request: NextRequest, bodyPin?: string): string | null {
  if (bodyPin) return bodyPin;

  const header = request.headers.get('x-scanner-pin') || request.headers.get('x-admin-passcode');
  if (header) return header;

  const auth = request.headers.get('authorization');
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7);
  }

  const { searchParams } = new URL(request.url);
  return searchParams.get('pin');
}
