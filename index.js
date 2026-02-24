const config = require("./config");
config.validateEnv();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth");
const friendRoutes = require("./routes/friends");
const profileRoutes = require("./routes/profile");
const checkinRoutes = require("./routes/checkin");
const historyRoutes = require("./routes/history");
const emotionalPresenceRoutes = require("./routes/emotionalPresence");
const errorHandler = require("./middleware/errorHandler");
const scheduler = require("./services/scheduler");
const { startReminderCron } = require("./cron/reminderJob");

const app = express();

app.use(helmet());
app.use(morgan(config.env === "development" ? "dev" : "combined"));
app.use(express.json());

const corsOptions = {
    origin: config.env === "development" ? true : process.env.CORS_ORIGIN || false,
    credentials: true,
};
app.use(cors(corsOptions));

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { success: false, message: "Too many attempts, try again later" },
});
app.use("/auth", authLimiter);

const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100,
});
app.use("/", apiLimiter);

app.get("/health", (req, res) => {
    res.json({ success: true, status: "ok", timestamp: new Date().toISOString() });
});

// Root route handler for Render deployment
app.get("/", (req, res) => {
    res.json({ success: true, message: "Welcome to CheckInIn API" });
});

app.use("/auth", authRoutes);
app.use("/friends", friendRoutes);
app.use("/profile", profileRoutes);
app.use("/checkin", checkinRoutes);
app.use("/history", historyRoutes);
app.use("/emotional-presence", emotionalPresenceRoutes);

app.use((req, res) => {
    res.status(404).json({ success: false, message: "Route not found" });
});

app.use(errorHandler);

let server;

mongoose
    .connect(config.mongoUri)
    .then(() => {
        console.log("MongoDB Connected");
        scheduler.start();
        startReminderCron(); // Start the daily push notifications cron daemon
        server = app.listen(config.port, () => {
            console.log(`Server running on http://localhost:${config.port}`);
        });
    })
    .catch((err) => {
        console.error("MongoDB connection error:", err);
        process.exit(1);
    });

function gracefulShutdown(signal) {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server?.close(() => {
        console.log("HTTP server closed.");
        mongoose.connection.close(false).then(() => {
            console.log("MongoDB connection closed.");
            process.exit(0);
        });
    });
    setTimeout(() => {
        console.error("Forced shutdown");
        process.exit(1);
    }, 10000);
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
