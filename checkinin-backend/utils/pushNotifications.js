const { Expo } = require("expo-server-sdk");
const User = require("../models/User");

let expo = new Expo();

/**
 * Given an array of { userId, token, title, body } objects, pushes the notifications
 * through Expo's chunking algorithm and deletes any tokens that report DeviceNotRegistered.
 */
exports.sendPushNotifications = async (messages) => {
    let notifications = [];

    // Filter and format notifications
    for (let msg of messages) {
        if (!Expo.isExpoPushToken(msg.token)) {
            console.error(`Push token ${msg.token} is not a valid Expo push token`);
            continue;
        }

        notifications.push({
            to: msg.token,
            sound: "default",
            title: msg.title,
            body: msg.body,
            data: msg.data || {},
            // Custom ID allowing us to map back to the DB to delete invalid tokens
            userId: msg.userId
        });
    }

    if (notifications.length === 0) return;

    let chunks = expo.chunkPushNotifications(notifications);
    let tickets = [];

    // Send chunks
    for (let chunk of chunks) {
        try {
            let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            tickets.push(...ticketChunk);
        } catch (error) {
            console.error("Error sending push notification chunk", error);
        }
    }

    // Process receipts to catch DeviceNotRegistered errors
    let invalidTokens = [];

    // We only iterate up to tickets length and map them to the original notifications
    for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        if (ticket.status === 'error') {
            if (ticket.details && ticket.details.error === 'DeviceNotRegistered') {
                // The token is dead, we must remove it from the database to stop spamming it.
                // We use the same index because expo chunk arrays return 1:1 mapping sync.
                const failedUserId = notifications[i].userId;
                invalidTokens.push(failedUserId);
            }
        }
    }

    // Clean up dead tokens from our DB
    if (invalidTokens.length > 0) {
        try {
            await User.updateMany(
                { userId: { $in: invalidTokens } },
                { $set: { expoPushToken: "" } }
            );
            console.log(`Cleaned up ${invalidTokens.length} dead push tokens.`);
        } catch (error) {
            console.error("Failed to clean up dead tokens", error);
        }
    }
};
