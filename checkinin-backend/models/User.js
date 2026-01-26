const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
  },
  checkIns: {
    type: [String],
    default: [],
  },
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
      enum: ["circle", "private"],
      default: "circle",
    },
  },
});

module.exports = mongoose.model("User", UserSchema);

