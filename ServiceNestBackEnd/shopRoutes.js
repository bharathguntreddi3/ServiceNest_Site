const express = require("express");
const db = require("./db");
const authenticateToken = require("./authMiddleware");
const asyncHandler = require("./asyncHandler");

const router = express.Router();

// ─── Helper ───────────────────────────────────────────────────────────────────
async function getSetting(key) {
  const snap = await db.ref(`settings/${key}`).once("value");
  return snap.exists() ? snap.val() : null;
}

// ─── GET /cart/:userId ────────────────────────────────────────────────────────
router.get(
  "/cart/:userId",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const snap = await db
      .ref("cart_items")
      .orderByChild("user_id")
      .equalTo(userId)
      .once("value");
    const items = [];
    snap.forEach((child) => {
      items.push({ id: child.key, ...child.val() });
    });
    res.json(items);
  })
);

// ─── POST /cart/add ───────────────────────────────────────────────────────────
router.post(
  "/cart/add",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { userId, service } = req.body;
    if (!userId || !service || service.id === undefined)
      return res
        .status(400)
        .json({ error: "userId and service details are required" });

    // Check if item already exists in cart
    const existingSnap = await db
      .ref("cart_items")
      .orderByChild("user_id_service_id")
      .equalTo(`${userId}_${service.id}`)
      .once("value");

    if (existingSnap.exists()) {
      // Increment quantity
      const [key, val] = Object.entries(existingSnap.val())[0];
      await db.ref(`cart_items/${key}`).update({ quantity: (val.quantity || 1) + 1 });
    } else {
      await db.ref("cart_items").push({
        user_id: userId,
        service_id: service.id,
        service_name: service.name || "Unknown",
        price: service.price || 0,
        quantity: 1,
        user_id_service_id: `${userId}_${service.id}`, // composite index for uniqueness check
      });
    }

    const updatedSnap = await db
      .ref("cart_items")
      .orderByChild("user_id")
      .equalTo(userId)
      .once("value");
    const updatedCart = [];
    updatedSnap.forEach((child) => {
      updatedCart.push({ id: child.key, ...child.val() });
    });

    res.status(200).json({ message: "Service added to cart", cart: updatedCart });
  })
);

// ─── PUT /cart/decrement ──────────────────────────────────────────────────────
router.put(
  "/cart/decrement",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { userId, serviceId } = req.body;
    if (!userId || !serviceId)
      return res.status(400).json({ error: "userId and serviceId are required" });

    const snap = await db
      .ref("cart_items")
      .orderByChild("user_id_service_id")
      .equalTo(`${userId}_${serviceId}`)
      .once("value");

    if (!snap.exists())
      return res.status(404).json({ error: "Cart item not found" });

    const [key, val] = Object.entries(snap.val())[0];
    if ((val.quantity || 1) <= 1) {
      await db.ref(`cart_items/${key}`).remove();
    } else {
      await db.ref(`cart_items/${key}`).update({ quantity: val.quantity - 1 });
    }

    const updatedSnap = await db
      .ref("cart_items")
      .orderByChild("user_id")
      .equalTo(userId)
      .once("value");
    const updatedCart = [];
    updatedSnap.forEach((child) => {
      updatedCart.push({ id: child.key, ...child.val() });
    });

    res.status(200).json({ message: "Cart updated", cart: updatedCart });
  })
);

// ─── DELETE /cart/remove ──────────────────────────────────────────────────────
router.delete("/cart/remove/:userId/:serviceId", authenticateToken, asyncHandler(async (req, res) => {
  const { userId, serviceId } = req.params;
    if (!userId || !serviceId)
      return res.status(400).json({ error: "userId and serviceId are required" });

    const snap = await db
      .ref("cart_items")
      .orderByChild("user_id_service_id")
      .equalTo(`${userId}_${serviceId}`)
      .once("value");

    if (!snap.exists())
      return res.status(404).json({ error: "Cart item not found" });

    const key = Object.keys(snap.val())[0];
    await db.ref(`cart_items/${key}`).remove();

    const updatedSnap = await db
      .ref("cart_items")
      .orderByChild("user_id")
      .equalTo(userId)
      .once("value");
    const updatedCart = [];
    updatedSnap.forEach((child) => {
      updatedCart.push({ id: child.key, ...child.val() });
    });

    res.status(200).json({ message: "Item removed from cart", cart: updatedCart });
  })
);

