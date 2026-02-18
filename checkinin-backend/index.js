require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const authRoutes = require("./routes/auth");
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
  res.send("Checkin’in backend running 🚀");
});

// Auth routes
app.use("/auth", authRoutes);

// =======================
// POST /checkin
// =======================
app.post("/checkin", async (req, res) => {
  try {
    const { userId, date, mood } = req.body;

    if (!userId || !date) {
      return res.status(400).json({ success: false, message: "Missing userId or date" });
    }

    let user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Check if already checked in for this date
    const existingCheckIn = user.checkIns.find(c => c.date === date);

    if (!existingCheckIn) {
      user.checkIns.push({
        date,
        mood: mood || "okay",
        timestamp: new Date()
      });
      await user.save();
    } else {
      // Optional: Update mood if already checked in?
      // For now, we'll just ignore or update. Let's update it.
      existingCheckIn.mood = mood || existingCheckIn.mood;
      await user.save();
    }

    res.json({ success: true, data: user.checkIns });
  } catch (error) {
    console.error("Checkin error:", error);
    res.status(500).json({ success: false });
  }
});

// =======================
// GET /history
// =======================
app.get("/history", async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.query.userId });
    // Transform to simple array of dates for backward compatibility if needed, 
    // BUT frontend expects strings. We should update frontend to handle objects 
    // OR we map here. Let's send full objects now and update frontend.
    res.json({ success: true, data: user?.checkIns || [] });
  } catch {
    res.status(500).json({ success: false });
  }
});

// =======================
// GET /emotional-presence
// =======================
app.get("/emotional-presence", async (req, res) => {
  try {
    // For now, return all users' latest check-in. 
    // In a real app, this would be filtered by friends.
    const users = await User.find({});

    const presenceData = users.map(u => {
      const lastCheckIn = u.checkIns[u.checkIns.length - 1];
      return {
        userId: u.userId,
        name: u.name || u.email || "Anonymous", // Add name field to User model later if needed
        lastCheckIn: lastCheckIn || null
      };
    }).filter(u => u.lastCheckIn); // Only return users who have checked in

    res.json({ success: true, data: presenceData });
  } catch (error) {
    console.error("Emotional presence error:", error);
    res.status(500).json({ success: false });
  }
});

// =======================
// GET /settings
// =======================
app.get("/settings", async (req, res) => {
  try {
    let user = await User.findOne({ userId: req.query.userId });
    if (!user) {
      // Create user if not exists (lazy creation for settings)
      user = new User({
        userId: req.query.userId,
        authProvider: "unknown", // or infer if possible
        settings: {
          theme: "system",
          reminderEnabled: true,
          visibility: "circle"
        }
      });
      await user.save();
    }

    if (!user.settings) {
      user.settings = {
        theme: "system",
        reminderEnabled: true,
        visibility: "circle"
      };
      await user.save();
    }

    res.json({ success: true, data: user.settings });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// =======================
// POST /settings
// =======================
app.post("/settings", async (req, res) => {
  try {
    const { userId, settings } = req.body;
    console.log("Updating settings for", userId, settings);
    let user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ success: false });

    // Merge existing settings with new settings
    user.settings = { ...user.settings, ...settings };
    await user.save();

    res.json({ success: true, data: user.settings });
  } catch (error) {
    console.error("Settings update error:", error);
    res.status(500).json({ success: false });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
