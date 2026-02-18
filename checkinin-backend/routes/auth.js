const express = require("express");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");

const router = express.Router();

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// =======================
// POST /auth/google
// =======================
router.post("/google", async (req, res) => {
  try {
    const { token } = req.body;

    // Verify Google token
    let email, googleId;

    if (req.body.accessToken) {
      // Verify Access Token
      const tokenInfo = await client.getTokenInfo(req.body.accessToken);
      email = tokenInfo.email;
      googleId = tokenInfo.sub;
    } else if (token && typeof token === "string") {
      // Verify ID Token
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: [
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_ANDROID_CLIENT_ID,
        ],
      });
      const payload = ticket.getPayload();
      email = payload.email;
      googleId = payload.sub;
    } else {
      return res.status(400).json({
        success: false,
        message: "Google token (ID Token or Access Token) required",
      });
    }

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        userId: googleId,
        email,
        authProvider: "google",
      });
      await user.save();
    }

    // Create JWT
    const jwtToken = jwt.sign(
      { userId: user.userId, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({
      success: true,
      token: jwtToken,
      user: {
        userId: user.userId,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Google auth error:", error);
    res.status(500).json({
      success: false,
      message: "Google authentication failed: " + error.message,
    });
  }
});

module.exports = router;
