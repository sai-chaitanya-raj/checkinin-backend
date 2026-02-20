const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../models/User");

router.get("/", auth, async (req, res, next) => {
    try {
        const userId = req.query.userId || req.user.userId;
        const currentUser = req.user;

        if (userId !== currentUser.userId) {
            const targetUser = await User.findOne({ userId });
            if (!targetUser) return res.status(404).json({ success: false, message: "User not found" });

            const visibility = targetUser.privacy?.checkinVisibility || "friends";
            if (visibility === "private") {
                return res.status(403).json({ success: false, message: "Access denied" });
            }
            const isFriend = currentUser.friends?.includes(userId);
            if (visibility === "friends" && !isFriend) {
                return res.status(403).json({ success: false, message: "Must be friends to view" });
            }

            return res.json({ success: true, data: targetUser.checkIns });
        }

        const user = await User.findOne({ userId: currentUser.userId });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        res.json({ success: true, data: user.checkIns });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
