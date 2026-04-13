# ServiceNest — MySQL → Firebase Realtime Database Migration

## What changed

| File | Change |
|---|---|
| `db.js` | Replaced `mysql2` pool with `firebase-admin` Realtime Database |
| `authMiddleware.js` | `pool.execute(SELECT …)` → `db.ref('users/…').once('value')` |
| `authRoutes.js` | All SQL queries replaced with Firebase RTDB reads/writes |
| `shopRoutes.js` | Cart, checkout, bookings, reviews — full Firebase rewrite |
| `adminRoutes.js` | Admin stats, services, coupons, popular services — Firebase |
| `publicRoutes.js` | Settings, coupons, categories, services — Firebase reads |
| `forgotPasswordRoutes.js` | User lookup & password update via Firebase |
| `ServiceNestServer.js` | Removed `pool` import; passes `db` to forgotPasswordRoutes |
| `package.json` | Removed `mysql2`; added `firebase-admin` |
| `seed-firebase.js` | **New** — one-time script to seed all initial data into RTDB |
| `firebase-rules.json` | **New** — security rules to paste into Firebase Console |
| `.env.example` | Updated with Firebase env vars (MySQL vars removed) |

---

## Step-by-step setup

### 1. Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → name it (e.g. `servicenest`) → Continue
3. In the left sidebar → **Build → Realtime Database** → **Create Database**
4. Choose your region (e.g. `asia-south1` for India) → **Start in test mode** (you'll lock it down with rules later)

---

### 2. Get your service account key

1. Firebase Console → ⚙️ **Project Settings** → **Service accounts** tab
2. Click **Generate new private key** → download the JSON file
3. Keep this file secret — never commit it to git

You have two options for supplying the credentials:

**Option A — single env var (recommended for deployment):**
```bash
# Minify the JSON to one line, then set:
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"...","private_key":"...",...}'
```

**Option B — individual env vars:**
Copy the fields from the JSON into your `.env` file as shown in `.env.example`.

---

### 3. Install dependencies

```bash
cd ServiceNestBackEnd
npm install
# firebase-admin is now in package.json; mysql2 has been removed
```

---

### 4. Configure your .env

Copy `.env.example` to `.env` and fill in all values:

```bash
cp .env.example .env
# Then edit .env with your real credentials
```

The **FIREBASE_DATABASE_URL** looks like:
```
https://your-project-id-default-rtdb.firebaseio.com
```
Find it in Firebase Console → Realtime Database → Data tab (top of the page).

---

### 5. Seed initial data

Run the seed script once to populate categories, services, popular services, settings, and coupons:

```bash
node seed-firebase.js
```

You should see:
```
✓ Categories seeded
✓ Services seeded
✓ Popular Services seeded
✓ Settings seeded
✓ Coupons seeded
✅ Firebase Realtime Database seeded successfully!
```

---

### 6. Set security rules

1. Open `firebase-rules.json` from this folder
2. In Firebase Console → **Realtime Database → Rules** tab
3. Replace the default rules with the contents of `firebase-rules.json`
4. Click **Publish**

---

### 7. Start the server

```bash
npm start
# or for dev with auto-reload:
npm run dev
```

---

## Data structure in Firebase

```
/
├── users/
│   └── {pushId}/
│       ├── id, name, email, phone, password (hashed)
│       ├── role ("user" | "admin" | "provider")
│       ├── is_blocked, address
│       ├── created_at, last_login
│
├── cart_items/
│   └── {pushId}/
│       ├── user_id, service_id, service_name, price, quantity
│       └── user_id_service_id  ← composite index for uniqueness
│
├── bookings/
│   └── {pushId}/
│       ├── user_id, service_id, service_name, price, quantity
│       ├── user_name, address, phone
│       ├── schedule_date, schedule_time, payment_method
│       ├── booking_date, status ("Pending" | "Completed" | "Cancelled")
│
├── reviews/
│   └── {pushId}/
│       ├── user_id, name, review, rating, created_at
│
├── categories/
│   └── {key}/ → { id, name, image }
│
├── services/
│   └── {key}/ → { id, category_id, name, price, visit_price, is_active }
│
├── popular_services/
│   └── {key}/ → { name, price, image_url }
│
├── settings/
│   └── { siteName, supportEmail, supportPhone, enableRegistration, ... }
│
└── coupons/
    └── {pushId}/ → { code, description, discount_percent, is_active, created_at }
```

---

## Front-end API calls

**No changes needed in the frontend.** All API endpoints (`/api/login`, `/api/cart/:userId`, etc.) remain identical. The switch from MySQL to Firebase is entirely backend-internal.

---

## Notes

- **IDs are now Firebase push keys** (e.g. `-OA3xKj2...`) instead of auto-increment integers. The frontend receives them as `id` in every response — same field name as before.
- The `mysql2` package and all SQL files (`sql_cmds.sql`) are no longer needed.
- Redis and rate limiting are **unchanged**.
- Nodemailer (OTP emails) is **unchanged**.
- Google OAuth is **unchanged**.
