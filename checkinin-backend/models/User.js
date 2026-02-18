const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  userId: {
    type: String,
    unique: true,
    required: true,
  },

  publicId: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
  },

  name: {
    type: String,
    trim: true,
  },

  age: {
    type: Number,
  },

  email: {
    type: String,
    unique: true,
  },

  password: {
    type: String,
    select: false, // Don't return by default
  },

  avatar: {
    type: String,
    default: "",
  },

  authProvider: {
    type: String, // "google" | "email"
    required: true,
    default: "email",
  },

  friends: [{ type: String }], // Array of userIds

  friendRequests: {
    sent: [{ type: String }], // Array of userIds
    received: [{ type: String }], // Array of userIds
  },

  checkIns: [
    {
      date: { type: String, required: true },
      mood: { type: String, enum: ["great", "okay", "bad"], default: "okay" },
      timestamp: { type: Date, default: Date.now }
    }
  ],

  settings: {
    theme: { type: String, default: "system" },
    reminderEnabled: { type: Boolean, default: true },
    visibility: { type: String, default: "circle" }
  },

  circle: {
    type: [String],
    default: [],
  },
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
