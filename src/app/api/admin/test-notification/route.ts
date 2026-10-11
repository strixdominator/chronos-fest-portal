import { NextRequest, NextResponse } from 'next/server';
import { sendEmailOtp, sendSmsOtp } from '@/lib/notifications';
import { verifyAdminPasscode, getAdminPasscodeFromRequest } from '@/lib/auth';

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
    const { type = 'EMAIL', target } = body;

    if (!target || !target.trim()) {
      return NextResponse.json({ success: false, error: 'Target email or phone is required' }, { status: 400 });
    }

    const testOtp = Math.floor(100000 + Math.random() * 900000).toString();

    if (type === 'EMAIL') {
      const result = await sendEmailOtp({
        toEmail: target.trim(),
        otp: testOtp,
        recipientName: 'Fest Organizer (Test)',
        usn: 'ADMIN-TEST',
      });
      return NextResponse.json({ ...result, testOtp });
    } else {
      const result = await sendSmsOtp({
        toPhone: target.trim(),
        otp: testOtp,
        recipientName: 'Fest Organizer (Test)',
        usn: 'ADMIN-TEST',
      });
      return NextResponse.json({ ...result, testOtp });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