// ─── DELETE /cart/clear/:userId ───────────────────────────────────────────────
router.delete(
  "/cart/clear/:userId",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const snap = await db
      .ref("cart_items")
      .orderByChild("user_id")
      .equalTo(userId)
      .once("value");

    const updates = {};
    snap.forEach((child) => {
      updates[`cart_items/${child.key}`] = null;
    });

    if (Object.keys(updates).length > 0) await db.ref().update(updates);
    res.status(200).json({ message: "Cart cleared" });
  })
);

// ─── GET /reviews ─────────────────────────────────────────────────────────────
router.get(
  "/reviews",
  asyncHandler(async (req, res) => {
    const snap = await db.ref("reviews").orderByChild("created_at").once("value");
    const reviews = [];
    snap.forEach((child) => {
      reviews.unshift({ id: child.key, ...child.val() }); // newest first
    });
    res.json(reviews);
  })
);

// ─── POST /reviews ────────────────────────────────────────────────────────────
router.post(
  "/reviews",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { userId, name, review, rating } = req.body;
    if (!userId || !name || !review)
      return res.status(400).json({ error: "userId, name, and review are required" });

    const newRef = db.ref("reviews").push();
    await newRef.set({
      user_id: userId,
      name,
      review,
      rating: rating || 5,
      created_at: new Date().toISOString(),
    });
    res.status(201).json({ message: "Review submitted successfully", id: newRef.key });
  })
);

// ─── POST /checkout ───────────────────────────────────────────────────────────
router.post(
  "/checkout",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const {
      userId,
      address,
      phone,
      scheduleDate,
      scheduleTime,
      paymentMethod,
    } = req.body;

    if (req.user.id.toString() !== userId.toString())
      return res.status(403).json({ error: "Unauthorized access" });

    if (!userId || !address || !phone || !scheduleDate || !scheduleTime || !paymentMethod)
      return res.status(400).json({ error: "All booking details are required" });

    // Fetch cart items
    const cartSnap = await db
      .ref("cart_items")
      .orderByChild("user_id")
      .equalTo(userId)
      .once("value");

    if (!cartSnap.exists())
      return res.status(400).json({ error: "Cart is empty" });

    const cartItems = [];
    cartSnap.forEach((child) => {
      cartItems.push({ key: child.key, ...child.val() });
    });

    if (cartItems.length === 0)
      return res.status(400).json({ error: "Cart is empty" });

    // Fetch user name
    const userSnap = await db.ref(`users/${userId}`).once("value");
    const userName = userSnap.exists() ? userSnap.val().name : "Unknown User";

    // Insert bookings & clear cart atomically
    const updates = {};
    for (const item of cartItems) {
      const bookingRef = db.ref("bookings").push();
      updates[`bookings/${bookingRef.key}`] = {
        user_id: userId,
        service_id: item.service_id,
        service_name: item.service_name,
        price: item.price,
        quantity: item.quantity || 1,
        user_name: userName,
        address,
        phone,
        schedule_date: scheduleDate,
        schedule_time: scheduleTime,
        payment_method: paymentMethod,
        booking_date: new Date().toISOString(),
        status: "Pending",
      };
      updates[`cart_items/${item.key}`] = null; // clear cart item
    }

    await db.ref().update(updates);
    res.status(200).json({ message: "Checkout successful, items moved to bookings" });
  })
);

// ─── GET /provider/bookings ───────────────────────────────────────────────────
router.get(
  "/provider/bookings",
  authenticateToken,
  asyncHandler(async (req, res) => {
    if (req.user.role !== "provider" && req.user.role !== "admin")
      return res.status(403).json({ error: "Access denied. Providers only." });

    const snap = await db
      .ref("bookings")
      .orderByChild("booking_date")
      .once("value");
    const bookings = [];
    snap.forEach((child) => {
      bookings.unshift({ id: child.key, ...child.val() }); // newest first
    });
    res.json(bookings);
  })
);

