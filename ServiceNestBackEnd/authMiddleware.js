const jwt = require("jsonwebtoken");
const db = require("./db");
const asyncHandler = require("./asyncHandler");

// Authentication middleware
const authenticateToken = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token)
    return res.status(401).json({ error: "Access denied. No token provided." });

  let decodedUser;
  try {
    decodedUser = jwt.verify(
      token,
      process.env.JWT_SECRET || "default_secret_key"
    );
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token." });
  }

  // Check if user is blocked in Firebase
  const userSnap = await db.ref(`users/${decodedUser.id}`).once("value");
  if (userSnap.exists()) {
    const userData = userSnap.val();
    const isBlocked =
      userData.is_blocked === true ||
      userData.is_blocked === 1 ||
      userData.is_blocked === "true" ||
      userData.is_blocked === "1";
    if (isBlocked) {
      return res
        .status(403)
        .json({ error: "Your account has been blocked by the admin." });
    }
  }

  req.user = decodedUser;
  next();
});

module.exports = authenticateToken;
