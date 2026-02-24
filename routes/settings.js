const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const settingsController = require("../controllers/settingsController");

router.put("/theme", auth, settingsController.updateTheme);
router.put("/notifications", auth, settingsController.updateNotifications);
router.put("/reminder", auth, settingsController.updateReminder);

module.exports = router;
