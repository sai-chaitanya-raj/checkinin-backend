const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  userId: {
    type: String,
    unique: true,
    required: true,
  },

  // Auth (required for email signup/login)
  email: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true,
    index: true,
  },
  password: {
    type: String,
    select: false,
    minlength: 6,
  },
  authProvider: {
    type: String,
    enum: ["email", "google"],
    default: "email",
  },

  // Identity
  publicId: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
    trim: true,
    uppercase: true
  },
  name: { type: String, trim: true },
  bio: { type: String, maxlength: 120, default: "" },
  age: { type: Number },
  avatar: { type: String, default: "" },
  expoPushToken: { type: String },
  timezone: { type: String, default: "UTC" },
  lastReminderSent: { type: Date },

  // Social
  friends: { type: [String], default: [] }, // Array of userIds
  friendRequests: {
    sent: { type: [String], default: [] },
    received: { type: [String], default: [] },
  },

  // Content
  dailyThoughts: [
    {
      date: { type: String, required: true },
      thought: { type: String, required: true, maxlength: 400 },
      timestamp: { type: Date, default: Date.now },
    },
  ],
  checkIns: [
    {
      date: { type: String, required: true },
      mood: { type: String, enum: ["great", "okay", "bad"], default: "okay" },
      timestamp: { type: Date, default: Date.now }
    }
  ],

  // Preferences & Privacy
  privacy: {
    profileVisibility: { type: String, enum: ["public", "friends", "private"], default: "public" },
    checkinVisibility: { type: String, enum: ["public", "friends", "private"], default: "friends" },
    friendRequestPermission: { type: String, enum: ["everyone", "friends_of_friends", "nobody"], default: "everyone" },
    searchable: { type: Boolean, default: true },
    showLastSeen: { type: Boolean, default: true }
  },

  settings: {
    theme: { type: String, enum: ["light", "dark", "system"], default: "system" },
    reminderEnabled: { type: Boolean, default: true },
    reminderTime: { type: String, default: "20:00" }, // 24h format
    notifications: {
      checkIns: { type: Boolean, default: true },
      friendRequests: { type: Boolean, default: true },
      updates: { type: Boolean, default: false }
    }
  },

  // Legacy (Keep for migration safety if needed, can be deprecated)
  circle: { type: [String], default: [] },

}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