// ─── PUT /provider/bookings/:bookingId/status ─────────────────────────────────
router.put(
  "/provider/bookings/:bookingId/status",
  authenticateToken,
  asyncHandler(async (req, res) => {
    if (req.user.role !== "provider" && req.user.role !== "admin")
      return res.status(403).json({ error: "Access denied. Providers only." });

    const { status } = req.body;
    if (!status) return res.status(400).json({ error: "Status is required." });

    const bookingSnap = await db
      .ref(`bookings/${req.params.bookingId}`)
      .once("value");
    if (!bookingSnap.exists())
      return res.status(404).json({ error: "Booking not found." });

    await db.ref(`bookings/${req.params.bookingId}`).update({ status });
    const updatedSnap = await db
      .ref(`bookings/${req.params.bookingId}`)
      .once("value");
    res.json({ id: req.params.bookingId, ...updatedSnap.val() });
  })
);

// ─── PUT /provider/bookings/:bookingId/reschedule ─────────────────────────────
router.put(
  "/provider/bookings/:bookingId/reschedule",
  authenticateToken,
  asyncHandler(async (req, res) => {
    if (req.user.role !== "provider" && req.user.role !== "admin")
      return res.status(403).json({ error: "Access denied. Providers only." });

    const { newTime } = req.body;
    if (!newTime) return res.status(400).json({ error: "New time is required." });

    const bookingSnap = await db
      .ref(`bookings/${req.params.bookingId}`)
      .once("value");
    if (!bookingSnap.exists())
      return res.status(404).json({ error: "Booking not found." });

    await db
      .ref(`bookings/${req.params.bookingId}`)
      .update({ schedule_time: newTime });
    res.json({ message: "Booking time updated successfully" });
  })
);

// ─── GET /bookings/:userId ────────────────────────────────────────────────────
router.get(
  "/bookings/:userId",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const snap = await db
      .ref("bookings")
      .orderByChild("user_id")
      .equalTo(req.params.userId)
      .once("value");

    const bookings = [];
    snap.forEach((child) => {
      bookings.push({ id: child.key, ...child.val() });
    });
    res.json(bookings);
  })
);

// ─── DELETE /bookings/:userId/:bookingId ──────────────────────────────────────
router.delete(
  "/bookings/:userId/:bookingId",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { userId, bookingId } = req.params;
    if (req.user.id.toString() !== userId.toString())
      return res.status(403).json({ error: "Unauthorized access" });

    const bookingSnap = await db.ref(`bookings/${bookingId}`).once("value");
    if (!bookingSnap.exists())
      return res.status(404).json({ error: "Booking not found." });

    const booking = bookingSnap.val();
    if (booking.user_id !== userId)
      return res.status(403).json({ error: "Unauthorized access" });

    if (booking.status === "Completed" || booking.status === "Cancelled")
      return res
        .status(400)
        .json({ error: "Cannot cancel a completed or already cancelled booking." });

    // 2-hour cancellation window check
    if (booking.schedule_date && booking.schedule_time) {
      const [timePart, modifier] = booking.schedule_time.split(" - ")[0].split(" ");
      let [hours, minutes] = timePart.split(":").map(Number);
      if (modifier === "PM" && hours < 12) hours += 12;
      if (modifier === "AM" && hours === 12) hours = 0;
      const scheduleDateTime = new Date(booking.schedule_date);
      scheduleDateTime.setHours(hours, minutes, 0, 0);
      if (new Date() >= new Date(scheduleDateTime.getTime() - 2 * 60 * 60 * 1000)) {
        return res.status(400).json({
          error: "Cancellations are only allowed up to 2 hours before the scheduled time.",
        });
      }
    }

    await db.ref(`bookings/${bookingId}`).remove();
    res.json({ message: "Booking cancelled successfully" });
  })
);

module.exports = router;
