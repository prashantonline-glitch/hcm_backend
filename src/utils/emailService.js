const nodemailer = require('nodemailer');

const createTransporter = async () => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
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
      }
    });
  }

  // Fallback for development / unconfigured credentials
  console.log('⚠️  Real SMTP credentials not configured or using placeholders. Using mock email service.');
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
    const transporter = await createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"HCM Cloud Portal" <noreply@hcmportal.local>',
      to: options.to,
      subject: options.subject,
      text: options.text || '',
      html: options.html || (options.text ? `<p>${options.text.replace(/\n/g, '<br/>')}</p>` : ''),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService] Email sent successfully to "${options.to}" (MessageID: ${info.messageId})`);
    return { success: true, info };
  } catch (error) {
    console.error(`[EmailService] Error sending email to "${options?.to}":`, error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { sendEmail };
