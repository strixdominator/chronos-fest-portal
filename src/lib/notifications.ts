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
  provider: 'RESEND' | 'BREVO' | 'GMAIL_RELAY' | 'GMAIL_SMTP' | 'FAST2SMS' | 'TWILIO' | 'SIMULATION';
  message: string;
  simulationCode?: string;
  error?: string;
}

/**
 * Dispatches real HTML OTP email.
 * Supports:
 * 1. Resend API (HTTPS Port 443 - Recommended for Render Free Tier)
 * 2. Brevo API (HTTPS Port 443 - 300 free emails/day)
 * 3. Google Apps Script Webhook (HTTPS Port 443 - Free Gmail relay)
 * 4. Gmail SMTP via Nodemailer (Port 465 SSL, with auto-fallback on cloud port block)
 */
export async function sendEmailOtp({
  toEmail,
  otp,
  recipientName,
  usn,
}: EmailOtpParams): Promise<NotificationResult> {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPassword = process.env.GMAIL_APP_PASSWORD;
  const resendKey = process.env.RESEND_API_KEY;
  const brevoKey = process.env.BREVO_API_KEY;
  const gmailRelayUrl = process.env.GMAIL_RELAY_URL || process.env.GMAIL_WEBHOOK_URL;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your Pass Security Code</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; margin: 0; padding: 20px; color: #f8fafc; }
    .card { max-width: 540px; margin: 0 auto; background: #111827; border: 1px solid #1e293b; border-radius: 0px; overflow: hidden; }
    .header { background: #0a192f; padding: 24px; text-align: center; color: #ffffff; border-bottom: 2px solid #1d4ed8; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; }
    .header p { margin: 6px 0 0; font-size: 13px; font-weight: 600; opacity: 0.9; color: #93c5fd; }
    .content { padding: 32px 24px; text-align: center; }
    .greeting { font-size: 18px; font-weight: 700; color: #ffffff; margin-bottom: 8px; }
    .subtext { font-size: 14px; color: #94a3b8; line-height: 1.5; margin-bottom: 24px; }
    .otp-box { background: #1e293b; border: 2px dashed #3b82f6; border-radius: 0px; padding: 18px; margin: 20px auto; display: inline-block; }
    .otp-code { font-family: monospace; font-size: 38px; font-weight: 800; letter-spacing: 0.25em; color: #60a5fa; margin: 0; padding-left: 0.25em; }
    .warning { font-size: 12px; color: #f59e0b; margin-top: 18px; }
    .footer { border-top: 1px solid #1e293b; padding: 18px; text-align: center; font-size: 12px; color: #64748b; background: #0f172a; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>MILAN 2026</h1>
      <p>Don Bosco Institute of Technology · Official Alumni Pass Portal</p>
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
      DBIT Alumni Affairs & Student Council<br>
      Automated Digital Pass System · MILAN 2026
    </div>
  </div>
</body>
</html>
  `;

  // METHOD 1: Resend HTTP REST API (Uses Port 443 HTTPS - NEVER blocked by Render)
  if (resendKey && resendKey.trim()) {
    try {
      const fromEmail = process.env.RESEND_FROM || 'MILAN 2026 <onboarding@resend.dev>';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [toEmail],
          subject: `${otp} is your MILAN 2026 Verification Code (USN: ${usn})`,
          html: htmlContent,
        }),
      });

      const resData = await res.json();
      if (res.ok && resData.id) {
        console.log(`[RESEND EMAIL SENT] ID: ${resData.id} to ${toEmail}`);
        return {
          success: true,
          isReal: true,
          provider: 'RESEND',
          message: `Real verification email delivered to ${toEmail} via Resend Cloud API!`,
        };
      } else {
        console.error('[RESEND API ERROR]', resData);
      }
    } catch (err: any) {
      console.error('[RESEND FETCH EXCEPTION]', err.message);
    }
  }

  // METHOD 2: Brevo HTTP REST API (Uses Port 443 HTTPS - Free 300 emails/day, NEVER blocked by Render)
  if (brevoKey && brevoKey.trim()) {
    try {
      const senderEmail = process.env.BREVO_SENDER || gmailUser || 'telegramuserkishan@gmail.com';
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoKey.trim(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'MILAN 2026', email: senderEmail },
          to: [{ email: toEmail, name: recipientName }],
          subject: `${otp} is your MILAN 2026 Verification Code (USN: ${usn})`,
          htmlContent: htmlContent,
        }),
      });

      const resData = await res.json();
      if (res.ok && (resData.messageId || resData.id)) {
        console.log(`[BREVO EMAIL SENT] to ${toEmail}`);
        return {
          success: true,
          isReal: true,
          provider: 'BREVO',
          message: `Real verification email delivered to ${toEmail} via Brevo Cloud API!`,
        };
      } else {
        console.error('[BREVO API ERROR]', resData);
      }
    } catch (err: any) {
      console.error('[BREVO FETCH EXCEPTION]', err.message);
    }
  }

  // METHOD 3: Google Apps Script Webhook (Port 443 HTTPS - Free direct Gmail Relay)
  if (gmailRelayUrl && gmailRelayUrl.trim()) {
    try {
      const res = await fetch(gmailRelayUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: toEmail,
          subject: `${otp} is your MILAN 2026 Verification Code (USN: ${usn})`,
          html: htmlContent,
          text: `Your MILAN 2026 verification code is: ${otp}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        return {
          success: true,
          isReal: true,
          provider: 'GMAIL_RELAY',
          message: `Real verification email delivered to ${toEmail} via Gmail Relay!`,
        };
      }
    } catch (err: any) {
      console.error('[GMAIL RELAY EXCEPTION]', err.message);
    }
  }

  // METHOD 4: Direct Gmail SMTP via Nodemailer
  // If Gmail credentials exist, attempt SMTP connection
  if (gmailUser && gmailPassword) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 465,
        secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : true,
        auth: {
          user: gmailUser,
          pass: gmailPassword.replace(/\s+/g, ''),
        },
        tls: { rejectUnauthorized: false },
        family: 4,
        connectionTimeout: 3500, // 3.5s timeout: fails fast if port is blocked by Render
        greetingTimeout: 3500,
        socketTimeout: 5000,
      } as any);

      await transporter.sendMail({
        from: `"MILAN 2026" <${gmailUser}>`,
        to: toEmail,
        subject: `${otp} is your MILAN 2026 Verification Code (USN: ${usn})`,
        text: `Hello ${recipientName},\n\nYour 6-digit verification code for MILAN 2026 entry pass (${usn}) is: ${otp}\n\nThis code expires in 10 minutes. Do not share it with anyone.`,
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
      console.error('[GMAIL SMTP ERROR]', error.message);

      // Check if Render Free Tier port block caused connection timeout
      const isPortBlocked = /timeout|econnrefused|enetunreach|etimedout/i.test(error.message || '');
      if (isPortBlocked) {
        console.warn(`[RENDER FREE TIER SMTP BLOCK DETECTED] Render drops outbound SMTP ports (465/587). Falling back to simulation OTP code.`);
        return {
          success: true,
          isReal: false,
          provider: 'SIMULATION',
          simulationCode: otp,
          message: `Render Free Tier blocks outbound SMTP traffic (ports 465/587). Verification code provided for instant testing: ${otp}`,
        };
      }

      return {
        success: false,
        isReal: false,
        provider: 'GMAIL_SMTP',
        message: 'Failed to deliver real email via Gmail. Check your credentials or use an HTTPS API provider.',
        error: error.message,
      };
    }
  }

  // Fallback: Simulation Mode when no credentials configured
  console.log(`[EMAIL OTP SIMULATION] To: ${toEmail} | Code: ${otp} | Alumnus: ${recipientName} (${usn})`);
  return {
    success: true,
    isReal: false,
    provider: 'SIMULATION',
    simulationCode: otp,
    message: 'Running in simulation mode. Configure RESEND_API_KEY or GMAIL credentials in Render environment.',
  };
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
