const User = require("../models/User");
const PasswordResetToken = require("../models/PasswordResetToken");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper: Generate Public ID
const generatePublicId = async () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let isUnique = false;
    let publicId = "";
    while (!isUnique) {
        publicId = "CIN_";
        for (let i = 0; i < 6; i++) {
            publicId += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const existing = await User.findOne({ publicId });
        if (!existing) isUnique = true;
    }
    return publicId;
};

// =======================
// POST /auth/signup
// =======================
exports.signup = async (req, res) => {
    try {
        const { email, password, name, age } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "User already exists" });
        }

        const publicId = await generatePublicId();
        const hashedPassword = await bcrypt.hash(password, 12);
        const userId = crypto.randomUUID(); // Valid unique ID for our system

        const user = new User({
            userId,
            email,
            password: hashedPassword,
            name,
            age,
            publicId,
            authProvider: "email"
        });

        await user.save();

        const token = jwt.sign({ userId: user.userId }, process.env.JWT_SECRET, { expiresIn: "30d" });

        res.status(201).json({
            success: true,
            token,
            user: { userId, publicId, email, name, age }
        });
    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({ success: false, message: "Signup failed" });
    }
};

// =======================
// POST /auth/login
// =======================
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select("+password");
        if (!user) {
            return res.status(400).json({ success: false, message: "No account found with this email." });
        }
        if (user.authProvider === "google") {
            return res.status(400).json({ success: false, message: "This account uses Google sign-in. Please use Continue with Google instead." });
        }
        if (!user.password) {
            return res.status(400).json({ success: false, message: "This account uses Google sign-in. Please use Continue with Google instead." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Incorrect password." });
        }

        const token = jwt.sign({ userId: user.userId }, process.env.JWT_SECRET, { expiresIn: "30d" });

        res.json({
            success: true,
            token,
            user: {
                userId: user.userId,
                publicId: user.publicId,
                email: user.email,
                name: user.name,
                authProvider: user.authProvider
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ success: false, message: "Login failed" });
    }
};

// =======================
// POST /auth/google
// =======================
exports.googleAuth = async (req, res) => {
    try {
        const { token } = req.body;
        let email, googleId, name, picture;

        if (req.body.accessToken) {
            const tokenInfo = await client.getTokenInfo(req.body.accessToken);
            // Need to fetch user profile for name/picture if using access token
            const profile = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${req.body.accessToken}`).then(r => r.json());
            email = profile.email;
            googleId = profile.id;
            name = profile.name;
            picture = profile.picture;
        } else if (token) {
            const ticket = await client.verifyIdToken({
                idToken: token,
                audience: [process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_ANDROID_CLIENT_ID],
            });
            const payload = ticket.getPayload();
            email = payload.email;
            googleId = payload.sub;
            name = payload.name;
            picture = payload.picture;
        } else {
            return res.status(400).json({ success: false, message: "Token required" });
        }

        let user = await User.findOne({ email });

        if (!user) {
            const publicId = await generatePublicId();
            user = new User({
                userId: googleId,
                email,
                name,
                avatar: picture,
                authProvider: "google",
                publicId
            });
            await user.save();
        }

        const jwtToken = jwt.sign({ userId: user.userId }, process.env.JWT_SECRET, { expiresIn: "30d" });

        res.json({
            success: true,
            token: jwtToken,
            user: {
                userId: user.userId,
                email: user.email,
                publicId: user.publicId,
                name: user.name,
                authProvider: user.authProvider
            },
        });
    } catch (error) {
        console.error("Google auth error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Helper: Send password reset email via Gmail or configured SMTP
async function sendResetEmail(email, resetToken) {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:19006";
    const resetLink = `${frontendUrl}/auth/reset-password?token=${resetToken}`;

    let transporter;

    // Gmail: use smtp.gmail.com with App Password (enable 2FA, then create App Password at myaccount.google.com)
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
        transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD,
            },
        });
    } else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT, 10) || 587,
            secure: process.env.SMTP_SECURE === "true",
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    if (transporter) {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.GMAIL_USER || "noreply@checkinin.app",
            to: email,
            subject: "CheckInIn - Reset Your Password",
            text: `Reset your password: ${resetLink}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, ignore this email.`,
            html: `
                <div style="font-family: sans-serif; max-width: 500px;">
                    <h2>Reset Your Password</h2>
                    <p>Click the link below to reset your CheckInIn password:</p>
                    <p><a href="${resetLink}" style="color: #6C63FF; font-weight: bold;">Reset Password</a></p>
                    <p style="color: #666;">Or copy this link: ${resetLink}</p>
                    <p style="color: #999; font-size: 12px;">This link expires in 1 hour.</p>
                    <p style="color: #999; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
                </div>
            `,
        });
    } else {
        console.log(`[Password Reset] SMTP not configured. Link for ${email}: ${resetLink}`);
    }
}

// =======================
// POST /auth/forgot-password
// =======================
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        if (user.authProvider !== "email") {
            return res.status(400).json({ success: false, message: "Use Google sign-in for this account" });
        }

        const resetToken = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        await PasswordResetToken.create({ email, token: resetToken, expiresAt });
        await sendResetEmail(email, resetToken);

        res.json({ success: true, message: "Password reset link sent to email" });
    } catch (error) {
        console.error("Forgot password error:", error);
        res.status(500).json({ success: false, message: "Failed to send reset email" });
    }
};

// =======================
// POST /auth/reset-password
// =======================
exports.resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        const resetRecord = await PasswordResetToken.findOne({ token });

        if (!resetRecord || resetRecord.expiresAt < new Date()) {
            return res.status(400).json({ success: false, message: "Invalid or expired reset token" });
        }

        const user = await User.findOne({ email: resetRecord.email }).select("+password");
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        user.password = await bcrypt.hash(newPassword, 12);
        await user.save();
        await PasswordResetToken.deleteOne({ token });

        res.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ success: false, message: "Failed to reset password" });
    }
};
