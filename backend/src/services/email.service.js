const nodemailer = require('nodemailer');
const { env } = require('../config/env');
const logger = require('../config/logger');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: env.smtp.user ? { user: env.smtp.user, password: env.smtp.password } : undefined,
  });
  return transporter;
}

async function sendPasswordResetEmail(toEmail, resetLink) {
  const mailer = getTransporter();
  const html = `
    <p>Hello,</p>
    <p>A password reset was requested for your Publisher Operations Portal account.</p>
    <p><a href="${resetLink}">Click here to reset your password</a> (link expires in 30 minutes).</p>
    <p>If you did not request this, you can safely ignore this email.</p>
  `;

  try {
    await mailer.sendMail({
      from: `"${env.smtp.fromName}" <${env.smtp.fromEmail}>`,
      to: toEmail,
      subject: 'Reset your Publisher Operations Portal password',
      html,
    });
  } catch (err) {
    logger.error('Failed to send password reset email', { err: err.message, toEmail });
    throw err;
  }
}

module.exports = { sendPasswordResetEmail };
