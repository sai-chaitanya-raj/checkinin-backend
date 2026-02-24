const express = require("express");
const auth = require("../middleware/auth");
const friendController = require("../controllers/friendController");

const router = express.Router();

// Friend Management
router.get("/", auth, friendController.getFriendData);
router.get("/feed", auth, friendController.getCircleFeed);
router.delete("/remove", auth, friendController.removeFriend);

// Friend Requests
router.post("/request", auth, friendController.sendRequest);
router.post("/respond", auth, friendController.respondRequest);

// Search
router.get("/search/:publicId", auth, friendController.searchByPublicId);

module.exports = router;
