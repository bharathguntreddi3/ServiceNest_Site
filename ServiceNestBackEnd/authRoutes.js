/* eslint-disable no-unused-vars */
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { OAuth2Client } = require("google-auth-library");
const db = require("./db");
const authenticateToken = require("./authMiddleware");
const asyncHandler = require("./asyncHandler");
const { strictRateLimiter } = require("./rateLimiter");

const authrouter = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ─── Nodemailer Transporter ───────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// In-memory OTP stores (same as original)
const registrationOtpStore = {};
const profileUpdateOtpStore = {};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Find a user by email. Returns { key, data } or null. */
async function findUserByEmail(email) {
  const snap = await db
    .ref("users")
    .orderByChild("email")
    .equalTo(email.trim().toLowerCase())
    .once("value");
  if (!snap.exists()) return null;
  const entries = Object.entries(snap.val());
  const [key, data] = entries[0];
  return { key, data: { ...data, id: key } };
}

/** Find a user by phone. Returns { key, data } or null. */
async function findUserByPhone(phone) {
  const snap = await db
    .ref("users")
    .orderByChild("phone")
    .equalTo(phone.trim())
    .once("value");
  if (!snap.exists()) return null;
  const entries = Object.entries(snap.val());
  const [key, data] = entries[0];
  return { key, data: { ...data, id: key } };
}

/** Get settings value from Firebase. */
async function getSetting(key) {
  const snap = await db.ref(`settings/${key}`).once("value");
  return snap.exists() ? snap.val() : null;
}

/** Build & sign a JWT for a user. */
async function signToken(user) {
  const sessionTimeoutRaw = await getSetting("sessionTimeout");
  const sessionTimeout = sessionTimeoutRaw ? `${sessionTimeoutRaw}m` : "60m";
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role ? String(user.role).toLowerCase() : "user",
    },
    process.env.JWT_SECRET || "default_secret_key",
    { expiresIn: sessionTimeout }
  );
}

