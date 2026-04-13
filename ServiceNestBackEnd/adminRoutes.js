/* eslint-disable no-unused-vars */
const express = require("express");
const db = require("./db");
const authenticateToken = require("./authMiddleware");
const asyncHandler = require("./asyncHandler");

const adminRouter = express.Router();

// ─── Helper: ensure admin ─────────────────────────────────────────────────────
async function ensureAdmin(req, res) {
  if (req.user.role === "admin") return true;
  // Double-check in DB
  const snap = await db.ref(`users/${req.user.id}`).once("value");
  if (snap.exists() && snap.val().role === "admin") return true;
  res.status(403).json({ error: "Access denied. Admins only." });
  return false;
}

// ─── PUT /settings ────────────────────────────────────────────────────────────
adminRouter.put(
  "/settings",
  authenticateToken,
  asyncHandler(async (req, res) => {
    if (!(await ensureAdmin(req, res))) return;

    const settings = req.body;
    const updates = {};
    for (const key in settings) {
      if (Object.hasOwnProperty.call(settings, key)) {
        updates[`settings/${key}`] = String(settings[key]);
      }
    }
    await db.ref().update(updates);
    res.json({ message: "Settings updated successfully" });
  })
);

// ─── GET /users ───────────────────────────────────────────────────────────────
adminRouter.get(
  "/users",
  authenticateToken,
  asyncHandler(async (req, res) => {
    if (!(await ensureAdmin(req, res))) return;

    const usersSnap = await db.ref("users").once("value");
    if (!usersSnap.exists()) return res.json([]);

    const bookingsSnap = await db.ref("bookings").once("value");
    const bookingsByUser = {};
    bookingsSnap.forEach((child) => {
      const b = child.val();
      if (!bookingsByUser[b.user_id]) {
        bookingsByUser[b.user_id] = {
          total_bookings: 0,
          total_spent: 0,
          last_booking_date: null,
        };
      }
      bookingsByUser[b.user_id].total_bookings += 1;
      bookingsByUser[b.user_id].total_spent += (b.price || 0) * (b.quantity || 1);
      const bd = b.booking_date;
      if (
        !bookingsByUser[b.user_id].last_booking_date ||
        bd > bookingsByUser[b.user_id].last_booking_date
      ) {
        bookingsByUser[b.user_id].last_booking_date = bd;
      }
    });

    const users = [];
    usersSnap.forEach((child) => {
      const u = child.val();
      const stats = bookingsByUser[child.key] || {
        total_bookings: 0,
        total_spent: 0,
        last_booking_date: null,
      };
      users.push({
        id: child.key,
        name: u.name,
        email: u.email,
        role: u.role,
        is_blocked: u.is_blocked,
        created_at: u.created_at,
        last_login: u.last_login,
        ...stats,
      });
    });

    // Sort by created_at descending
    users.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    res.json(users);
  })
);

// ─── PUT /users/:userId/block ─────────────────────────────────────────────────
adminRouter.put(
  "/users/:userId/block",
  authenticateToken,
  asyncHandler(async (req, res) => {
    if (!(await ensureAdmin(req, res))) return;
    const { is_blocked } = req.body;
    await db.ref(`users/${req.params.userId}`).update({ is_blocked: !!is_blocked });
    res.json({ message: "User block status updated" });
  })
);

// ─── PUT /users/:userId/role ──────────────────────────────────────────────────
adminRouter.put(
  "/users/:userId/role",
  authenticateToken,
  asyncHandler(async (req, res) => {
    if (!(await ensureAdmin(req, res))) return;
    const { role } = req.body;
    if (!role) return res.status(400).json({ error: "Role is required" });
    await db.ref(`users/${req.params.userId}`).update({ role });
    res.json({ message: "User role updated" });
  })
);

// ─── GET /stats ───────────────────────────────────────────────────────────────
adminRouter.get(
  "/stats",
  authenticateToken,
  asyncHandler(async (req, res) => {
    if (!(await ensureAdmin(req, res))) return;

    const [bookingsSnap, usersSnap] = await Promise.all([
      db.ref("bookings").once("value"),
      db.ref("users").once("value"),
    ]);

    let totalBookings = 0;
    let weeklyRevenue = 0;
    let totalRevenue = 0;
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    bookingsSnap.forEach((child) => {
      const b = child.val();
      totalBookings++;
      const amount = (b.price || 0) * (b.quantity || 1);
      totalRevenue += amount;
      if (b.booking_date && b.booking_date >= oneWeekAgo) {
        weeklyRevenue += amount;
      }
    });

    const averageOrderValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

    let activeUsers = 0;
    let totalProviders = 0;
    usersSnap.forEach((child) => {
      const u = child.val();
      if (!u.is_blocked || u.is_blocked === false || u.is_blocked === 0) {
        activeUsers++;
      }
      if (
        u.role === "provider" &&
        (!u.is_blocked || u.is_blocked === false || u.is_blocked === 0)
      ) {
        totalProviders++;
      }
    });

    res.json({ totalBookings, weeklyRevenue, activeUsers, averageOrderValue, totalProviders });
  })
);

