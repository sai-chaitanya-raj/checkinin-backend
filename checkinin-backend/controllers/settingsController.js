const User = require("../models/User");

// =======================
// PUT /settings/theme
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
// PUT /settings/notifications
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
// PUT /settings/reminder
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
