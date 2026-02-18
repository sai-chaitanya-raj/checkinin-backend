const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  userId: {
    type: String,
    unique: true,
    required: true,
  },

  email: {
    type: String,
    unique: true,
    sparse: true,
  },

  authProvider: {
    type: String, // "google" | "phone"
    required: true,
  },

  checkIns: [
    {
      date: { type: String, required: true },
      mood: { type: String, enum: ["great", "okay", "bad"], default: "okay" },
      timestamp: { type: Date, default: Date.now }
    }
  ],

  circle: {
    type: [String],
    default: [],
  },

  settings: {
    reminderEnabled: {
      type: Boolean,
      default: true,
    },
    reminderTime: {
      type: String,
      default: "09:00",
    },
    visibility: {
      type: String,
      default: "circle",
    },
    theme: {
      type: String,
      enum: ["light", "dark", "system"],
      default: "system",
    },
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("User", UserSchema);