// ─── GET /bookings (admin: all bookings) ──────────────────────────────────────
adminRouter.get(
  "/bookings",
  authenticateToken,
  asyncHandler(async (req, res) => {
    if (!(await ensureAdmin(req, res))) return;

    const snap = await db.ref("bookings").orderByChild("booking_date").once("value");
    const bookings = [];
    snap.forEach((child) => {
      bookings.unshift({ id: child.key, ...child.val() });
    });
    res.json(bookings);
  })
);

// ─── GET /coupons ─────────────────────────────────────────────────────────────
adminRouter.get(
  "/coupons",
  authenticateToken,
  asyncHandler(async (req, res) => {
    if (!(await ensureAdmin(req, res))) return;

    const snap = await db.ref("coupons").orderByChild("created_at").once("value");
    const coupons = [];
    snap.forEach((child) => {
      coupons.unshift({ id: child.key, ...child.val() });
    });
    res.json(coupons);
  })
);

// ─── POST /coupons ────────────────────────────────────────────────────────────
adminRouter.post(
  "/coupons",
  authenticateToken,
  asyncHandler(async (req, res) => {
    if (!(await ensureAdmin(req, res))) return;

    const { code, description, discount_percent } = req.body;
    if (!code || discount_percent === undefined)
      return res.status(400).json({ error: "Code and discount percent are required." });

    const upperCode = code.toUpperCase();
    // Check uniqueness
    const existSnap = await db
      .ref("coupons")
      .orderByChild("code")
      .equalTo(upperCode)
      .once("value");
    if (existSnap.exists())
      return res.status(409).json({ error: "Coupon code already exists." });

    const newRef = db.ref("coupons").push();
    await newRef.set({
      code: upperCode,
      description: description || "",
      discount_percent,
      is_active: true,
      created_at: new Date().toISOString(),
    });

    const snap = await newRef.once("value");
    res.status(201).json({ id: newRef.key, ...snap.val() });
  })
);

// ─── PUT /coupons/:id ─────────────────────────────────────────────────────────
adminRouter.put(
  "/coupons/:id",
  authenticateToken,
  asyncHandler(async (req, res) => {
    if (!(await ensureAdmin(req, res))) return;

    const { code, description, discount_percent, is_active } = req.body;
    if (!code || discount_percent === undefined)
      return res.status(400).json({ error: "Code and discount percent are required." });

    const upperCode = code.toUpperCase();
    // Check code uniqueness (excluding self)
    const existSnap = await db
      .ref("coupons")
      .orderByChild("code")
      .equalTo(upperCode)
      .once("value");
    if (existSnap.exists()) {
      const entries = Object.keys(existSnap.val());
      if (entries.length > 0 && entries[0] !== req.params.id)
        return res.status(409).json({ error: "Coupon code already exists." });
    }

    await db.ref(`coupons/${req.params.id}`).update({
      code: upperCode,
      description: description || "",
      discount_percent,
      is_active: !!is_active,
    });

    const snap = await db.ref(`coupons/${req.params.id}`).once("value");
    res.json({ id: req.params.id, ...snap.val() });
  })
);

// ─── DELETE /coupons/:id ──────────────────────────────────────────────────────
adminRouter.delete(
  "/coupons/:id",
  authenticateToken,
  asyncHandler(async (req, res) => {
    if (!(await ensureAdmin(req, res))) return;
    await db.ref(`coupons/${req.params.id}`).remove();
    res.json({ message: "Coupon deleted successfully." });
  })
);

// ─── GET /popular-services ────────────────────────────────────────────────────
adminRouter.get(
  "/popular-services",
  authenticateToken,
  asyncHandler(async (req, res) => {
    if (!(await ensureAdmin(req, res))) return;

    const snap = await db.ref("popular_services").once("value");
    const items = [];
    snap.forEach((child) => {
      items.push({ id: child.key, ...child.val() });
    });
    res.json(items);
  })
);

