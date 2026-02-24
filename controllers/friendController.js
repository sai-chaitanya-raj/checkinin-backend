const User = require("../models/User");

// =======================
// GET /friends
// =======================
exports.getFriendData = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        // Populate friends
        const friendList = await User.find({ userId: { $in: user.friends } })
            .select("userId publicId name email avatar bio checkIns privacy")
            .lean();

        // Format friends with last checkin (Respecting Privacy)
        const formattedFriends = friendList.map(f => {
            let lastCheckIn = null;
            let currentStreak = 0;
            if (f.checkIns && f.checkIns.length > 0) {
                const checkIn = f.checkIns[f.checkIns.length - 1];

                // Visibility Logic
                const visibility = f.privacy?.checkinVisibility || 'friends';
                if (visibility === 'public') {
                    lastCheckIn = checkIn;
                } else if (visibility === 'friends') {
                    // Since they are in our friend list, we can see if visibility is 'friends'
                    lastCheckIn = checkIn;
                } else {
                    // Private
                    lastCheckIn = null;
                }

                // Streak calculation
                const dates = f.checkIns.map(c => c.date);
                const sortedDates = [...new Set(dates)].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
                const today = new Date().toISOString().split("T")[0];
                const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

                let expectedDate = sortedDates[0] === today ? today : yesterday;
                if (sortedDates[0] === today || sortedDates[0] === yesterday) {
                    for (const date of sortedDates) {
                        if (date === expectedDate) {
                            currentStreak++;
                            expectedDate = new Date(new Date(date).getTime() - 86400000).toISOString().split("T")[0];
                        } else {
                            break;
                        }
                    }
                }
            }

            return {
                userId: f.userId,
                publicId: f.publicId,
                name: f.name || (f.email ? f.email.split("@")[0] : "Anonymous"),
                avatar: f.avatar,
                bio: f.bio,
                streak: currentStreak,
                lastCheckIn
            };
        });

        const receivedRaw = await User.find({ userId: { $in: user.friendRequests.received } })
            .select("userId publicId name email avatar")
            .lean();
        const sentRaw = await User.find({ userId: { $in: user.friendRequests.sent } })
            .select("userId publicId name email avatar")
            .lean();

        const receivedRequests = receivedRaw.map((u) => ({
            userId: u.userId,
            publicId: u.publicId,
            name: u.name || (u.email ? u.email.split("@")[0] : "Anonymous"),
            email: u.email,
            avatar: u.avatar,
        }));
        const sentRequests = sentRaw.map((u) => ({
            userId: u.userId,
            publicId: u.publicId,
            name: u.name || (u.email ? u.email.split("@")[0] : "Anonymous"),
            email: u.email,
            avatar: u.avatar,
        }));

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
};

// =======================
// POST /friends/request
// =======================
exports.sendRequest = async (req, res) => {
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

        // Initialize lists if missing
        if (!sender.friendRequests) sender.friendRequests = { sent: [], received: [] };
        if (!receiver.friendRequests) receiver.friendRequests = { sent: [], received: [] };

        sender.friendRequests.sent.push(receiver.userId);
        receiver.friendRequests.received.push(sender.userId);

        await sender.save();
        await receiver.save();

        res.json({ success: true, message: "Friend request sent" });
    } catch (error) {
        console.error("Friend request error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// =======================
// POST /friends/respond
// =======================
exports.respondRequest = async (req, res) => {
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
            if (!user.circle) user.circle = [];
            if (!requester.circle) requester.circle = [];
            user.circle.push(requesterId);
            requester.circle.push(user.userId);
        }

        await user.save();
        await requester.save();

        res.json({ success: true, message: `Request ${action}ed` });
    } catch (error) {
        console.error("Respond request error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// =======================
// DELETE /friends/remove
// =======================
exports.removeFriend = async (req, res) => {
    try {
        const { friendId } = req.body;
        const userId = req.user.userId;

        // Remove from my list
        await User.updateOne({ userId }, { $pull: { friends: friendId, circle: friendId } });

        // Remove me from their list
        await User.updateOne({ userId: friendId }, { $pull: { friends: userId, circle: userId } });

        res.json({ success: true, message: "Friend removed" });
    } catch (error) {
        console.error("Remove friend error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// =======================
// GET /friends/feed (Circle Feed)
// =======================
exports.getCircleFeed = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        // Find friends
        const friends = await User.find({ userId: { $in: user.friends } })
            .select("userId publicId name email avatar checkIns privacy")
            .lean();

        let feed = [];
        friends.forEach(f => {
            if (f.checkIns && f.checkIns.length > 0) {
                // Get most recent check-in
                const lastCheckIn = f.checkIns[f.checkIns.length - 1];

                // Privacy Check
                const privacy = f.privacy?.checkinVisibility || 'friends';

                // Rule: 
                // - private: skip
                // - friends: include (we are friend)
                // - public: include

                if (privacy === 'private') return;

                feed.push({
                    userId: f.userId,
                    name: f.name || (f.email ? f.email.split("@")[0] : "Anonymous"),
                    publicId: f.publicId,
                    avatar: f.avatar,
                    lastCheckIn: lastCheckIn
                });
            }
        });

        // Sort by check-in timestamp descending (newest first)
        feed.sort((a, b) => new Date(b.lastCheckIn.timestamp) - new Date(a.lastCheckIn.timestamp));

        res.json({ success: true, data: feed });
    } catch (error) {
        console.error("Feed error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// =======================
// GET /friends/search/:publicId
// =======================
exports.searchByPublicId = async (req, res) => {
    try {
        const publicId = req.params.publicId.toUpperCase();
        const user = await User.findOne({ publicId }).select("userId publicId name avatar email");

        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        if (user.userId === req.user.userId) return res.status(400).json({ success: false, message: "You cannot search for yourself" });

        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};
