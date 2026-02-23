const cron = require("node-cron");
const User = require("../models/User");
const { sendPushNotifications } = require("../utils/pushNotifications");

const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

dayjs.extend(utc);
dayjs.extend(timezone);

const startReminderCron = () => {
    // Run every 5 minutes
    cron.schedule("*/5 * * * *", async () => {
        try {
            // Find users who have enabled reminders and have push tokens
            const users = await User.find({
                "settings.reminderEnabled": true,
                expoPushToken: { $exists: true, $ne: "" },
            });

            if (users.length === 0) return;

            const pushMessages = [];

            for (const user of users) {
                // Determine user's current local time
                const userTz = user.timezone || "UTC";
                let userTime;

                try {
                    userTime = dayjs().tz(userTz);
                } catch (e) {
                    // Fallback to UTC if timezone string is invalid
                    userTime = dayjs().tz("UTC");
                }

                // E.g., "12:00"
                const reminderTimeStr = user.settings?.reminderTime || "12:00";
                const [reminderHour, reminderMinute] = reminderTimeStr.split(":").map(Number);

                // Create a dayjs object for today's reminder time in the user's timezone
                const targetReminderTime = userTime.clone().hour(reminderHour).minute(reminderMinute).second(0);

                // Check if the current time has bypassed the reminder threshold
                if (userTime.isAfter(targetReminderTime) || userTime.isSame(targetReminderTime, 'minute')) {
                    const todayStr = userTime.format("YYYY-MM-DD");

                    // Did we already send a reminder today?
                    const lastSent = user.lastReminderSent;
                    let alreadySentToday = false;
                    if (lastSent) {
                        try {
                            const lastSentTz = dayjs(lastSent).tz(userTz);
                            if (lastSentTz.format("YYYY-MM-DD") === todayStr) {
                                alreadySentToday = true;
                            }
                        } catch (e) {
                            // If invalid date parsing, assume not sent
                        }
                    }

                    if (alreadySentToday) continue;

                    // Did the user check-in today? Check user.checkIns
                    const hasCheckedInToday = user.checkIns.some(ci => {
                        // Ci defaults to user local date format "YYYY-MM-DD"
                        return ci.date === todayStr;
                    });

                    if (!hasCheckedInToday) {
                        pushMessages.push({
                            userId: user.userId,
                            token: user.expoPushToken,
                            title: "Don't break your streak 🔥",
                            body: "You haven't checked in today. Stay consistent.",
                        });

                        // Immediately flag the user so we don't duplicate on the next 5 min sweep
                        user.lastReminderSent = new Date(); // Stores UTC DB format
                        await user.save();
                    }
                }
            }

            // Dispatch pushes in batches
            if (pushMessages.length > 0) {
                await sendPushNotifications(pushMessages);
                console.log(`[Cron] Sent ${pushMessages.length} daily reminders`);
            }

        } catch (error) {
            console.error("Cron Reminder Job failed", error);
        }
    });
};

module.exports = { startReminderCron };
