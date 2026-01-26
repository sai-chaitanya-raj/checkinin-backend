require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const User = require("./models/User");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect MongoDB
connectDB();

// Test route
app.get("/", (req, res) => {
  res.send("Checkin’in backend with MongoDB running 🚀");
});


// =======================
// POST /checkin
// =======================
app.post("/checkin", async (req, res) => {
  try {
    const { userId, date } = req.body;

    if (!userId || !date) {
      return res.status(400).json({
        success: false,
        message: "userId and date are required",
      });
    }

    let user = await User.findOne({ userId });

    if (!user) {
      user = new User({
        userId,
        checkIns: [],
        circle: [],
      });
    }

    if (!user.checkIns.includes(date)) {
      user.checkIns.push(date);
    }

    await user.save();

    res.json({
      success: true,
      message: "Checked in successfully",
      data: user.checkIns,
    });
  } catch (error) {
    console.error("Check-in error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});


// =======================
// GET /history
// =======================
app.get("/history", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const user = await User.findOne({ userId });

    res.json({
      success: true,
      data: user?.checkIns || [],
    });
  } catch (error) {
    console.error("History error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});


// =======================
// POST /circle/add
// =======================
app.post("/circle/add", async (req, res) => {
  try {
    const { userId, targetUserId } = req.body;

    if (!userId || !targetUserId) {
      return res.status(400).json({
        success: false,
        message: "userId and targetUserId are required",
      });
    }

    if (userId === targetUserId) {
      return res.status(400).json({
        success: false,
        message: "You cannot add yourself",
      });
    }

    let user = await User.findOne({ userId });
    let targetUser = await User.findOne({ userId: targetUserId });

    if (!user) {
      user = new User({ userId });
    }

    if (!targetUser) {
      targetUser = new User({ userId: targetUserId });
      await targetUser.save();
    }

    if (!user.circle.includes(targetUserId)) {
      user.circle.push(targetUserId);
    }

    await user.save();

    res.json({
      success: true,
      data: user.circle,
    });
  } catch (error) {
    console.error("Circle add error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});


// =======================
// GET /circle
// =======================
app.get("/circle", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const user = await User.findOne({ userId });

    res.json({
      success: true,
      data: user?.circle || [],
    });
  } catch (error) {
    console.error("Circle fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});


// =======================
// GET /settings
// =======================
app.get("/settings", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    let user = await User.findOne({ userId });

    if (!user) {
      user = new User({ userId });
      await user.save();
    }

    res.json({
      success: true,
      data: user.settings,
    });
  } catch (error) {
    console.error("Settings fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});


// =======================
// POST /settings
// =======================
app.post("/settings", async (req, res) => {
  try {
    const { userId, settings } = req.body;

    if (!userId || !settings) {
      return res.status(400).json({
        success: false,
        message: "userId and settings are required",
      });
    }

    let user = await User.findOne({ userId });

    if (!user) {
      user = new User({ userId });
    }

    user.settings = {
      ...user.settings,
      ...settings,
    };

    await user.save();

    res.json({
      success: true,
      data: user.settings,
    });
  } catch (error) {
    console.error("Settings update error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});


// =======================
// START SERVER
// =======================
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
