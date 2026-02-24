const cron = require("node-cron");
const User = require("../models/User");
const { Expo } = require("expo-server-sdk");

// Initialize Expo SDK
const expo = new Expo();

// Schedule task to run every hour at minute 0
cron.schedule("0 * * * *", async () => {
    console.log(`[Scheduler] Checking for reminders at ${new Date().toISOString()}`);

    try {
        const now = new Date();
        const currentHour = now.getHours(); // 0-23
        const todayDateStr = now.toISOString().split('T')[0]; // "YYYY-MM-DD"

        // 1. Find users who:
        //    - Have reminderEnabled: true
        //    - Have reminderTime matching current hour
        //    - Have expoPushToken (implied check later or in query)
        //    - Have NOT checked in today

        // Since reminderTime is a string "HH:MM", we can filter by startsWith(`${currentHour}:`)
        // NOTE: This assumes server time aligns with user timezone expectation or simple "server time" logic.
        // For a real app, storing timezone is critical. Here we assume server time or simple hour match.

        const hourString = currentHour.toString().padStart(2, '0');

        const usersToRemind = await User.find({
            "settings.reminderEnabled": true,
            "settings.reminderTime": { $regex: `^${hourString}:` },
            "expoPushToken": { $exists: true, $ne: "" },
            // Check if checkIns array does NOT contain today's date
            // This is complex in Mongo query alone efficiently without aggregate, 
            // but we can filter in JS for simplicity or use $elemMatch with $ne
        });

        const notifications = [];

        for (const user of usersToRemind) {
            // Double check if checked in today
            const hasCheckedIn = user.checkIns.some(c => c.date === todayDateStr);

            if (!hasCheckedIn) {
                if (Expo.isExpoPushToken(user.expoPushToken)) {
                    notifications.push({
                        to: user.expoPushToken,
                        sound: 'default',
                        title: "Time to Check-in! 📝",
                        body: "How are you feeling today? Tap to record your mood.",
                        data: { route: "/(tabs)/index" }
                    });
                }
            }
        }

        if (notifications.length > 0) {
            const chunks = expo.chunkPushNotifications(notifications);
            for (const chunk of chunks) {
                try {
                    await expo.sendPushNotificationsAsync(chunk);
                    console.log(`[Scheduler] Sent ${chunk.length} reminders`);
                } catch (error) {
                    console.error("[Scheduler] Error sending chunk:", error);
                }
            }
        } else {
            console.log("[Scheduler] No reminders needed this hour.");
        }

    } catch (error) {
        console.error("[Scheduler] Error running job:", error);
    }
});

module.exports = {
    start: () => console.log("[Scheduler] Service started")
};
