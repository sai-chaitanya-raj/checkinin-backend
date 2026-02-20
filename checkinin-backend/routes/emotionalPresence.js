const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../models/User");

router.get("/", auth, async (req, res, next) => {
    try {
        const currentUser = req.user;
        const friendIds = currentUser.friends || [];

        const users = await User.find({ userId: { $in: friendIds } });

        const presenceData = users
            .map((u) => {
                const lastCheckIn = u.checkIns && u.checkIns.length > 0 ? u.checkIns[u.checkIns.length - 1] : null;
                const visibility = u.privacy?.checkinVisibility || "friends";
                if (visibility === "private") return null;
                if (!lastCheckIn) return null;

                return {
                    userId: u.userId,
                    name: u.name || (u.email ? u.email.split("@")[0] : "Anonymous"),
                    lastCheckIn,
                };
            })
            .filter(Boolean);

        res.json({ success: true, data: presenceData });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
