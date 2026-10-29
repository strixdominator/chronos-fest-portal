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
  provider: 'RESEND' | 'BREVO' | 'GMAIL_RELAY' | 'GMAIL_SMTP' | 'FAST2SMS' | 'TWILIO' | 'WHATSAPP' | 'SIMULATION';
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
  <title>Your MILAN 2026 Verification Code</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #100C09; margin: 0; padding: 24px 12px; color: #F5EFE3; }
    .card { max-width: 560px; margin: 0 auto; background-color: #181410; border: 2px solid #B28B4C; border-radius: 12px; overflow: hidden; box-shadow: 0 16px 50px rgba(0,0,0,0.7); }
    .header { background-color: #130F0C; padding: 26px 20px 22px; text-align: center; border-bottom: 2px solid #B28B4C; }
    .header h1 { margin: 0; font-family: 'Times New Roman', Georgia, serif; font-size: 26px; font-weight: 700; letter-spacing: 1px; color: #FFFFFF; text-transform: uppercase; }
    .header h1 span { color: #E5D2A5; }
    .header p { margin: 6px 0 0; font-size: 11px; font-weight: 700; color: #E5D2A5; letter-spacing: 2px; text-transform: uppercase; }
    .content { padding: 32px 24px; text-align: center; background-color: #1A1511; }
    .greeting { font-family: 'Times New Roman', Georgia, serif; font-size: 22px; font-weight: 700; color: #F5EFE3; margin-bottom: 8px; }
    .subtext { font-size: 13.5px; color: #D1C7B7; line-height: 1.6; margin-bottom: 24px; }
    .otp-box { background-color: #211A14; border: 2px dashed #B28B4C; border-radius: 10px; padding: 20px 32px; margin: 20px auto; display: inline-block; box-shadow: 0 4px 20px rgba(178, 139, 76, 0.2); }
    .otp-code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 38px; font-weight: 800; letter-spacing: 0.25em; color: #E5D2A5; margin: 0; padding-left: 0.25em; }
    .warning { font-size: 12px; color: #D1A354; margin-top: 18px; line-height: 1.5; padding: 10px 14px; background-color: rgba(178, 139, 76, 0.1); border-left: 3px solid #B28B4C; border-radius: 4px; text-align: left; }
    .footer { border-top: 1px solid rgba(178, 139, 76, 0.25); padding: 20px; text-align: center; font-size: 11px; color: #9A8E7F; background-color: #100C09; line-height: 1.6; }
    .footer-tag { color: #E5D2A5; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 4px; }
    .footer-dev { font-size: 10.5px; color: #736758; margin-top: 8px; }
  </style>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #100C09; margin: 0; padding: 24px 12px; color: #F5EFE3;">
  <div class="card" style="max-width: 560px; margin: 0 auto; background-color: #181410; border: 2px solid #B28B4C; border-radius: 12px; overflow: hidden; box-shadow: 0 16px 50px rgba(0,0,0,0.7);">
    
    <!-- HEADER -->
    <div class="header" style="background-color: #130F0C; padding: 26px 20px 22px; text-align: center; border-bottom: 2px solid #B28B4C;">
      <h1 style="margin: 0; font-family: 'Times New Roman', Georgia, serif; font-size: 26px; font-weight: 700; letter-spacing: 1px; color: #FFFFFF; text-transform: uppercase;">
        MILAN <span style="color: #E5D2A5;">2026</span>
      </h1>
      <p style="margin: 6px 0 0; font-size: 11px; font-weight: 700; color: #E5D2A5; letter-spacing: 2px; text-transform: uppercase;">
        DON BOSCO INSTITUTE OF TECHNOLOGY, BANGALORE
      </p>
    </div>

    <!-- CONTENT -->
    <div class="content" style="padding: 32px 24px; text-align: center; background-color: #1A1511;">
      <div class="greeting" style="font-family: 'Times New Roman', Georgia, serif; font-size: 22px; font-weight: 700; color: #F5EFE3; margin-bottom: 8px;">
        Hello, ${recipientName}!
      </div>
      <div class="subtext" style="font-size: 13.5px; color: #D1C7B7; line-height: 1.6; margin-bottom: 24px;">
        A request was made to verify and unlock the alumni event entry pass for University Seat Number (USN) <strong style="color: #E5D2A5;">${usn}</strong>.
      </div>

      <!-- OTP CODE BOX -->
      <div class="otp-box" style="background-color: #211A14; border: 2px dashed #B28B4C; border-radius: 10px; padding: 20px 32px; margin: 20px auto; display: inline-block; box-shadow: 0 4px 20px rgba(178, 139, 76, 0.2);">
        <div class="otp-code" style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 38px; font-weight: 800; letter-spacing: 0.25em; color: #E5D2A5; margin: 0; padding-left: 0.25em;">
          ${otp}
        </div>
      </div>

      <div style="font-size: 12.5px; color: #B5A897; margin-top: 12px;">
        This verification code is strictly valid for <strong style="color: #E5D2A5;">10 minutes</strong>.
      </div>
      <div class="warning" style="font-size: 12px; color: #D1A354; margin-top: 20px; line-height: 1.5; padding: 10px 14px; background-color: rgba(178, 139, 76, 0.1); border-left: 3px solid #B28B4C; border-radius: 4px; text-align: left;">
        ⚠️ If you did not request this pass, please ignore this email. Never share this verification code with anyone.
      </div>
    </div>

    <!-- FOOTER -->
    <div class="footer" style="border-top: 1px solid rgba(178, 139, 76, 0.25); padding: 20px; text-align: center; font-size: 11px; color: #9A8E7F; background-color: #100C09; line-height: 1.6;">
      <div class="footer-tag" style="color: #E5D2A5; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 4px;">
        MILAN 2026 · ALUMNI MEET
      </div>
      <div>
        Don Bosco Institute of Technology Alumni Association (R) · Reconnecting Relations<br>
        Kumbalagodu, Mysore Road, Bengaluru – 560074, India
      </div>
      <div class="footer-dev" style="font-size: 10.5px; color: #736758; margin-top: 8px;">
        Made with ❤️ by Kishan
      </div>
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
        const errMsg = resData.message || (resData.error && resData.error.message) || JSON.stringify(resData);
        console.warn(`[RESEND API NOTICE] ${errMsg} -> Falling back to Brevo/alternative delivery...`);
      }
    } catch (err: any) {
      console.warn(`[RESEND FETCH NOTICE] ${err.message} -> Falling back to Brevo/alternative delivery...`);
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
        const errMsg = resData.message || JSON.stringify(resData);
        return {
          success: false,
          isReal: false,
          provider: 'BREVO',
          error: errMsg,
          message: `Brevo Error: ${errMsg}`,
        };
      }
    } catch (err: any) {
      console.error('[BREVO FETCH EXCEPTION]', err.message);
      return {
        success: false,
        isReal: false,
        provider: 'BREVO',
        error: err.message,
        message: `Brevo Network Error: ${err.message}`,
      };
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
  const fast2SmsKey = process.env.FAST2SMS_API_KEY?.trim();
  let fast2SmsError = '';
  if (fast2SmsKey && tenDigitPhone.length === 10) {
    // Method 1: Official Fast2SMS bulkV2 POST with authorization header
    try {
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': fast2SmsKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'otp',
          variables_values: String(otp),
          numbers: tenDigitPhone,
        }),
      });
      const data = await response.json();
      if (data.return) {
        const msg = Array.isArray(data.message) ? data.message.join(', ') : (data.message || 'Sent successfully');
        console.log(`[REAL FAST2SMS SENT] To: ${tenDigitPhone} | Code: ${otp} | ${msg}`);
        return {
          success: true,
          isReal: true,
          provider: 'FAST2SMS',
          message: `Real SMS delivered to +91 ${tenDigitPhone} (${msg})`,
        };
      } else {
        fast2SmsError = Array.isArray(data.message) ? data.message.join(', ') : (data.message || JSON.stringify(data));
        console.warn('[FAST2SMS POST ERROR]', fast2SmsError);
      }
    } catch (err: any) {
      fast2SmsError = err.message;
      console.warn('[FAST2SMS POST EXCEPTION]', err.message);
    }

    // Method 2: Fast2SMS GET query fallback
    try {
      const getUrl = `https://www.fast2sms.com/dev/bulkV2?authorization=${encodeURIComponent(fast2SmsKey)}&variables_values=${encodeURIComponent(otp)}&route=otp&numbers=${tenDigitPhone}`;
      const response = await fetch(getUrl, { method: 'GET' });
      const data = await response.json();
      if (data.return) {
        const msg = Array.isArray(data.message) ? data.message.join(', ') : (data.message || 'Sent successfully');
        console.log(`[REAL FAST2SMS GET SENT] To: ${tenDigitPhone} | Code: ${otp} | ${msg}`);
        return {
          success: true,
          isReal: true,
          provider: 'FAST2SMS',
          message: `Real SMS delivered to +91 ${tenDigitPhone} (${msg})`,
        };
      } else {
        fast2SmsError = Array.isArray(data.message) ? data.message.join(', ') : (data.message || JSON.stringify(data));
        console.error('[FAST2SMS GET ERROR]', fast2SmsError);
      }
    } catch (err: any) {
      console.error('[FAST2SMS GET EXCEPTION]', err.message);
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

  // Fallback to simulation if no SMS credentials set or if Fast2SMS returned a portal notice
  console.log(`[SMS OTP SIMULATION] To: ${toPhone} | Code: ${otp} | Alumnus: ${recipientName} (${usn})`);
  return {
    success: true,
    isReal: false,
    provider: 'SIMULATION',
    simulationCode: otp,
    error: fast2SmsError || undefined,
    message: fast2SmsError 
      ? `Fast2SMS notice: ${fast2SmsError}. (Testing code: ${otp})`
      : 'SMS Simulation Mode. Configure FAST2SMS_API_KEY or TWILIO credentials in .env.local for real SMS.',
  };
}

export interface WhatsAppOtpParams {
  toPhone: string;
  otp: string;
  recipientName: string;
  usn: string;
}

/**
 * Dispatches real WhatsApp OTP via Meta WhatsApp Cloud API.
 * Normalizes Indian phone numbers to E.164 (91XXXXXXXXXX).
 * Falls back to simulation mode if WHATSAPP_PHONE_NUMBER_ID / ACCESS_TOKEN are not configured.
 */
export async function sendWhatsAppOtp({
  toPhone,
  otp,
  recipientName,
  usn,
}: WhatsAppOtpParams): Promise<NotificationResult> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME?.trim() || 'milan_pass_otp';
  const languageCode = process.env.WHATSAPP_LANGUAGE_CODE?.trim() || 'en_US';

  // Fast2SMS WhatsApp & OTP Gateway credentials
  const fast2SmsKey = process.env.FAST2SMS_API_KEY?.trim();
  const fast2SmsWaMessageId = process.env.FAST2SMS_WA_MESSAGE_ID?.trim();
  const fast2SmsWaPhoneId = process.env.FAST2SMS_WA_PHONE_NUMBER_ID?.trim() || process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  let fast2SmsError = '';

  // Normalize phone number (strip non-digits)
  const cleanPhone = toPhone.replace(/\D/g, '');
  // Format standard 10-digit Indian phone numbers
  const tenDigitPhone = cleanPhone.slice(-10);
  const recipientE164 = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  // METHOD 1: Fast2SMS WhatsApp Business API Gateway
  if (fast2SmsKey && (fast2SmsWaMessageId || fast2SmsWaPhoneId)) {
    try {
      const msgId = fast2SmsWaMessageId || '1';
      const phoneId = fast2SmsWaPhoneId || '';
      const params = new URLSearchParams({
        message_id: msgId,
        numbers: tenDigitPhone,
        variables_values: String(otp),
      });
      if (phoneId) {
        params.append('phone_number_id', phoneId);
      }

      const response = await fetch(`https://www.fast2sms.com/dev/whatsapp?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': fast2SmsKey,
        },
      });

      const data = await response.json();
      if (data.status === true || data.return === true) {
        console.log(`[REAL FAST2SMS WHATSAPP SENT] To: +91 ${tenDigitPhone} | Code: ${otp} | Req: ${data.request_id || ''}`);
        return {
          success: true,
          isReal: true,
          provider: 'FAST2SMS',
          message: `Official WhatsApp verification code sent to +91 ${tenDigitPhone} via Fast2SMS!`,
        };
      } else {
        const errMsg = Array.isArray(data.message) ? data.message.join(', ') : (data.message || JSON.stringify(data));
        console.warn('[FAST2SMS WHATSAPP NOTICE]', errMsg);
        fast2SmsError = errMsg;
      }
    } catch (err: any) {
      console.warn('[FAST2SMS WHATSAPP EXCEPTION]', err.message);
      fast2SmsError = err.message;
    }
  }

  // METHOD 2: Official Meta WhatsApp Business Cloud API
  if (phoneNumberId && accessToken) {
    try {
      // Build Meta WhatsApp Business Cloud API payload
      const payload: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipientE164,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: String(otp) },
              ],
            },
            {
              type: 'button',
              sub_type: 'url',
              index: '0',
              parameters: [
                { type: 'text', text: String(otp) },
              ],
            },
          ],
        },
      };

      const response = await fetch(
        `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (response.ok && data.messages?.[0]?.id) {
        console.log(`[REAL WHATSAPP OTP SENT] To: +${recipientE164} | Code: ${otp} | USN: ${usn} | MsgId: ${data.messages[0].id}`);
        return {
          success: true,
          isReal: true,
          provider: 'WHATSAPP',
          message: `Official WhatsApp verification code sent to +${recipientE164}!`,
        };
      }

      // If button component failed (e.g. user template doesn't have a button), retry with body only
      if (data.error && /button|component/i.test(data.error.message || '')) {
        console.warn('[WHATSAPP RETRY WITHOUT BUTTON]', data.error.message);
        const retryPayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipientE164,
          type: 'template',
          template: {
            name: templateName,
            language: { code: languageCode },
            components: [
              {
                type: 'body',
                parameters: [{ type: 'text', text: String(otp) }],
              },
            ],
          },
        };
        const retryRes = await fetch(
          `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(retryPayload),
          }
        );
        const retryData = await retryRes.json();
        if (retryRes.ok && retryData.messages?.[0]?.id) {
          console.log(`[REAL WHATSAPP OTP SENT (FALLBACK)] To: +${recipientE164} | Code: ${otp}`);
          return {
            success: true,
            isReal: true,
            provider: 'WHATSAPP',
            message: `Official WhatsApp verification code sent to +${recipientE164}!`,
          };
        }
      }

      const errMsg = data.error?.message || 'Meta WhatsApp API returned an error';
      console.error('[WHATSAPP API ERROR]', data.error);
      return {
        success: false,
        isReal: false,
        provider: 'WHATSAPP',
        error: errMsg,
        message: `WhatsApp delivery failed: ${errMsg}`,
      };
    } catch (err: any) {
      console.error('[WHATSAPP EXCEPTION]', err.message);
      return {
        success: false,
        isReal: false,
        provider: 'WHATSAPP',
        error: err.message,
        message: `WhatsApp network error: ${err.message}`,
      };
    }
  }

  // METHOD 3: Fast2SMS Quick OTP Route Fallback (if user only has Fast2SMS API key)
  if (fast2SmsKey) {
    try {
      const getUrl = `https://www.fast2sms.com/dev/bulkV2?authorization=${encodeURIComponent(fast2SmsKey)}&variables_values=${encodeURIComponent(otp)}&route=otp&numbers=${tenDigitPhone}`;
      const response = await fetch(getUrl, { method: 'GET' });
      const data = await response.json();
      if (data.return) {
        console.log(`[REAL FAST2SMS OTP FALLBACK SENT] To: ${tenDigitPhone} | Code: ${otp}`);
        return {
          success: true,
          isReal: true,
          provider: 'FAST2SMS',
          message: `Verification code delivered to +91 ${tenDigitPhone} via Fast2SMS!`,
        };
      } else {
        const errMsg = Array.isArray(data.message) ? data.message.join(', ') : (data.message || JSON.stringify(data));
        console.warn('[FAST2SMS FALLBACK NOTICE]', errMsg);
        fast2SmsError = errMsg;
      }
    } catch (err: any) {
      console.warn('[FAST2SMS FALLBACK EXCEPTION]', err.message);
      fast2SmsError = err.message;
    }
  }

  // If Fast2SMS returned an explicit error (e.g. Invalid Authentication or Low Balance)
  if (fast2SmsError) {
    console.warn('[FAST2SMS DIAGNOSIS NOTICE]', fast2SmsError);
    return {
      success: false,
      isReal: false,
      provider: 'FAST2SMS',
      error: fast2SmsError,
      message: `Fast2SMS notice: ${fast2SmsError}. Please check your Fast2SMS API key and wallet.`,
    };
  }

  // Simulation mode fallback for local development or testing without credentials
  console.log(`[WHATSAPP OTP SIMULATION] To: +${recipientE164} | Code: ${otp} | Alumnus: ${recipientName} (${usn})`);
  return {
    success: true,
    isReal: false,
    provider: 'SIMULATION',
    simulationCode: otp,
    message: `WhatsApp Simulation Mode: Verification code is ${otp}. Configure Fast2SMS or Meta WhatsApp credentials for live delivery.`,
  };
}

export interface EmailPassParams {
  toEmail: string;
  recipientName: string;
  usn: string;
  ticketCode: string;
  department?: string;
  year?: string;
  qrDataUrl: string;
  passUrl?: string;
}

/**
 * Dispatches official digital entry pass with QR code directly to alumnus email.
 */
export async function sendEmailPass({
  toEmail,
  recipientName,
  usn,
  ticketCode,
  department = 'Engineering',
  year = '2026',
  qrDataUrl,
  passUrl,
}: EmailPassParams): Promise<NotificationResult> {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPassword = process.env.GMAIL_APP_PASSWORD;
  const resendKey = process.env.RESEND_API_KEY;
  const brevoKey = process.env.BREVO_API_KEY;
  const gmailRelayUrl = process.env.GMAIL_RELAY_URL || process.env.GMAIL_WEBHOOK_URL;

  // Ensure production live URL for online pass button (never localhost)
  const fallbackDomain = 'https://milan202622.onrender.com';
  let effectivePassUrl = passUrl && !passUrl.includes('localhost') && !passUrl.includes('127.0.0.1')
    ? passUrl
    : (process.env.NEXT_PUBLIC_APP_URL || fallbackDomain).replace(/\/$/, '') + `/ticket/${ticketCode}`;
  
  if (effectivePassUrl.includes('localhost') || effectivePassUrl.includes('127.0.0.1')) {
    effectivePassUrl = `${fallbackDomain}/ticket/${ticketCode}`;
  }

  // Use HTTPS QR server URL so Gmail and all mail clients load it reliably (Gmail strips base64 data URIs)
  const onlineQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(effectivePassUrl)}`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your MILAN 2026 Official Entry Pass</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #100C09; margin: 0; padding: 24px 12px; color: #F5EFE3; }
    .card { max-width: 580px; margin: 0 auto; background-color: #181410; border: 2px solid #B28B4C; border-radius: 12px; overflow: hidden; box-shadow: 0 16px 50px rgba(0,0,0,0.7); }
    .header { background-color: #130F0C; padding: 28px 20px 24px; text-align: center; border-bottom: 2px solid #B28B4C; }
    .header h1 { margin: 0; font-family: 'Times New Roman', Georgia, serif; font-size: 28px; font-weight: 700; letter-spacing: 1px; color: #FFFFFF; text-transform: uppercase; }
    .header h1 span { color: #E5D2A5; }
    .header p { margin: 6px 0 0; font-size: 11px; font-weight: 700; color: #E5D2A5; letter-spacing: 2px; text-transform: uppercase; }
    .badge { display: inline-block; background-color: rgba(178, 139, 76, 0.2); border: 1px solid #B28B4C; color: #E5D2A5; padding: 6px 14px; font-weight: 800; font-size: 10.5px; letter-spacing: 1.5px; margin-top: 14px; border-radius: 4px; text-transform: uppercase; }
    .content { padding: 32px 24px; text-align: center; background-color: #1A1511; }
    .name { font-family: 'Times New Roman', Georgia, serif; font-size: 24px; font-weight: 700; color: #F5EFE3; margin-bottom: 4px; }
    .usn { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 14px; color: #E5D2A5; font-weight: 700; letter-spacing: 1.5px; margin-bottom: 20px; }
    .qr-box { background-color: #FFFFFF; padding: 16px; display: inline-block; border: 3px solid #B28B4C; border-radius: 10px; margin: 0 auto 20px; box-shadow: 0 4px 20px rgba(178, 139, 76, 0.25); }
    .qr-img { display: block; width: 220px; height: 220px; margin: 0 auto; border: 0; }
    .event-info { background-color: #231C16; border: 1px solid rgba(178, 139, 76, 0.4); border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; text-align: center; }
    .event-info-date { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; font-weight: 700; color: #E5D2A5; letter-spacing: 1px; margin-bottom: 4px; }
    .event-info-venue { font-size: 11.5px; color: #E8DFCF; letter-spacing: 0.5px; }
    .notice { font-size: 12px; line-height: 1.55; color: #D1C7B7; margin-bottom: 24px; padding: 12px 14px; background-color: rgba(178, 139, 76, 0.1); border-left: 3px solid #B28B4C; border-radius: 4px; text-align: left; }
    .btn { display: inline-block; background-color: #B28B4C; background-image: linear-gradient(135deg, #C59D5B 0%, #A47B3A 100%); color: #17130F; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 800; font-size: 13px; letter-spacing: 1.2px; text-transform: uppercase; text-decoration: none; padding: 14px 32px; border-radius: 6px; box-shadow: 0 4px 16px rgba(0,0,0,0.4); border: 1px solid #D6B26F; }
    .footer { border-top: 1px solid rgba(178, 139, 76, 0.25); padding: 22px 20px; text-align: center; font-size: 11px; color: #9A8E7F; background-color: #100C09; line-height: 1.6; }
    .footer-tag { color: #E5D2A5; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 4px; }
    .footer-dev { font-size: 10.5px; color: #736758; margin-top: 8px; }
  </style>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #100C09; margin: 0; padding: 24px 12px; color: #F5EFE3;">
  <div class="card" style="max-width: 580px; margin: 0 auto; background-color: #181410; border: 2px solid #B28B4C; border-radius: 12px; overflow: hidden; box-shadow: 0 16px 50px rgba(0,0,0,0.7);">
    
    <!-- HEADER -->
    <div class="header" style="background-color: #130F0C; padding: 28px 20px 24px; text-align: center; border-bottom: 2px solid #B28B4C;">
      <h1 style="margin: 0; font-family: 'Times New Roman', Georgia, serif; font-size: 28px; font-weight: 700; letter-spacing: 1px; color: #FFFFFF; text-transform: uppercase;">
        MILAN <span style="color: #E5D2A5;">2026</span>
      </h1>
      <p style="margin: 6px 0 0; font-size: 11px; font-weight: 700; color: #E5D2A5; letter-spacing: 2px; text-transform: uppercase;">
        DON BOSCO INSTITUTE OF TECHNOLOGY, BANGALORE
      </p>
      <div class="badge" style="display: inline-block; background-color: rgba(178, 139, 76, 0.2); border: 1px solid #B28B4C; color: #E5D2A5; padding: 6px 14px; font-weight: 800; font-size: 10.5px; letter-spacing: 1.5px; margin-top: 14px; border-radius: 4px; text-transform: uppercase;">
        OFFICIAL ALUMNI ADMISSION CREDENTIAL
      </div>
    </div>

    <!-- CONTENT -->
    <div class="content" style="padding: 32px 24px; text-align: center; background-color: #1A1511;">
      <div class="name" style="font-family: 'Times New Roman', Georgia, serif; font-size: 24px; font-weight: 700; color: #F5EFE3; margin-bottom: 4px;">
        ${recipientName}
      </div>
      <div class="usn" style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 14px; color: #E5D2A5; font-weight: 700; letter-spacing: 1.5px; margin-bottom: 20px;">
        USN: ${usn}
      </div>

      <!-- QR CODE CONTAINER -->
      <div class="qr-box" style="background-color: #FFFFFF; padding: 16px; display: inline-block; border: 3px solid #B28B4C; border-radius: 10px; margin: 0 auto 20px; box-shadow: 0 4px 20px rgba(178, 139, 76, 0.25);">
        <img src="${onlineQrUrl}" alt="MILAN 2026 QR Entry Pass" class="qr-img" width="220" height="220" style="display: block; margin: 0 auto; width: 220px; height: 220px; border: 0;" />
      </div>

      <!-- EVENT SCHEDULE STRIP -->
      <div class="event-info" style="background-color: #231C16; border: 1px solid rgba(178, 139, 76, 0.4); border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; text-align: center;">
        <div class="event-info-date" style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; font-weight: 700; color: #E5D2A5; letter-spacing: 1px; margin-bottom: 4px;">
          📅 SATURDAY, 7 NOVEMBER 2026 · 2:30 PM (GATES OPEN: 2:00 PM)
        </div>
        <div class="event-info-venue" style="font-size: 11.5px; color: #E8DFCF; letter-spacing: 0.5px;">
          📍 DBIT CRICKET GROUND, MYSORE ROAD, BANGALORE
        </div>
      </div>

      <!-- CREDENTIAL DETAILS TABLE -->
      <table style="width: 100%; background-color: #211A14; border: 1px solid rgba(178, 139, 76, 0.3); border-radius: 8px; margin-bottom: 20px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; border-collapse: separate; border-spacing: 0;">
        <tr>
          <td style="padding: 10px 14px; color: #B28B4C; font-weight: 700; width: 38%; border-bottom: 1px solid rgba(178, 139, 76, 0.15);">TICKET CODE:</td>
          <td style="padding: 10px 14px; color: #FFFFFF; font-weight: 700; border-bottom: 1px solid rgba(178, 139, 76, 0.15);">${ticketCode}</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; color: #B28B4C; font-weight: 700; border-bottom: 1px solid rgba(178, 139, 76, 0.15);">DEPARTMENT:</td>
          <td style="padding: 10px 14px; color: #F5EFE3; font-weight: 600; border-bottom: 1px solid rgba(178, 139, 76, 0.15);">${department}</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; color: #B28B4C; font-weight: 700; border-bottom: 1px solid rgba(178, 139, 76, 0.15);">BATCH:</td>
          <td style="padding: 10px 14px; color: #F5EFE3; font-weight: 600; border-bottom: 1px solid rgba(178, 139, 76, 0.15);">${year}</td>
        </tr>
        <tr>
          <td style="padding: 10px 14px; color: #B28B4C; font-weight: 700;">ADMISSION:</td>
          <td style="padding: 10px 14px; color: #E5D2A5; font-weight: 700;">VERIFIED ALUMNI ENTRY PASS</td>
        </tr>
      </table>

      <!-- GATE NOTICE -->
      <div class="notice" style="font-size: 12px; line-height: 1.55; color: #D1C7B7; margin-bottom: 24px; padding: 12px 14px; background-color: rgba(178, 139, 76, 0.1); border-left: 3px solid #B28B4C; border-radius: 4px; text-align: left;">
        ⚡ <strong>Gate Security Instruction:</strong> Present this QR Code directly from your smartphone or printout at the verification gate for immediate wristband issuance.
      </div>

      <!-- CTA BUTTON -->
      <div style="margin-top: 10px;">
        <a href="${effectivePassUrl}" class="btn" target="_blank" style="display: inline-block; background-color: #B28B4C; background-image: linear-gradient(135deg, #C59D5B 0%, #A47B3A 100%); color: #17130F; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 800; font-size: 13px; letter-spacing: 1.2px; text-transform: uppercase; text-decoration: none; padding: 14px 32px; border-radius: 6px; box-shadow: 0 4px 16px rgba(0,0,0,0.4); border: 1px solid #D6B26F;">
          VIEW DIGITAL PASS ON PORTAL ↗
        </a>
      </div>
    </div>

    <!-- FOOTER -->
    <div class="footer" style="border-top: 1px solid rgba(178, 139, 76, 0.25); padding: 22px 20px; text-align: center; font-size: 11px; color: #9A8E7F; background-color: #100C09; line-height: 1.6;">
      <div class="footer-tag" style="color: #E5D2A5; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 4px;">
        MILAN 2026 · ALUMNI MEET
      </div>
      <div>
        Don Bosco Institute of Technology Alumni Association (R) · Reconnecting Relations<br>
        Kumbalagodu, Mysore Road, Bengaluru – 560074, India
      </div>
      <div class="footer-dev" style="font-size: 10.5px; color: #736758; margin-top: 8px;">
        Made with ❤️ by Kishan
      </div>
    </div>
  </div>
</body>
</html>
  `;

  // METHOD 1: Resend HTTP REST API
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
          subject: `Your MILAN 2026 Official Entry Pass & QR Code (${usn})`,
          html: htmlContent,
        }),
      });

      const resData = await res.json();
      if (res.ok && resData.id) {
        console.log(`[RESEND PASS SENT] ID: ${resData.id} to ${toEmail}`);
        return {
          success: true,
          isReal: true,
          provider: 'RESEND',
          message: `Official Pass with QR Code delivered to ${toEmail} via Resend!`,
        };
      }
    } catch (err: any) {
      console.error('[RESEND PASS ERROR]', err.message);
    }
  }

  // METHOD 2: Brevo HTTP REST API
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
          subject: `Your MILAN 2026 Official Entry Pass & QR Code (${usn})`,
          htmlContent: htmlContent,
        }),
      });

      const resData = await res.json();
      if (res.ok && (resData.messageId || resData.id)) {
        console.log(`[BREVO PASS SENT] to ${toEmail}`);
        return {
          success: true,
          isReal: true,
          provider: 'BREVO',
          message: `Official Pass with QR Code delivered to ${toEmail} via Brevo!`,
        };
      }
    } catch (err: any) {
      console.error('[BREVO PASS ERROR]', err.message);
    }
  }

  // METHOD 3: Gmail Webhook Relay
  if (gmailRelayUrl && gmailRelayUrl.trim()) {
    try {
      const res = await fetch(gmailRelayUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: toEmail,
          subject: `Your MILAN 2026 Official Entry Pass & QR Code (${usn})`,
          html: htmlContent,
          text: `Hello ${recipientName},\nYour MILAN 2026 Entry Pass code is ${ticketCode} for USN ${usn}.\nDate: 7 November 2026 at 2:30 PM (Gates open 2:00 PM) at DBIT Cricket Ground.\nView online: ${passUrl || 'https://milan2026.dbit.co.in'}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        return {
          success: true,
          isReal: true,
          provider: 'GMAIL_RELAY',
          message: `Pass delivered to ${toEmail} via Gmail Relay!`,
        };
      }
    } catch (err: any) {
      console.error('[GMAIL RELAY PASS ERROR]', err.message);
    }
  }

  // METHOD 4: Direct Nodemailer Gmail SMTP
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
        connectionTimeout: 4000,
        socketTimeout: 6000,
      } as any);

      await transporter.sendMail({
        from: `"MILAN 2026" <${gmailUser}>`,
        to: toEmail,
        subject: `Your MILAN 2026 Official Entry Pass & QR Code (${usn})`,
        html: htmlContent,
        text: `Hello ${recipientName},\nYour MILAN 2026 Entry Pass code is ${ticketCode} for USN ${usn}.\nDate: 7 November 2026 at 2:30 PM (Gates open 2:00 PM) at DBIT Cricket Ground.\nView pass: ${passUrl || ''}`,
      });

      console.log(`[REAL GMAIL SMTP PASS SENT] Successfully delivered pass to ${toEmail} for ${usn}`);
      return {
        success: true,
        isReal: true,
        provider: 'GMAIL_SMTP',
        message: `Official Pass with QR Code delivered to ${toEmail}!`,
      };
    } catch (error: any) {
      console.error('[GMAIL SMTP PASS ERROR]', error.message);
    }
  }

  // Fallback simulation
  console.log(`[PASS EMAIL SIMULATION] To: ${toEmail} | Alumnus: ${recipientName} (${usn}) | Code: ${ticketCode}`);
  return {
    success: true,
    isReal: false,
    provider: 'SIMULATION',
    message: `Pass simulated for ${toEmail}. For live email dispatch, verify BREVO_API_KEY, RESEND_API_KEY or GMAIL in .env.local.`,
  };
}