// ─── POST /popular-services ───────────────────────────────────────────────────
adminRouter.post(
  "/popular-services",
  authenticateToken,
  asyncHandler(async (req, res) => {
    if (!(await ensureAdmin(req, res))) return;

    const { name, price, image_url } = req.body;
    if (!name || !price || !image_url)
      return res.status(400).json({ error: "All fields are required" });

    const newRef = db.ref("popular_services").push();
    await newRef.set({ name, price, image_url });
    res
      .status(201)
      .json({ message: "Popular service added successfully.", id: newRef.key });
  })
);

// ─── PUT /popular-services/:id ────────────────────────────────────────────────
adminRouter.put(
  "/popular-services/:id",
  authenticateToken,
  asyncHandler(async (req, res) => {
    if (!(await ensureAdmin(req, res))) return;

    const { name, price, image_url } = req.body;
    const snap = await db.ref(`popular_services/${req.params.id}`).once("value");
    if (!snap.exists())
      return res.status(404).json({ error: "Popular service not found." });

    await db.ref(`popular_services/${req.params.id}`).update({ name, price, image_url });
    const updated = await db.ref(`popular_services/${req.params.id}`).once("value");
    res.json({ id: req.params.id, ...updated.val() });
  })
);

// ─── DELETE /popular-services/:id ────────────────────────────────────────────
adminRouter.delete(
  "/popular-services/:id",
  authenticateToken,
  asyncHandler(async (req, res) => {
    if (!(await ensureAdmin(req, res))) return;

    const snap = await db.ref(`popular_services/${req.params.id}`).once("value");
    if (!snap.exists())
      return res.status(404).json({ error: "Popular service not found." });

    await db.ref(`popular_services/${req.params.id}`).remove();
    res.json({ message: "Popular service deleted successfully." });
  })
);

// ─── GET /services ────────────────────────────────────────────────────────────
adminRouter.get(
  "/services",
  authenticateToken,
  asyncHandler(async (req, res) => {
    if (!(await ensureAdmin(req, res))) return;

    const [servicesSnap, categoriesSnap] = await Promise.all([
      db.ref("services").once("value"),
      db.ref("categories").once("value"),
    ]);

    const categoriesMap = {};
    categoriesSnap.forEach((child) => {
      categoriesMap[child.key] = child.val().name;
    });

    const services = [];
    servicesSnap.forEach((child) => {
      const s = child.val();
      services.unshift({
        id: child.key,
        ...s,
        category: categoriesMap[s.category_id] || null,
        is_active: s.is_active !== false, // default true
      });
    });

    res.json(services);
  })
);

// ─── POST /services ───────────────────────────────────────────────────────────
adminRouter.post(
  "/services",
  authenticateToken,
  asyncHandler(async (req, res) => {
    if (!(await ensureAdmin(req, res))) return;

    const { category_id, name, price, visit_price } = req.body;
    if (!category_id || !name || !price || !visit_price)
      return res.status(400).json({ error: "All fields are required" });

    const newRef = db.ref("services").push();
    await newRef.set({
      category_id,
      name,
      price,
      visit_price,
      is_active: true,
    });
    res.status(201).json({ message: "Service added and linked to category successfully!" });
  })
);

// ─── PUT /services/:id ────────────────────────────────────────────────────────
adminRouter.put(
  "/services/:id",
  authenticateToken,
  asyncHandler(async (req, res) => {
    if (!(await ensureAdmin(req, res))) return;

    const { name, price, visit_price, is_active } = req.body;
    const snap = await db.ref(`services/${req.params.id}`).once("value");
    if (!snap.exists())
      return res.status(404).json({ error: "Service not found." });

    await db.ref(`services/${req.params.id}`).update({
      name,
      price,
      visit_price,
      is_active: is_active !== undefined ? !!is_active : true,
    });
    res.json({ message: "Service updated successfully." });
  })
);

// ─── DELETE /services/:id ─────────────────────────────────────────────────────
adminRouter.delete(
  "/services/:id",
  authenticateToken,
  asyncHandler(async (req, res) => {
    if (!(await ensureAdmin(req, res))) return;

    const snap = await db.ref(`services/${req.params.id}`).once("value");
    if (!snap.exists())
      return res.status(404).json({ error: "Service not found." });

    await db.ref(`services/${req.params.id}`).remove();
    res.json({ message: "Service deleted successfully." });
  })
);

module.exports = adminRouter;
