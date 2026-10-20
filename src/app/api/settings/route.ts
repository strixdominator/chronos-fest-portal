import { NextRequest, NextResponse } from 'next/server';
import { getSettings, updateSettings } from '@/lib/db';
import { verifyAdminPasscode, getAdminPasscodeFromRequest } from '@/lib/auth';

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({ success: true, settings });
}

export async function POST(request: NextRequest) {
  try {
    const isAdmin = verifyAdminPasscode(getAdminPasscodeFromRequest(request));
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin passcode required.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const updated = await updateSettings(body);
    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update settings' },
      { status: 500 }
    );
  }
}
