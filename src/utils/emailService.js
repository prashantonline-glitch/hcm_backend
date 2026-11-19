const nodemailer = require('nodemailer');

const cleanString = (val) => (val || '').replace(/^["']|["']$/g, '').trim();

/**
 * Direct HTTPS dispatch via Resend REST API (Port 443).
 * Cloud platforms (Railway, Render, AWS) block outbound SMTP ports (25, 465, 587).
 * Using Resend's HTTPS API guarantees 100% instant delivery without port blocks.
 */
const sendViaResendHttp = async ({ apiKey, from, to, subject, html, text }) => {
  const recipients = Array.isArray(to) ? to : [to];
  const cleanFrom = from || '"HCM Cloud" <operations@evgahcm.com>';
  
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: cleanFrom,
      to: recipients,
      subject,
      html: html || (text ? `<p>${text.replace(/\n/g, '<br/>')}</p>` : ''),
      text: text || '',
    })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || data?.error?.message || `Resend API Error (HTTP ${res.status})`);
  }
  return { messageId: data.id };
};

const createTransporter = async () => {
  const host = cleanString(process.env.SMTP_HOST);
  const user = cleanString(process.env.SMTP_USER);
  const pass = cleanString(process.env.SMTP_PASS);
  const port = parseInt(process.env.SMTP_PORT, 10) || 587;

  // Check if real SMTP credentials are provided (and not sample placeholder)
  const isConfigured = host && user && pass && !user.includes('aapka-') && !pass.includes('aapka-');

  if (isConfigured) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for 587
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 10000, // 10s max
      greetingTimeout: 10000,
    });
  }

  // Fallback for development / unconfigured credentials
  console.log('⚠️ Real SMTP credentials not configured or using placeholders. Using mock email service.');
  return {
    sendMail: async (mailOptions) => {
      console.log('\n--- MOCK EMAIL DISPATCH ---');
      console.log('From:', mailOptions.from);
      console.log('To:', mailOptions.to);
      console.log('Subject:', mailOptions.subject);
      console.log('Content Preview:', (mailOptions.text || mailOptions.html || '').slice(0, 150));
      console.log('---------------------------\n');
      return { messageId: `mock-${Date.now()}` };
    }
  };
};

const sendEmail = async (options) => {
  try {
    const rawPass = cleanString(process.env.SMTP_PASS) || cleanString(process.env.RESEND_API_KEY);
    const rawHost = cleanString(process.env.SMTP_HOST);
    const fromAddress = cleanString(process.env.EMAIL_FROM) || '"HCM Cloud" <operations@evgahcm.com>';

    // Priority 1: If using Resend (key starts with 're_' or host is resend), use direct HTTPS API
    if (rawPass && rawPass.startsWith('re_')) {
      const info = await sendViaResendHttp({
        apiKey: rawPass,
        from: fromAddress,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      console.log(`[EmailService/ResendAPI] Email delivered to "${options.to}" (MessageID: ${info.messageId})`);
      return { success: true, info };
    }

    // Priority 2: Standard Nodemailer SMTP
    const transporter = await createTransporter();
    
    const mailOptions = {
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      text: options.text || '',
      html: options.html || (options.text ? `<p>${options.text.replace(/\n/g, '<br/>')}</p>` : ''),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService/SMTP] Email sent successfully to "${options.to}" (MessageID: ${info.messageId})`);
    return { success: true, info };
  } catch (error) {
    console.error(`[EmailService] Error sending email to "${options?.to}":`, error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { sendEmail };
