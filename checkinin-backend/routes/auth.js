const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const crypto = require("crypto"); // For random tokens

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper: Generate Public ID
const generatePublicId = async () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let isUnique = false;
  let publicId = "";
  while (!isUnique) {
    publicId = "CIN_";
    for (let i = 0; i < 6; i++) {
      publicId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const existing = await User.findOne({ publicId });
    if (!existing) isUnique = true;
  }
  return publicId;
};

// =======================
// POST /auth/signup
// =======================
router.post("/signup", async (req, res) => {
  try {
    const { email, password, name, age } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    const publicId = await generatePublicId();
    const hashedPassword = await bcrypt.hash(password, 8);
    const userId = crypto.randomUUID(); // Valid unique ID for our system

    const user = new User({
      userId,
      email,
      password: hashedPassword,
      name,
      age,
      publicId,
      authProvider: "email"
    });

    await user.save();

    const token = jwt.sign({ userId: user.userId }, process.env.JWT_SECRET, { expiresIn: "30d" });

    res.status(201).json({
      success: true,
      token,
      user: { userId, publicId, email, name, age }
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ success: false, message: "Signup failed" });
  }
});

// =======================
// POST /auth/login
// =======================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user || !user.password) { // Check if user exists and has a password (google users might not)
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user.userId }, process.env.JWT_SECRET, { expiresIn: "30d" });

    res.json({
      success: true,
      token,
      user: {
        userId: user.userId,
        publicId: user.publicId,
        email: user.email,
        name: user.name,
        authProvider: user.authProvider
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Login failed" });
  }
});

// =======================
// POST /auth/google
// =======================
router.post("/google", async (req, res) => {
  try {
    const { token } = req.body;
    let email, googleId, name, picture;

    if (req.body.accessToken) {
      const tokenInfo = await client.getTokenInfo(req.body.accessToken);
      // Need to fetch user profile for name/picture if using access token
      const profile = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${req.body.accessToken}`).then(r => r.json());
      email = profile.email;
      googleId = profile.id;
      name = profile.name;
      picture = profile.picture;
    } else if (token) {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: [process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_ANDROID_CLIENT_ID],
      });
      const payload = ticket.getPayload();
      email = payload.email;
      googleId = payload.sub;
      name = payload.name;
      picture = payload.picture;
    } else {
      return res.status(400).json({ success: false, message: "Token required" });
    }

    let user = await User.findOne({ email });

    if (!user) {
      const publicId = await generatePublicId();
      user = new User({
        userId: googleId,
        email,
        name,
        avatar: picture,
        authProvider: "google",
        publicId
      });
      await user.save();
    }

    const jwtToken = jwt.sign({ userId: user.userId }, process.env.JWT_SECRET, { expiresIn: "30d" });

    res.json({
      success: true,
      token: jwtToken,
      user: {
        userId: user.userId,
        email: user.email,
        publicId: user.publicId,
        name: user.name,
        authProvider: user.authProvider
      },
    });
  } catch (error) {
    console.error("Google auth error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// =======================
// POST /auth/forgot-password
// =======================
router.post("/forgot-password", async (req, res) => {
  // Mock implementation for now
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  // In a real app, generate token, save to DB with expiry, send email
  // For now, return a mock token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Simulating email sent
  console.log(`Reset Token for ${email}: ${resetToken}`);

  res.json({ success: true, message: "Password reset link sent to email (Mock: Check console)" });
});

module.exports = router;
