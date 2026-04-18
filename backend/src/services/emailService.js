const sgMail = require('@sendgrid/mail');

/**
 * Institutional Email Dispatcher
 * Formally handles clinical notifications and statutory recovery tokens.
 */
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn('Institutional Warning: SENDGRID_API_KEY not detected. Statutory dispatch is in console-mirroring mode.');
}

const sendEmail = async ({ to, subject, html, text }) => {
  const msg = {
    to,
    from: process.env.EMAIL_FROM || 'noreply@robomed.institutional',
    subject: `[RoboMed OS] ${subject}`,
    text,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 40px; border: 1px solid #eee; border-radius: 20px;">
        <h2 style="color: #10b981; text-transform: uppercase; letter-spacing: 2px; border-bottom: 2px solid #f0fdf4; padding-bottom: 10px;">OELOD RoboMed OS</h2>
        <div style="color: #4b5563; line-height: 1.6; margin-top: 20px;">
          ${html}
        </div>
        <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px;">
        <p style="color: #9ca3af; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; text-align: center; margin-top: 20px;">
          Institutional Security Manifold · v2.1.0 · CONFIDENTIAL
        </p>
      </div>
    `,
  };

  try {
    if (process.env.NODE_ENV === 'production' && process.env.SENDGRID_API_KEY) {
      await sgMail.send(msg);
    } else {
      console.log('--- INSTITUTIONAL DISPATCH BROADCAST ---');
      console.log('To:', to);
      console.log('Subject:', msg.subject);
      console.log('Body:', text || 'HTML Content');
      console.log('----------------------------------------');
    }
  } catch (error) {
    console.error('Institutional Dispatch Failure:', error.message);
    if (error.response) console.error(error.response.body);
  }
};

const sendPasswordReset = async (email, token) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${token}`;
  await sendEmail({
    to: email,
    subject: 'Institutional Recovery Handshake',
    text: `Initialized password recovery. Use this link to restore your clinical manifold: ${resetUrl}`,
    html: `
      <p>An institutional recovery handshake has been initiated for your account.</p>
      <p>Use the industrial-grade junction below to character-perfectly restore your access:</p>
      <div style="margin: 40px 0; text-align: center;">
        <a href="${resetUrl}" style="background-color: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px; font-weight: bold; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">Restore Access Manifold →</a>
      </div>
      <p style="font-size: 11px; font-style: italic;">This token is short-lived. If you did not initialize this recovery, please contact the Governance Board immediately.</p>
    `
  });
};

const sendMisconductFlag = async (adminEmails, report) => {
  await sendEmail({
    to: adminEmails,
    subject: 'URGENT: Misconduct Allegation Broadcast',
    text: `A misconduct report has been logged. Reason: ${report.reason}. Description: ${report.description}`,
    html: `
      <p style="color: #ef4444; font-weight: bold;">[SEC-ALERT] High-Urgency Misconduct Allegation Detected.</p>
      <p>The Governance Board has character-perfectly logged a new allegation:</p>
      <ul style="list-style: none; padding: 0;">
        <li><strong>Reason:</strong> ${report.reason}</li>
        <li><strong>Description:</strong> ${report.description}</li>
        <li><strong>Timestamp:</strong> ${new Date().toLocaleString()}</li>
      </ul>
      <p>Immediate statutory review is character-perfectly recommended.</p>
    `
  });
};

module.exports = {
  sendEmail,
  sendPasswordReset,
  sendMisconductFlag
};
