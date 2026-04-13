const admin = require("firebase-admin");

// Initialize Firebase Admin SDK using service account credentials from env
// Set FIREBASE_SERVICE_ACCOUNT env var to the JSON string of your service account key
// OR set individual env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY

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

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    // e.g. "https://your-project-default-rtdb.firebaseio.com"
  });
}

const db = admin.database();

// Test the database connection on startup
db.ref(".info/connected").on("value", (snap) => {
  if (snap.val() === true) {
    console.log("Successfully connected to Firebase Realtime Database.");
  } else {
    console.log("Firebase Realtime Database: disconnected / connecting...");
  }
});

module.exports = db;
