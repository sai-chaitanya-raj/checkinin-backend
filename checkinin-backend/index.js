require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const friendRoutes = require("./routes/friends");
const authMiddleware = require("./middleware/auth");
const User = require("./models/User");

const app = express();
app.use(express.json());
app.use(cors());

// Scheduler
const scheduler = require("./services/scheduler");
scheduler.start();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error(err));

// Routes
const profileRoutes = require("./routes/profile");

// Routes
app.use("/auth", authRoutes);
app.use("/friends", friendRoutes);
app.use("/profile", profileRoutes);

// =======================
// POST /checkin
// =======================
app.post("/checkin", authMiddleware, async (req, res) => {
  try {
    const { date, mood } = req.body;
    const user = req.user; // Attached by middleware

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
  // Making this public for now, or use authMiddleware if strict
  // If strict: app.get("/history", authMiddleware, ...)
  try {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ success: false });

    const user = await User.findOne({ userId });
    if (!user) return res.status(404).json({ success: false });

    // Return checks
    res.json({ success: true, data: user.checkIns });
  } catch (error) {
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
// GET /settings (Profile/Settings)
// =======================
// Deprecated /settings endpoints removed. 
// Uses routes/settings.js and routes/profile.js instead.

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