// ─── Register: Send OTP ───────────────────────────────────────────────────────
authrouter.post(
  "/register/send-otp",
  strictRateLimiter,
  asyncHandler(async (req, res) => {
    const { email, phone } = req.body;
    if (!email || !phone)
      return res.status(400).json({ error: "Email and phone are required" });

    const enableRegistration = await getSetting("enableRegistration");
    if (enableRegistration === false || enableRegistration === "false") {
      return res
        .status(403)
        .json({ error: "New user registrations are currently disabled." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    if (await findUserByEmail(cleanEmail))
      return res.status(409).json({ error: "Email already exists" });
    if (await findUserByPhone(cleanPhone))
      return res.status(409).json({ error: "Phone number already exists" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    registrationOtpStore[cleanEmail] = {
      otp,
      expires: Date.now() + 5 * 60 * 1000,
    };

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: cleanEmail,
      subject: "ServiceNest - Registration OTP",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e0e0e0;border-radius:8px;">
          <h2 style="color:#333;text-align:center;">Welcome to ServiceNest!</h2>
          <p style="font-size:16px;color:#555;">Please use the following OTP to complete your registration:</p>
          <div style="text-align:center;margin:30px 0;">
            <span style="font-size:28px;font-weight:bold;background:#f8f9fa;padding:12px 24px;border-radius:6px;color:#2c3e50;letter-spacing:4px;border:1px solid #ddd;">${otp}</span>
          </div>
          <p style="font-size:14px;color:#7f8c8d;">This OTP is valid for 5 minutes.</p>
        </div>`,
    });

    res.json({ message: "An OTP has been sent to your email successfully" });
  })
);

// ─── Register: Verify OTP & Create User ──────────────────────────────────────
authrouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { name, email, phone, password, otp } = req.body;
    if (!name || !email || !phone || !password || !otp)
      return res.status(400).json({ error: "All fields are required" });

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    const storedOtpData = registrationOtpStore[cleanEmail];
    if (!storedOtpData)
      return res.status(400).json({ error: "OTP not requested or expired" });
    if (Date.now() > storedOtpData.expires) {
      delete registrationOtpStore[cleanEmail];
      return res.status(400).json({ error: "OTP has expired" });
    }
    if (storedOtpData.otp !== otp.trim())
      return res.status(400).json({ error: "Invalid OTP" });

    if (await findUserByEmail(cleanEmail))
      return res.status(409).json({ error: "Email already exists" });
    if (await findUserByPhone(cleanPhone))
      return res.status(409).json({ error: "Phone number already exists" });

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUserRef = db.ref("users").push();
    const userId = newUserRef.key;

    await newUserRef.set({
      id: userId,
      name: name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      password: hashedPassword,
      role: "user",
      is_blocked: false,
      address: null,
      created_at: new Date().toISOString(),
      last_login: null,
    });

    delete registrationOtpStore[cleanEmail];
    res.status(201).json({ message: "User registered successfully" });
  })
);

// ─── Login ────────────────────────────────────────────────────────────────────
authrouter.post(
  "/login",
  strictRateLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required" });

    const found = await findUserByEmail(email);
    if (!found)
      return res.status(401).json({ error: "Invalid email or password" });

    const user = found.data;
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ error: "Invalid email or password" });

    const isBlocked =
      user.is_blocked === true ||
      user.is_blocked === 1 ||
      user.is_blocked === "true" ||
      user.is_blocked === "1";
    if (isBlocked) {
      return res.status(403).json({
        error:
          "Your account has been blocked by the admin. Please contact support.",
      });
    }

    await db
      .ref(`users/${user.id}`)
      .update({ last_login: new Date().toISOString() });

    const token = await signToken(user);
    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role ? String(user.role).toLowerCase() : "user",
        is_blocked: user.is_blocked,
      },
      token,
    });
  })
);

// ─── Google Sign-In ───────────────────────────────────────────────────────────
authrouter.post(
  "/auth/google",
  asyncHandler(async (req, res) => {
    const { token } = req.body;
    if (!token)
      return res.status(400).json({ error: "Google token is required." });

    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      return res.status(401).json({ error: "Invalid Google token." });
    }

    const { name, email } = payload;
    const cleanEmail = email.trim().toLowerCase();

    let found = await findUserByEmail(cleanEmail);
    let user;

    if (!found) {
      const randomPassword =
        Math.random().toString(36).slice(-8) +
        Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(randomPassword, 12);
      const newUserRef = db.ref("users").push();
      const userId = newUserRef.key;
      await newUserRef.set({
        id: userId,
        name,
        email: cleanEmail,
        phone: null,
        password: hashedPassword,
        role: "user",
        is_blocked: false,
        address: null,
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
      });
      const snap = await newUserRef.once("value");
      user = { ...snap.val(), id: userId };
    } else {
      user = found.data;
    }

    const isBlocked =
      user.is_blocked === true ||
      user.is_blocked === 1 ||
      user.is_blocked === "true" ||
      user.is_blocked === "1";
    if (isBlocked) {
      return res.status(403).json({
        error:
          "Your account has been blocked by the admin. Please contact support.",
      });
    }

    await db
      .ref(`users/${user.id}`)
      .update({ last_login: new Date().toISOString() });

    const appToken = await signToken(user);
    res.json({
      message: "Google sign-in successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role ? String(user.role).toLowerCase() : "user",
        is_blocked: user.is_blocked,
      },
      token: appToken,
    });
  })
);

// ─── Send OTP for Profile Update ─────────────────────────────────────────────
authrouter.post(
  "/user/:userId/send-update-otp",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    if (req.user.id.toString() !== userId.toString())
      return res.status(403).json({ error: "Unauthorized" });

    const userSnap = await db.ref(`users/${userId}`).once("value");
    if (!userSnap.exists())
      return res.status(404).json({ error: "User not found" });

    const userEmail = userSnap.val().email;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    profileUpdateOtpStore[userId] = {
      otp,
      expires: Date.now() + 5 * 60 * 1000,
    };

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: "ServiceNest - Profile Update OTP",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e0e0e0;border-radius:8px;">
          <h2 style="color:#333;text-align:center;">Profile Update Request</h2>
          <p style="font-size:16px;color:#555;">Please use the following OTP to verify your identity:</p>
          <div style="text-align:center;margin:30px 0;">
            <span style="font-size:28px;font-weight:bold;background:#f8f9fa;padding:12px 24px;border-radius:6px;color:#2c3e50;letter-spacing:4px;border:1px solid #ddd;">${otp}</span>
          </div>
          <p style="font-size:14px;color:#7f8c8d;">This OTP is valid for 5 minutes.</p>
        </div>`,
    });

    res.json({
      message: "An OTP has been sent to your registered email successfully",
    });
  })
);

// ─── Update User ──────────────────────────────────────────────────────────────
authrouter.put(
  "/user/:userId",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { name, email, phone, address, otp } = req.body;

    if (req.user.id.toString() !== userId.toString())
      return res
        .status(403)
        .json({ error: "Unauthorized to update this account" });

    if (!name || !email || !phone)
      return res
        .status(400)
        .json({ error: "Name, email, and phone are required" });

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    const requireOtp = await getSetting("requireOtpForUpdates");

    const userSnap = await db.ref(`users/${userId}`).once("value");
    if (!userSnap.exists())
      return res.status(404).json({ error: "User not found" });

    const currentUser = userSnap.val();

    if (
      requireOtp !== false &&
      requireOtp !== "false" &&
      (currentUser.email !== cleanEmail || currentUser.phone !== cleanPhone)
    ) {
      if (!otp)
        return res
          .status(400)
          .json({ error: "OTP is required for changing email or phone" });

      const storedOtpData = profileUpdateOtpStore[userId];
      if (!storedOtpData)
        return res.status(400).json({ error: "OTP not requested or expired" });
      if (Date.now() > storedOtpData.expires) {
        delete profileUpdateOtpStore[userId];
        return res.status(400).json({ error: "OTP has expired" });
      }
      if (storedOtpData.otp !== otp.trim())
        return res.status(400).json({ error: "Invalid OTP" });

      delete profileUpdateOtpStore[userId];
    }

    // Check email uniqueness if changed
    if (cleanEmail !== currentUser.email) {
      const existing = await findUserByEmail(cleanEmail);
      if (existing && existing.key !== userId)
        return res.status(409).json({ error: "Email already exists" });
    }
    // Check phone uniqueness if changed
    if (cleanPhone !== currentUser.phone) {
      const existing = await findUserByPhone(cleanPhone);
      if (existing && existing.key !== userId)
        return res.status(409).json({ error: "Phone number already exists" });
    }

    await db.ref(`users/${userId}`).update({
      name: name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      address: address || null,
    });

    const updatedSnap = await db.ref(`users/${userId}`).once("value");
    const updatedUser = { ...updatedSnap.val(), id: userId };

    const token = await signToken(updatedUser);
    res.json({
      message: "Profile updated successfully",
      user: {
        id: userId,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        address: updatedUser.address,
        role: updatedUser.role || "user",
      },
      token,
    });
  })
);

// ─── Delete User ──────────────────────────────────────────────────────────────
authrouter.delete(
  "/user/:userId",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    if (req.user.id.toString() !== userId.toString())
      return res
        .status(403)
        .json({ error: "Unauthorized to delete this account" });

    // Remove cart items, reviews, and then the user
    const cartSnap = await db
      .ref("cart_items")
      .orderByChild("user_id")
      .equalTo(userId)
      .once("value");
    const cartUpdates = {};
    cartSnap.forEach((child) => {
      cartUpdates[`cart_items/${child.key}`] = null;
    });

    const reviewSnap = await db
      .ref("reviews")
      .orderByChild("user_id")
      .equalTo(userId)
      .once("value");
    reviewSnap.forEach((child) => {
      cartUpdates[`reviews/${child.key}`] = null;
    });

    cartUpdates[`users/${userId}`] = null;
    await db.ref().update(cartUpdates);

    res.json({ message: "Account deleted successfully" });
  })
);

module.exports = authrouter;
