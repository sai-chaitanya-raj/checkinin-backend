const express = require("express");
const User = require("../models/User");
const auth = require("../middleware/auth");

const router = express.Router();

// =======================
// GET /friends/search/:publicId
// =======================
router.get("/search/:publicId", auth, async (req, res) => {
    try {
        const publicId = req.params.publicId.toUpperCase();
        const user = await User.findOne({ publicId }).select("userId publicId name avatar email");

        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        if (user.userId === req.user.userId) return res.status(400).json({ success: false, message: "You cannot search for yourself" });

        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// =======================
// POST /friends/request
// =======================
router.post("/request", auth, async (req, res) => {
    try {
        const { targetPublicId } = req.body;
        const sender = req.user;
        const receiver = await User.findOne({ publicId: targetPublicId });

        if (!receiver) return res.status(404).json({ success: false, message: "User not found" });
        if (sender.userId === receiver.userId) return res.status(400).json({ success: false, message: "Cannot add yourself" });

        // Check if already friends
        if (sender.friends.includes(receiver.userId)) return res.status(400).json({ success: false, message: "Already friends" });

        // Check availability
        if (sender.friendRequests.sent.includes(receiver.userId)) return res.status(400).json({ success: false, message: "Request already sent" });
        if (sender.friendRequests.received.includes(receiver.userId)) return res.status(400).json({ success: false, message: "They already sent you a request" });

        // Execute Request
        sender.friendRequests.sent.push(receiver.userId);
        receiver.friendRequests.received.push(sender.userId);

        await sender.save();
        await receiver.save();

        res.json({ success: true, message: "Friend request sent" });
    } catch (error) {
        console.error("Friend request error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// =======================
// POST /friends/respond
// =======================
router.post("/respond", auth, async (req, res) => {
    try {
        const { requesterId, action } = req.body; // action: 'accept' | 'reject'
        const user = req.user;
        const requester = await User.findOne({ userId: requesterId });

        if (!requester) return res.status(404).json({ success: false, message: "Requester not found" });

        // Remove from requests regardless of action
        user.friendRequests.received = user.friendRequests.received.filter(id => id !== requesterId);
        requester.friendRequests.sent = requester.friendRequests.sent.filter(id => id !== user.userId);

        if (action === 'accept') {
            user.friends.push(requesterId);
            requester.friends.push(user.userId);

            // Legacy support
            user.circle.push(requesterId);
            requester.circle.push(user.userId);
        }

        await user.save();
        await requester.save();

        res.json({ success: true, message: `Request ${action}ed` });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// =======================
// GET /friends
// =======================
router.get("/", auth, async (req, res) => {
    try {
        const user = await User.findOne({ userId: req.user.userId }); // Re-fetch to get latest

        // Populate friends
        const friends = await User.find({ userId: { $in: user.friends } })
            .select("userId publicId name email avatar checkIns");

        // Populate requests
        const receivedRequests = await User.find({ userId: { $in: user.friendRequests.received } })
            .select("userId publicId name email avatar");

        const sentRequests = await User.find({ userId: { $in: user.friendRequests.sent } })
            .select("userId publicId name email avatar");

        // Format friends with last checkin
        const formattedFriends = friends.map(f => {
            const lastCheckIn = f.checkIns.length > 0 ? f.checkIns[f.checkIns.length - 1] : null;
            return {
                userId: f.userId,
                publicId: f.publicId,
                name: f.name || f.email.split('@')[0],
                avatar: f.avatar,
                lastCheckIn
            };
        });

        res.json({
            success: true,
            data: {
                friends: formattedFriends,
                requests: {
                    received: receivedRequests,
                    sent: sentRequests
                },
                myPublicId: user.publicId
            }
        });
    } catch (error) {
        console.error("Get friends error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

module.exports = router;
