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
exports.uploadAvatar = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

        // Upload to Cloudinary
        // stream upload is a bit complex, simpler to use buffer or path if multer saves to disk. 
        // Using memory storage for multer usually requires stream upload or converting buffer.
        // For simplicity with standard multer setup:

        const b64 = Buffer.from(req.file.buffer).toString("base64");
        let dataURI = "data:" + req.file.mimetype + ";base64," + b64;

        // Fallback if no cloudinary credentials: use a placeholder or local mock?
        // User requested Cloudinary.
        if (!process.env.CLOUDINARY_CLOUD_NAME) {
            return res.status(500).json({ success: false, message: "Cloudinary not configured" });
        }

        const result = await cloudinary.uploader.upload(dataURI, {
            folder: "checkin-avatars",
            public_id: req.user.userId
        });

        const user = req.user;
        user.avatar = result.secure_url;
        await user.save();

        res.json({ success: true, message: "Avatar updated", data: { avatar: user.avatar } });
    } catch (error) {
        console.error("Avatar upload error:", error);
        res.status(500).json({ success: false, message: "Upload failed" });
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
        const user = await User.findById(req.user.userId).select("+password");

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) return res.status(400).json({ success: false, message: "Incorrect old password" });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
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
        const { token } = req.body;
        const user = req.user;

        user.expoPushToken = token;
        await user.save();

        res.json({ success: true, message: "Push token updated" });
    } catch (error) {
        console.error("Update push token error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
