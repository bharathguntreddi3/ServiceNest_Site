const express = require("express");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const path = require("path");
const asyncHandler = require("./asyncHandler");

// In-memory OTP store
const otpStore = {};

function forgotPasswordRoutes(db) {
  const router = express.Router();

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // ─── Helper: find user by email ─────────────────────────────────────────────
  async function findUserByEmail(email) {
    const snap = await db
      .ref("users")
      .orderByChild("email")
      .equalTo(email.trim().toLowerCase())
      .once("value");
    if (!snap.exists()) return null;
    const [key, data] = Object.entries(snap.val())[0];
    return { key, data: { ...data, id: key } };
  }

  // ─── POST /send-otp ─────────────────────────────────────────────────────────
  router.post(
    "/send-otp",
    asyncHandler(async (req, res) => {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: "Email is required" });

      const cleanEmail = email.trim().toLowerCase();
      const found = await findUserByEmail(cleanEmail);
      if (!found) return res.status(404).json({ error: "User doesn't exist" });

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      otpStore[cleanEmail] = { otp, expires: Date.now() + 5 * 60 * 1000 };

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: cleanEmail,
        subject: "ServiceNest - Password Reset OTP",
        html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e0e0e0;border-radius:8px;box-shadow:0 4px 8px rgba(0,0,0,0.05);">
          <h2 style="color:#333;text-align:center;">ServiceNest Password Reset</h2>
          <p style="font-size:16px;color:#555;line-height:1.5;">Hello,</p>
          <p style="font-size:16px;color:#555;line-height:1.5;">We received a request to reset your password. Please use the OTP below:</p>
          <div style="text-align:center;margin:30px 0;">
            <span style="font-size:28px;font-weight:bold;background:#f8f9fa;padding:12px 24px;border-radius:6px;color:#2c3e50;letter-spacing:4px;display:inline-block;border:1px solid #ddd;">${otp}</span>
          </div>
          <p style="font-size:14px;color:#7f8c8d;line-height:1.5;">This OTP is valid for <strong>5 minutes</strong>. If you did not request a password reset, you can safely ignore this email.</p>
          <hr style="border:0;border-top:1px solid #eee;margin:30px 0;" />
          <div style="text-align:center;">
            <img src="cid:servicenestlogo" alt="ServiceNest Logo" style="width:200px;height:auto;" />
            <p style="font-size:12px;color:#aaa;margin-top:15px;">&copy; ${new Date().getFullYear()} ServiceNest. All rights reserved.</p>
          </div>
        </div>`,
        attachments: [
          {
            filename: "logo.png",
            path: path.join(__dirname, "../src/assets/logo.png"),
            cid: "servicenestlogo",
          },
        ],
      });

      res.json({ message: "An OTP has been sent to your email successfully" });
    })
  );

  // ─── POST /reset-password ───────────────────────────────────────────────────
  router.post(
    "/reset-password",
    asyncHandler(async (req, res) => {
      const { email, otp, newPassword } = req.body;
      if (!email || !otp || !newPassword)
        return res.status(400).json({ error: "All fields are required" });

      const cleanEmail = email.trim().toLowerCase();
      const storedOtpData = otpStore[cleanEmail];

      if (!storedOtpData)
        return res.status(400).json({ error: "OTP not requested or expired" });
      if (Date.now() > storedOtpData.expires) {
        delete otpStore[cleanEmail];
        return res.status(400).json({ error: "OTP has expired" });
      }
      if (storedOtpData.otp !== otp.trim())
        return res.status(400).json({ error: "Invalid OTP" });

      const found = await findUserByEmail(cleanEmail);
      if (!found)
        return res.status(404).json({ error: "User not found" });

      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await db.ref(`users/${found.key}`).update({ password: hashedPassword });

      delete otpStore[cleanEmail];
      res.json({ message: "Password has been reset successfully. Redirecting..." });
    })
  );

  return router;
}

module.exports = forgotPasswordRoutes;
