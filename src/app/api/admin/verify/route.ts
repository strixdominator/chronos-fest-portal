import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminPasscode, getAdminPasscodeFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    let bodyPasscode: string | undefined;
    try {
      const body = await request.json();
      bodyPasscode = body?.passcode;
    } catch {
      // Body not provided or not JSON
    }

    const passcode = getAdminPasscodeFromRequest(request, bodyPasscode);
    const isValid = verifyAdminPasscode(passcode);

    if (isValid && passcode) {
      const response = NextResponse.json({
        success: true,
        valid: true,
        message: 'Admin authentication successful',
      });
      response.cookies.set('dbit_admin_passcode', passcode.trim(), {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        sameSite: 'lax',
      });
      return response;
    }

    return NextResponse.json(
      {
        success: false,
        valid: false,
        error: 'Access Denied: Incorrect administrator passcode.',
      },
      { status: 401 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, valid: false, error: error?.message || 'Verification failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const passcode = getAdminPasscodeFromRequest(request);
  const isValid = verifyAdminPasscode(passcode);

  if (isValid) {
    return NextResponse.json({
      success: true,
      valid: true,
      message: 'Admin authentication successful',
    });
  }

  return NextResponse.json(
    {
      success: false,
      valid: false,
      error: 'Access Denied: Incorrect administrator passcode.',
    },
    { status: 401 }
  );
}

