const User = require("../models/User");
const cloudinary = require("cloudinary").v2;

// Configure Cloudinary (ensure these are in your .env)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});
exports.getProfile = async (req, res) => {
    try {
        // Use _id (ObjectId) not userId (String) for findById
        const user = await User.findById(req.user._id).select("-password");
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        // Ensure privacy/settings objects exist if they were missing (migration fallback)
        if (!user.privacy) {
            user.privacy = {
                profileVisibility: "public",
                checkinVisibility: "friends",
                friendRequestPermission: "everyone",
                searchable: true,
                showLastSeen: true
            };
            await user.save();
        }

        res.json({ success: true, data: user });
    } catch (error) {
        console.error("Get profile error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// =======================
// PUT /profile/update
// =======================
exports.updateProfile = async (req, res) => {
    try {
        const { name } = req.body;
        const user = req.user; // from auth middleware

        if (name) user.name = name;

        // Removed age and publicId updates as per requirement (Immutable Identity)

        await user.save();
        res.json({ success: true, message: "Profile updated", data: user });
    } catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// =======================
// PUT /profile/bio
// =======================
exports.updateBio = async (req, res) => {
    try {
        const { bio } = req.body;
        const user = req.user;

        if (bio !== undefined) {
            user.bio = bio.trim().substring(0, 120);
        }

        await user.save();
        res.json({ success: true, message: "Bio updated", data: { bio: user.bio } });
    } catch (error) {
        console.error("Update bio error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// =======================
// PUT /profile/privacy
// =======================
exports.updatePrivacy = async (req, res) => {
    try {
        const { profileVisibility, checkinVisibility, friendRequestPermission, searchable, showLastSeen } = req.body;
        const user = req.user;

        if (!user.privacy) user.privacy = {};

        if (profileVisibility) user.privacy.profileVisibility = profileVisibility;
        if (checkinVisibility) user.privacy.checkinVisibility = checkinVisibility;
        if (friendRequestPermission) user.privacy.friendRequestPermission = friendRequestPermission;
        if (searchable !== undefined) user.privacy.searchable = searchable;
        if (showLastSeen !== undefined) user.privacy.showLastSeen = showLastSeen;

        await user.save();
        res.json({ success: true, message: "Privacy settings updated", data: user.privacy });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// =======================
// PUT /profile/avatar
// =======================
exports.updateAvatar = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

        const user = req.user;
        user.avatar = req.file.path; // Cloudinary automatically provides the safe URL via multer-storage-cloudinary
        await user.save();

        res.json({ success: true, message: "Avatar updated", data: { avatar: user.avatar } });
    } catch (error) {
        console.error("Avatar upload error:", error);
        res.status(500).json({ success: false, message: "Upload failed" });
    }
};

// =======================
// DELETE /profile/avatar
// =======================
exports.deleteAvatar = async (req, res) => {
    try {
        const user = req.user;
        user.avatar = "";
        await user.save();
        res.json({ success: true, message: "Avatar removed", data: { avatar: "" } });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// =======================
// PUT /profile/change-password
// See Auth Controller or handle here. 
// Ideally separate auth logic, but "change password" is a user profile action often.
// Let's put it here as per user request (User Model Update context).
// =======================
const bcrypt = require("bcryptjs");
exports.changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const user = await User.findOne({ userId: req.user.userId }).select("+password");

        if (!user || !user.password) {
            return res.status(400).json({ success: false, message: "Cannot change password for this account" });
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) return res.status(400).json({ success: false, message: "Incorrect old password" });

        user.password = await bcrypt.hash(newPassword, 12);
        await user.save();

        res.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// =======================
// PUT /profile/settings/theme
// =======================
exports.updateTheme = async (req, res) => {
    try {
        const { theme } = req.body; // 'light', 'dark', 'system'
        const user = req.user;

        if (!user.settings) user.settings = {};
        user.settings.theme = theme;

        await user.save();
        res.json({ success: true, message: "Theme updated", data: { theme } });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// =======================
// PUT /profile/settings/notifications
// =======================
exports.updateNotifications = async (req, res) => {
    try {
        const { checkIns, friendRequests, updates } = req.body;
        const user = req.user;

        if (!user.settings) user.settings = {};
        if (!user.settings.notifications) user.settings.notifications = {};

        if (checkIns !== undefined) user.settings.notifications.checkIns = checkIns;
        if (friendRequests !== undefined) user.settings.notifications.friendRequests = friendRequests;
        if (updates !== undefined) user.settings.notifications.updates = updates;

        await user.save();
        res.json({ success: true, message: "Notifications updated", data: user.settings.notifications });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// =======================
// PUT /profile/settings/reminder
// =======================
exports.updateReminder = async (req, res) => {
    try {
        const { enabled, time } = req.body;
        const user = req.user;

        if (!user.settings) user.settings = {};

        if (enabled !== undefined) user.settings.reminderEnabled = enabled;
        if (time) user.settings.reminderTime = time;

        await user.save();
        res.json({ success: true, message: "Reminder settings updated", data: { enabled: user.settings.reminderEnabled, time: user.settings.reminderTime } });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// =======================
// DELETE /profile/delete
// =======================
exports.deleteAccount = async (req, res) => {
    try {
        const userId = req.user.userId;

        // Remove from user's friends' lists
        // 1. Remove from 'friends' array of other users
        await User.updateMany(
            { friends: userId },
            { $pull: { friends: userId } }
        );

        // 2. Remove from 'friendRequests' of other users
        await User.updateMany(
            { "friendRequests.sent": userId },
            { $pull: { "friendRequests.sent": userId } }
        );
        await User.updateMany(
            { "friendRequests.received": userId },
            { $pull: { "friendRequests.received": userId } }
        );

        // Delete user
        await User.deleteOne({ userId });

        res.json({ success: true, message: "Account deleted permanently" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// =======================
// PUT /profile/push-token
// =======================
exports.updatePushToken = async (req, res) => {
    try {
        const { token, timezone } = req.body;
        const user = req.user;

        if (token) user.expoPushToken = token;
        if (timezone) user.timezone = timezone;

        await user.save();

        res.json({ success: true, message: "Push token updated" });
    } catch (error) {
        console.error("Update push token error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// =======================
// GET /profile/:publicId
// =======================
exports.getPublicProfile = async (req, res) => {
    try {
        const targetPublicId = req.params.publicId.toUpperCase();
        const requester = req.user; // from auth middleware

        const targetUser = await User.findOne({ publicId: targetPublicId });
        if (!targetUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // 1. Enforce Privacy
        const visibility = targetUser.privacy?.profileVisibility || 'public';
        const isFriend = targetUser.friends.includes(requester.userId);

        // Self-view bypass
        const isSelf = targetUser.userId === requester.userId;

        if (!isSelf) {
            if (visibility === 'private') {
                return res.status(403).json({ success: false, message: "Profile is private" });
            }
            if (visibility === 'friends' && !isFriend) {
                return res.status(403).json({ success: false, message: "Profile is private" });
            }
        }

        // 2. Compute Fields
        const checkIns = targetUser.checkIns || [];
        const totalCheckIns = checkIns.length;

        let currentStreak = 0;
        if (totalCheckIns > 0) {
            const dates = checkIns.map(c => c.date);
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

        const recentCheckIns = checkIns.slice(-5).reverse().map(c => ({
            date: c.date,
            mood: c.mood,
            timestamp: c.timestamp
        }));

        const weeklyMoodSummary = { great: 0, okay: 0, bad: 0 };
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

        checkIns.forEach(c => {
            if (c.date >= sevenDaysAgo) {
                if (weeklyMoodSummary[c.mood] !== undefined) {
                    weeklyMoodSummary[c.mood]++;
                }
            }
        });

        const friendCount = targetUser.friends.length;

        // 3. Return safe fields
        res.json({
            success: true,
            data: {
                publicId: targetUser.publicId,
                name: targetUser.name || (targetUser.email ? targetUser.email.split("@")[0] : "Anonymous"),
                avatar: targetUser.avatar,
                bio: targetUser.bio,
                friendCount,
                streak: currentStreak,
                totalCheckIns,
                weeklyMoodSummary,
                recentCheckIns,
                isFriend,
                isSelf
            }
        });

    } catch (error) {
        console.error("Get public profile error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
