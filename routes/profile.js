const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const profileController = require("../controllers/profileController");
const { upload } = require("../utils/cloudinary");

// Profile Routes
router.get("/me", auth, profileController.getProfile);
router.put("/update", auth, profileController.updateProfile);
router.put("/privacy", auth, profileController.updatePrivacy);
router.put("/change-password", auth, profileController.changePassword);
router.delete("/delete", auth, profileController.deleteAccount);

// Merged Settings Routes
router.put("/settings/theme", auth, profileController.updateTheme);
router.put("/settings/notifications", auth, profileController.updateNotifications);
router.put("/settings/reminder", auth, profileController.updateReminder);
router.put("/push-token", auth, profileController.updatePushToken);

// Bio Route
router.put("/bio", auth, profileController.updateBio);

// Avatar Routes (Expects form-data with field name 'avatar')
router.put("/avatar", auth, upload.single("avatar"), profileController.updateAvatar);
router.delete("/avatar", auth, profileController.deleteAvatar);

// Public Profile Route (Must be last to avoid catching hardcoded routes like /me)
router.get("/:publicId", auth, profileController.getPublicProfile);

module.exports = router;
