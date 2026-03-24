import nodemailer from 'nodemailer';

/**
 * Email service for sending contact response emails
 * Configure SMTP settings in environment variables
 */

// Create reusable transporter
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export interface SendContactResponseEmailParams {
  toEmail: string;
  contactName: string;
  originalMessage: string;
  adminResponse: string;
  companyName?: string;
  companyEmail?: string;
}

/**
 * Generate HTML email content with dashboard-style professional design
 */
function generateHtmlEmail({
  contactName,
  originalMessage,
  adminResponse,
  companyName,
}: {
  contactName: string;
  originalMessage: string;
  adminResponse: string;
  companyName: string;
}): string {
  // Sanitize content for safe HTML display
  const sanitize = (text: string) => text
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');
  
  const safeOriginal = sanitize(originalMessage);
  const safeResponse = sanitize(adminResponse);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Response to Your Inquiry</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 24px 20px; background-color: #06b6d4; text-align: center;">
              <h1 style="margin: 0; font-size: 22px; color: #ffffff; font-weight: 600;">
                Hi ${contactName},
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 24px 20px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151; line-height: 1.6;">
                Thank you for reaching out to us. We have reviewed your message and are responding below.
              </p>
              
              <!-- Original Message -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="padding: 16px; background-color: #f5f5f5; border-left: 5px solid #06b6d4; border-radius: 4px;">
                    <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                      Your Message
                    </p>
                    <p style="margin: 0; font-size: 14px; color: #111827; line-height: 1.6; word-wrap: break-word; white-space: pre-wrap;">
                      ${safeOriginal}
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Admin Response -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="padding: 16px; background-color: #f0fdf4; border-left: 5px solid #22c55e; border-radius: 4px;">
                    <p style="margin: 0 0 8px 0; font-size: 12px; color: #065f46; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                      Our Response
                    </p>
                    <p style="margin: 0; font-size: 14px; color: #065f46; line-height: 1.6; word-wrap: break-word; white-space: pre-wrap;">
                      ${safeResponse}
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; font-size: 16px; color: #374151; line-height: 1.6;">
                Best regards,<br>
                <strong style="color: #111827;">${companyName}</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 0 20px 20px 20px;">
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0 0 16px 0;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center; line-height: 1.5;">
                You received this email because you submitted a message via our dashboard.<br>
                Please do not reply directly to this email.
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Mobile-friendly note -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px;">
          <tr>
            <td style="padding: 16px 20px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                &copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text email content
 */
function generatePlainTextEmail({
  contactName,
  originalMessage,
  adminResponse,
  companyName,
}: {
  contactName: string;
  originalMessage: string;
  adminResponse: string;
  companyName: string;
}): string {
  return `
Hi ${contactName},

Thank you for reaching out to us. We have reviewed your message and are responding below.

--- YOUR MESSAGE ---
${originalMessage}

--- OUR RESPONSE ---
${adminResponse}

Best regards,
${companyName}

---
You received this email because you submitted a message via our dashboard.
Please do not reply directly to this email.
  `.trim();
}

/**
 * Send a response email to a contact submission
 */
export async function sendContactResponseEmail({
  toEmail,
  contactName,
  originalMessage,
  adminResponse,
  companyName = 'Support Team',
  companyEmail = 'support@company.com',
}: SendContactResponseEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Check if SMTP is configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('SMTP not configured, logging email instead:');
      console.log('=== EMAIL TO BE SENT ===');
      console.log('To:', toEmail);
      console.log('From:', companyEmail);
      console.log('Subject:', 'Response to your inquiry');
      console.log('=========================');
      return { success: true, messageId: 'console-log-only' };
    }

    const transporter = createTransporter();

    const htmlContent = generateHtmlEmail({
      contactName,
      originalMessage,
      adminResponse,
      companyName,
    });

    const textContent = generatePlainTextEmail({
      contactName,
      originalMessage,
      adminResponse,
      companyName,
    });

    const info = await transporter.sendMail({
      from: `"${companyName}" <${companyEmail}>`,
      to: toEmail,
      subject: 'Response to your inquiry',
      html: htmlContent,
      text: textContent,
    });

    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send email' 
    };
  }
}

/**
 * Send a simple notification email (for testing)
 */
export async function sendTestEmail(to: string): Promise<boolean> {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('SMTP not configured, cannot send test email');
      return false;
    }

    const transporter = createTransporter();
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: to,
      subject: 'Test Email - Contact Response System',
      text: 'Email system is working correctly!',
    });

    return true;
  } catch (error) {
    console.error('Error sending test email:', error);
    return false;
  }
}
