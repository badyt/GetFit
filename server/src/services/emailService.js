const nodemailer = require("nodemailer");
const crypto = require("crypto");

const VERIFICATION_EMAIL_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD, // App Password from Gmail
    },
  });
};

/**
 * Generate a verification token
 */
function generateVerificationToken() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Send verification email
 */
async function sendVerificationEmail(email, name, verificationToken, verificationLink) {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"GetFit App" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verify Your Email - GetFit",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #111827;">Welcome to GetFit, ${name}!</h1>
          <p style="color: #6b7280; font-size: 16px;">
            Thank you for registering. Please verify your email address to get started.
          </p>
          <p style="color: #6b7280; font-size: 16px;">
            Copy this verification code and enter it in the GetFit app:
          </p>
          <div style="margin: 20px 0; background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center;">
            <code style="font-size: 18px; font-weight: 600; color: #111827; letter-spacing: 1px; word-break: break-all;">
              ${verificationToken}
            </code>
          </div>
          <p style="color: #9ca3af; font-size: 14px; margin-top: 30px;">
            This verification code expires in 24 hours.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #9ca3af; font-size: 12px;">
            If you didn't create this account, please ignore this email.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return {
      success: true,
      message: "Verification email sent successfully",
    };
  } catch (error) {
    console.error("Email sending error:", error);
    throw new Error("Failed to send verification email");
  }
}

/**
 * Send welcome email (after email verification)
 */
async function sendWelcomeEmail(email, name) {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"GetFit App" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Welcome to GetFit!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #111827;">Welcome to GetFit, ${name}!</h1>
          <p style="color: #6b7280; font-size: 16px;">
            Your email has been verified and your account is ready to use.
          </p>
          <div style="margin: 30px 0; background: #f0fdf4; padding: 20px; border-radius: 8px;">
            <h2 style="color: #10b981; margin-top: 0;">What's Next?</h2>
            <ul style="color: #6b7280; line-height: 1.8;">
              <li>Complete your profile</li>
              <li>If you're a trainee, ask your trainer for an invite code</li>
              <li>If you're a trainer, start inviting your trainees</li>
            </ul>
          </div>
          <p style="color: #9ca3af; font-size: 14px; margin-top: 30px;">
            For support, please contact us at ${process.env.EMAIL_USER}
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return {
      success: true,
      message: "Welcome email sent successfully",
    };
  } catch (error) {
    console.error("Email sending error:", error);
    throw new Error("Failed to send welcome email");
  }
}

/**
 * Send trainer invite notification
 */
async function sendTrainerInviteEmail(email, trainerName, inviteCode, message) {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"GetFit App" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `${trainerName} invited you to join GetFit`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #111827;">You've Been Invited!</h1>
          <p style="color: #6b7280; font-size: 16px;">
            <strong>${trainerName}</strong> has invited you to be their trainee on GetFit.
          </p>
          ${message ? `
          <div style="margin: 20px 0; background: #f0fdf4; padding: 16px; border-radius: 8px; border-left: 4px solid #10b981;">
            <p style="color: #065f46; font-size: 15px; margin: 0; font-style: italic;">
              "${message}"
            </p>
          </div>
          ` : ''}
          <p style="color: #6b7280; font-size: 16px;">
            Use this invite code to join:
          </p>
          <div style="margin: 20px 0; background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center;">
            <code style="font-size: 24px; font-weight: 600; color: #111827; letter-spacing: 2px;">
              ${inviteCode}
            </code>
          </div>
          <p style="color: #9ca3af; font-size: 14px;">
            Copy this code and enter it in your GetFit app under your profile.
          </p>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">
            If you don't know who this is, please ignore this email.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return {
      success: true,
      message: "Invite email sent successfully",
    };
  } catch (error) {
    console.error("Email sending error:", error);
    throw new Error("Failed to send invite email");
  }
}

module.exports = {
  generateVerificationToken,
  sendVerificationEmail,
  sendWelcomeEmail,
  sendTrainerInviteEmail,
  VERIFICATION_EMAIL_EXPIRY,
};
