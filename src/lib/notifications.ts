import nodemailer from 'nodemailer';

interface EmailOtpParams {
  toEmail: string;
  otp: string;
  recipientName: string;
  usn: string;
}

interface SmsOtpParams {
  toPhone: string;
  otp: string;
  recipientName: string;
  usn: string;
}

export interface NotificationResult {
  success: boolean;
  isReal: boolean;
  provider: 'GMAIL_SMTP' | 'FAST2SMS' | 'TWILIO' | 'SIMULATION';
  message: string;
  error?: string;
}

/**
 * Dispatches a real, branded HTML OTP email via Gmail SMTP (nodemailer)
 * If Gmail credentials are not present in .env.local, gracefully returns simulation status.
 */
export async function sendEmailOtp({
  toEmail,
  otp,
  recipientName,
  usn,
}: EmailOtpParams): Promise<NotificationResult> {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPassword = process.env.GMAIL_APP_PASSWORD;

  // If no credentials configured yet, gracefully return simulation mode
  if (!gmailUser || !gmailPassword) {
    console.log(`[EMAIL OTP SIMULATION] To: ${toEmail} | Code: ${otp} | Alumnus: ${recipientName} (${usn})`);
    return {
      success: true,
      isReal: false,
      provider: 'SIMULATION',
      message: 'Running in simulation mode. Configure GMAIL_USER and GMAIL_APP_PASSWORD in .env.local for real email delivery.',
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPassword.replace(/\s+/g, ''), // Strip any spaces from the 16-letter App Password
      },
    });

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your Pass Security Code</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; margin: 0; padding: 20px; color: #f8fafc; }
    .card { max-width: 540px; margin: 0 auto; background: #111827; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%); padding: 24px; text-align: center; color: #050b14; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; }
    .header p { margin: 4px 0 0; font-size: 13px; font-weight: 600; opacity: 0.9; }
    .content { padding: 32px 24px; text-align: center; }
    .greeting { font-size: 18px; font-weight: 700; color: #ffffff; margin-bottom: 8px; }
    .subtext { font-size: 14px; color: #94a3b8; line-height: 1.5; margin-bottom: 24px; }
    .otp-box { background: #1e293b; border: 2px dashed #00f2fe; border-radius: 12px; padding: 18px; margin: 20px auto; display: inline-block; }
    .otp-code { font-family: monospace; font-size: 36px; font-weight: 800; letter-spacing: 0.25em; color: #00f2fe; margin: 0; padding-left: 0.25em; }
    .warning { font-size: 12px; color: #f59e0b; margin-top: 18px; }
    .footer { border-top: 1px solid #1e293b; padding: 18px; text-align: center; font-size: 12px; color: #64748b; background: #0f172a; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>CHRONOS FEST 2026</h1>
      <p>Official Graduate & Alumni Pass Portal</p>
    </div>
    <div class="content">
      <div class="greeting">Hello, ${recipientName}!</div>
      <div class="subtext">
        A request was made to verify and unlock the alumni event entry pass for University Seat Number (USN) <strong>${usn}</strong>.
      </div>

      <div class="otp-box">
        <div class="otp-code">${otp}</div>
      </div>

      <div style="font-size: 13px; color: #cbd5e1; margin-top: 10px;">
        This verification code is strictly valid for <strong>10 minutes</strong>.
      </div>
      <div class="warning">
        ⚠️ If you did not request this pass, please ignore this email. Do not share this code with anyone.
      </div>
    </div>
    <div class="footer">
      College Student Council & Security Affairs Committee<br>
      Automated Digital Ticketing System · Chronos Fest '26
    </div>
  </div>
</body>
</html>
    `;

    await transporter.sendMail({
      from: `"Chronos Fest 2026" <${gmailUser}>`,
      to: toEmail,
      subject: `${otp} is your Chronos Fest '26 Verification Code (USN: ${usn})`,
      text: `Hello ${recipientName},\n\nYour 6-digit verification code for Chronos Fest 2026 entry pass (${usn}) is: ${otp}\n\nThis code expires in 10 minutes. Do not share it with anyone.`,
      html: htmlContent,
    });

    console.log(`[REAL EMAIL SENT] Successfully delivered OTP to ${toEmail} for ${usn}`);
    return {
      success: true,
      isReal: true,
      provider: 'GMAIL_SMTP',
      message: `Real verification email delivered to ${toEmail}!`,
    };
  } catch (error: any) {
    console.error('[GMAIL SMTP ERROR]', error);
    return {
      success: false,
      isReal: false,
      provider: 'GMAIL_SMTP',
      message: 'Failed to deliver real email via Gmail. Check your App Password credentials in .env.local.',
      error: error.message,
    };
  }
}

/**
 * Dispatches real SMS OTP
 * Supports Fast2SMS (Indian domestic) or Twilio.
 * Falls back to simulation if credentials are not configured.
 */
export async function sendSmsOtp({
  toPhone,
  otp,
  recipientName,
  usn,
}: SmsOtpParams): Promise<NotificationResult> {
  // Clean phone number (strip spaces, dashes, +91)
  const cleanPhone = toPhone.replace(/\D/g, '');
  const tenDigitPhone = cleanPhone.slice(-10);

  // 1. FAST2SMS (India domestic SMS gateway)
  const fast2SmsKey = process.env.FAST2SMS_API_KEY;
  if (fast2SmsKey && tenDigitPhone.length === 10) {
    try {
      const response = await fetch(
        `https://www.fast2sms.com/dev/bulkV2?authorization=${fast2SmsKey}&variables_values=${otp}&route=otp&numbers=${tenDigitPhone}`,
        { method: 'GET' }
      );
      const data = await response.json();
      if (data.return) {
        console.log(`[REAL FAST2SMS SENT] To: ${tenDigitPhone} | Code: ${otp}`);
        return {
          success: true,
          isReal: true,
          provider: 'FAST2SMS',
          message: `Real SMS delivered to +91 ${tenDigitPhone}`,
        };
      }
    } catch (err: any) {
      console.error('[FAST2SMS ERROR]', err);
    }
  }

  // 2. TWILIO (Global SMS gateway)
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

  if (twilioSid && twilioAuthToken && twilioFrom) {
    try {
      const formattedTo = toPhone.startsWith('+') ? toPhone : `+91${tenDigitPhone}`;
      const authHeader = 'Basic ' + Buffer.from(`${twilioSid}:${twilioAuthToken}`).toString('base64');
      const bodyParams = new URLSearchParams({
        To: formattedTo,
        From: twilioFrom,
        Body: `Your Chronos Fest '26 Pass OTP is ${otp} for USN ${usn}. Valid for 10 minutes.`,
      });

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: bodyParams.toString(),
        }
      );

      const twilioData = await response.json();
      if (response.ok && !twilioData.error_code) {
        console.log(`[REAL TWILIO SMS SENT] To: ${formattedTo} | Code: ${otp}`);
        return {
          success: true,
          isReal: true,
          provider: 'TWILIO',
          message: `Real SMS delivered to ${formattedTo}`,
        };
      }
    } catch (err: any) {
      console.error('[TWILIO ERROR]', err);
    }
  }

  // Fallback to simulation if no SMS credentials set
  console.log(`[SMS OTP SIMULATION] To: ${toPhone} | Code: ${otp} | Alumnus: ${recipientName} (${usn})`);
  return {
    success: true,
    isReal: false,
    provider: 'SIMULATION',
    message: 'SMS Simulation Mode. Configure FAST2SMS_API_KEY or TWILIO credentials in .env.local for real SMS.',
  };
}
