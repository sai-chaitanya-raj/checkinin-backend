const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../models/User");

router.get("/", auth, async (req, res, next) => {
    try {
        const currentUser = req.user;
        const friendIds = currentUser.friends || [];
        const today = new Date().toISOString().split("T")[0];

        const users = await User.find({ userId: { $in: [...friendIds, currentUser.userId] } })
            .select("userId name email checkIns dailyThoughts privacy");

        const presenceData = [];
        let myThought = null;
        const friendsThoughts = [];

        for (const u of users) {
            const displayName = u.name || (u.email ? u.email.split("@")[0] : "Anonymous");
            const lastCheckIn = u.checkIns && u.checkIns.length > 0 ? u.checkIns[u.checkIns.length - 1] : null;
            const visibility = u.privacy ? (u.privacy.checkinVisibility || "friends") : "friends";
            const todayThought = (u.dailyThoughts || []).find((t) => t.date === today);

            if (u.userId === currentUser.userId) {
                myThought = todayThought ? { thought: todayThought.thought, timestamp: todayThought.timestamp } : null;
            } else {
                if (visibility !== "private" && lastCheckIn) {
                    presenceData.push({ userId: u.userId, name: displayName, lastCheckIn });
                }
            }

            if (u.dailyThoughts && u.dailyThoughts.length > 0) {
                if (u.userId === currentUser.userId || visibility !== "private") {
                    for (const t of u.dailyThoughts) {
                        friendsThoughts.push({
                            name: u.userId === currentUser.userId ? "Me" : displayName,
                            thought: t.thought,
                            timestamp: t.timestamp || new Date(t.date).toISOString()
                        });
                    }
                }
            }
        }

        // Sort globally by timestamp, newest first
        friendsThoughts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        res.json({ success: true, data: presenceData, myThought, friendsThoughts });
    } catch (error) {
        next(error);
    }
});

router.delete("/thought", auth, async (req, res, next) => {
    try {
        const user = req.user;
        const today = new Date().toISOString().split("T")[0];

        if (user.dailyThoughts && user.dailyThoughts.length > 0) {
            user.dailyThoughts = user.dailyThoughts.filter((t) => t.date !== today);
            await user.save();
        }

        res.json({ success: true, message: "Thought cleared" });
    } catch (error) {
        next(error);
    }
});

router.post("/thought", auth, async (req, res, next) => {
    try {
        const { thought } = req.body;
        console.log(`[POST /emotional-presence/thought] Body:`, req.body);
        const user = req.user;
        const today = new Date().toISOString().split("T")[0];

        const wordCount = (thought || "").trim().split(/\s+/).filter(Boolean).length;
        if (wordCount > 60) {
            return res.status(400).json({ success: false, message: "Maximum 60 words allowed" });
        }

        if (!user.dailyThoughts) user.dailyThoughts = [];
        const existing = user.dailyThoughts.find((t) => t.date === today);
        if (existing) {
            existing.thought = (thought || "").trim();
            existing.timestamp = new Date();
        } else {
            user.dailyThoughts.push({ date: today, thought: (thought || "").trim(), timestamp: new Date() });
        }
        await user.save();

        res.json({ success: true, message: "Thought saved" });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
