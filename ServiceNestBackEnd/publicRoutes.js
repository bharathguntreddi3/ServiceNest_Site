const express = require("express");
const db = require("./db");
const authenticateToken = require("./authMiddleware");
const asyncHandler = require("./asyncHandler");

const router = express.Router();

// ─── GET /status ──────────────────────────────────────────────────────────────
router.get(
  "/status",
  asyncHandler(async (req, res) => {
    // Lightweight ping to Firebase
    const snap = await db.ref(".info/connected").once("value");
    res.json({ message: "Firebase Realtime Database connection is active", connected: snap.val() });
  })
);

// ─── GET /settings ────────────────────────────────────────────────────────────
router.get(
  "/settings",
  asyncHandler(async (req, res) => {
    const snap = await db.ref("settings").once("value");
    if (!snap.exists()) return res.json({});

    const raw = snap.val();
    const settings = {};
    for (const [key, value] of Object.entries(raw)) {
      let parsed = value;
      if (parsed === "true") parsed = true;
      else if (parsed === "false") parsed = false;
      else if (
        !isNaN(Number(parsed)) &&
        Number.isFinite(Number(parsed)) &&
        !/^\+\d{10,}$/.test(parsed)
      )
        parsed = Number(parsed);
      settings[key] = parsed;
    }
    res.json(settings);
  })
);

// ─── GET /coupons (public active coupons) ────────────────────────────────────
router.get(
  "/coupons",
  asyncHandler(async (req, res) => {
    const snap = await db
      .ref("coupons")
      .orderByChild("is_active")
      .equalTo(true)
      .once("value");

    const coupons = [];
    snap.forEach((child) => {
      const c = child.val();
      coupons.push({
        id: child.key,
        code: c.code,
        description: c.description,
        discount_percent: c.discount_percent,
      });
    });

    // Sort by created_at desc
    coupons.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    res.json(coupons);
  })
);

// ─── POST /coupons/validate ───────────────────────────────────────────────────
router.post(
  "/coupons/validate",
  asyncHandler(async (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "Coupon code is required." });

    const snap = await db
      .ref("coupons")
      .orderByChild("code")
      .equalTo(code.toUpperCase())
      .once("value");

    if (snap.exists()) {
      const [, val] = Object.entries(snap.val())[0];
      if (val.is_active) {
        return res.json({ success: true, discount_percent: val.discount_percent });
      }
    }
    res.status(404).json({ success: false, error: "Invalid or expired coupon code." });
  })
);

// ─── GET /categories ──────────────────────────────────────────────────────────
router.get(
  "/categories",
  asyncHandler(async (req, res) => {
    const snap = await db.ref("categories").once("value");
    const categories = [];
    snap.forEach((child) => {
      categories.push({ id: child.key, ...child.val() });
    });
    res.json(categories);
  })
);

// ─── GET /services ────────────────────────────────────────────────────────────
router.get(
  "/services",
  asyncHandler(async (req, res) => {
    const snap = await db
      .ref("services")
      .orderByChild("is_active")
      .equalTo(true)
      .once("value");

    const services = [];
    snap.forEach((child) => {
      services.push({ id: child.key, ...child.val() });
    });
    res.json(services);
  })
);

// ─── GET /popular-services ────────────────────────────────────────────────────
router.get(
  "/popular-services",
  asyncHandler(async (req, res) => {
    const snap = await db.ref("popular_services").once("value");
    const items = [];
    snap.forEach((child) => {
      items.push({ id: child.key, ...child.val() });
    });
    res.json(items);
  })
);

router.get(
  "/categories/:id/services",
  asyncHandler(async (req, res) => {
    const catSnap = await db.ref(`categories/${req.params.id}`).once("value");
    if (!catSnap.exists())
      return res.status(404).json({ error: "Category not found" });

    const cat = catSnap.val();

    const servSnap = await db
      .ref("services")
      .orderByChild("category_id")
      .equalTo(req.params.id)
      .once("value");

    const items = [];
    servSnap.forEach((child) => {
      const s = child.val();
      if (s.is_active !== false) {
        items.push({
          id: child.key,
          name: s.name,
          price: Number(s.price),
          visit: Number(s.visit_price),
        });
      }
    });

    res.json({ category: cat.name, image: cat.image, items });
  })
);

// ─── GET /reviews (public) ────────────────────────────────────────────────────
router.get(
  "/reviews",
  asyncHandler(async (req, res) => {
    const snap = await db.ref("reviews").orderByChild("created_at").once("value");
    const reviews = [];
    snap.forEach((child) => {
      reviews.unshift({ id: child.key, ...child.val() });
    });
    res.json(reviews);
  })
);

module.exports = router;
