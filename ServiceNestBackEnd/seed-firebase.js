/**
 * seed-firebase.js
 * Run once to populate your Firebase Realtime Database
 * with the initial data from your SQL schema.
 *
 * Usage:
 *   node seed-firebase.js
 *
 * Make sure your .env file has FIREBASE_* vars set.
 */

require("dotenv").config();
const admin = require("firebase-admin");

let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
  };
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const db = admin.database();

async function seed() {
  console.log("Seeding Firebase Realtime Database...");

  // ── Categories ──────────────────────────────────────────────────────────────
  await db.ref("categories").set({
    cat1:  { id: "cat1",  name: "Home Cleaning",        image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952" },
    cat2:  { id: "cat2",  name: "Pest Control",         image: "https://plus.unsplash.com/premium_photo-1682126097276-57e5d1d3f812?q=80&w=1170&auto=format&fit=crop" },
    cat3:  { id: "cat3",  name: "Salon & Spa",          image: "https://images.unsplash.com/photo-1611169035510-f9af52e6dbe2?q=80&w=1170&auto=format&fit=crop" },
    cat4:  { id: "cat4",  name: "Painting",             image: "https://media.istockphoto.com/id/1198703852/photo/painter-man-at-work.jpg?s=1024x1024&w=is&k=20" },
    cat5:  { id: "cat5",  name: "Electrician & Plumber",image: "https://plus.unsplash.com/premium_photo-1682126049179-3c4e06049b55?q=80&w=1170&auto=format&fit=crop" },
    cat6:  { id: "cat6",  name: "AC & Fridge Repair",   image: "https://media.istockphoto.com/id/2206342744/photo/technician-repairing-air-conditioner-at-home.jpg?s=1024x1024&w=is&k=20" },
    cat7:  { id: "cat7",  name: "Bike Service",         image: "https://media.istockphoto.com/id/833171812/photo/we-look-forward-to-serving-you.jpg?s=1024x1024&w=is&k=20" },
    cat8:  { id: "cat8",  name: "Appliance Repair",     image: "https://plus.unsplash.com/premium_photo-1661342474567-f84bb6959d9f?w=600&auto=format&fit=crop" },
    cat9:  { id: "cat9",  name: "Chef Service",         image: "https://plus.unsplash.com/premium_photo-1666299819315-929b3fae4450?w=600&auto=format&fit=crop" },
  });
  console.log("✓ Categories seeded");

  // ── Services ────────────────────────────────────────────────────────────────
  await db.ref("services").set({
    svc1:  { id: "svc1",  category_id: "cat1", name: "Basic Home Cleaning",    price: 999,  visit_price: 99,  is_active: true },
    svc2:  { id: "svc2",  category_id: "cat1", name: "Deep Cleaning",          price: 1999, visit_price: 149, is_active: true },
    svc12: { id: "svc12", category_id: "cat1", name: "Kitchen Cleaning Service",price: 899, visit_price: 99,  is_active: true },
    svc3:  { id: "svc3",  category_id: "cat2", name: "Cockroach Control",      price: 799,  visit_price: 99,  is_active: true },
    svc4:  { id: "svc4",  category_id: "cat2", name: "Termite Treatment",      price: 2999, visit_price: 199, is_active: true },
    svc5:  { id: "svc5",  category_id: "cat3", name: "Haircut",                price: 299,  visit_price: 49,  is_active: true },
    svc6:  { id: "svc6",  category_id: "cat3", name: "Facial",                 price: 599,  visit_price: 49,  is_active: true },
    svc7:  { id: "svc7",  category_id: "cat4", name: "Interior Painting",      price: 4999, visit_price: 299, is_active: true },
    svc8:  { id: "svc8",  category_id: "cat5", name: "Switch Repair",          price: 199,  visit_price: 49,  is_active: true },
    svc9:  { id: "svc9",  category_id: "cat5", name: "Leak Fix",               price: 299,  visit_price: 49,  is_active: true },
    svc10: { id: "svc10", category_id: "cat6", name: "AC Service",             price: 699,  visit_price: 99,  is_active: true },
    svc13: { id: "svc13", category_id: "cat6", name: "AC Cleaning Service",    price: 999,  visit_price: 99,  is_active: true },
    svc14: { id: "svc14", category_id: "cat6", name: "Fridge Service",         price: 499,  visit_price: 99,  is_active: true },
    svc11: { id: "svc11", category_id: "cat7", name: "Oil Change",             price: 499,  visit_price: 49,  is_active: true },
    svc15: { id: "svc15", category_id: "cat8", name: "TV Service",             price: 499,  visit_price: 99,  is_active: true },
    svc16: { id: "svc16", category_id: "cat8", name: "Washing Machine Service",price: 599,  visit_price: 99,  is_active: true },
    svc17: { id: "svc17", category_id: "cat9", name: "Personal Chef",          price: 1499, visit_price: 99,  is_active: true },
  });
  console.log("✓ Services seeded");

  // ── Popular Services ─────────────────────────────────────────────────────────
  await db.ref("popular_services").set({
    ps1: { name: "Full Home Cleaning",    price: 1499, image_url: "https://images.unsplash.com/photo-1581578731548-c64695cc6952" },
    ps2: { name: "Kitchen Deep Cleaning", price: 899,  image_url: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600&auto=format&fit=crop" },
    ps3: { name: "Men Haircut",           price: 299,  image_url: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&auto=format&fit=crop" },
    ps4: { name: "Women Spa",             price: 999,  image_url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&auto=format&fit=crop" },
    ps5: { name: "AC Repair",             price: 499,  image_url: "https://media.istockphoto.com/id/2206342744/photo/technician-repairing-air-conditioner-at-home.jpg?s=1024x1024&w=is&k=20" },
    ps6: { name: "Bike Oil Change",       price: 399,  image_url: "https://media.istockphoto.com/id/833171812/photo/we-look-forward-to-serving-you.jpg?s=1024x1024&w=is&k=20" },
  });
  console.log("✓ Popular Services seeded");

  // ── Settings ─────────────────────────────────────────────────────────────────
  await db.ref("settings").set({
    siteName:             "ServiceNest",
    supportEmail:         "servicenest358@gmail.com",
    supportPhone:         "+91 93929 57585",
    enableRegistration:   "true",
    enablePromoBanner:    "true",
    requireOtpForUpdates: "true",
    sessionTimeout:       "120",
  });
  console.log("✓ Settings seeded");

  // ── Coupons ──────────────────────────────────────────────────────────────────
  await db.ref("coupons").set({
    coup1: { code: "WELCOME50", description: "Get 50% OFF on your first order.", discount_percent: 50, is_active: true, created_at: new Date().toISOString() },
    coup2: { code: "SAVE20",    description: "Save 20% on all services.",         discount_percent: 20, is_active: true, created_at: new Date().toISOString() },
    coup3: { code: "NEST10",    description: "Flat 10% discount for returning customers.", discount_percent: 10, is_active: true, created_at: new Date().toISOString() },
  });
  console.log("✓ Coupons seeded");

  console.log("\n Firebase Realtime Database seeded successfully!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
