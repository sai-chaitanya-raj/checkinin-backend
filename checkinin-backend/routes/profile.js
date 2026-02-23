const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const profileController = require("../controllers/profileController");
const multer = require("multer");

// Configure multer for memory storage (for Cloudinary upload)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

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

// Avatar Route (Expects form-data with field name 'avatar')
router.put("/avatar", auth, upload.single("avatar"), profileController.uploadAvatar);

// Public Profile Route (Must be last to avoid catching hardcoded routes like /me)
router.get("/:publicId", auth, profileController.getPublicProfile);

module.exports = router;
