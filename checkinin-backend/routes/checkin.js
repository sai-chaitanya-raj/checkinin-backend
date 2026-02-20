const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const auth = require("../middleware/auth");
const User = require("../models/User");
const { validate } = require("../middleware/validation");

const checkinValidation = [
    body("date").matches(/^\d{4}-\d{2}-\d{2}$/).withMessage("Date must be YYYY-MM-DD"),
    body("mood").optional().isIn(["great", "okay", "bad"]).withMessage("Mood must be great, okay, or bad"),
];

router.post("/", auth, validate(checkinValidation), async (req, res, next) => {
    try {
        const { date, mood } = req.body;
        const user = req.user;

        const existingCheckIn = user.checkIns.find((c) => c.date === date);

        if (!existingCheckIn) {
            user.checkIns.push({
                date,
                mood: mood || "okay",
                timestamp: new Date(),
            });
        } else {
            existingCheckIn.mood = mood || existingCheckIn.mood;
        }
        await user.save();

        res.json({ success: true, data: user.checkIns });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
