const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const authController = require("../controllers/authController");
const { validate } = require("../middleware/validation");

const signupValidation = [
    body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    body("name").trim().notEmpty().withMessage("Name is required"),
];

const loginValidation = [
    body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
    body("password").notEmpty().withMessage("Password is required"),
];

const forgotValidation = [
    body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
];

const resetValidation = [
    body("token").notEmpty().withMessage("Reset token is required"),
    body("newPassword").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
];

router.post("/signup", validate(signupValidation), authController.signup);
router.post("/login", validate(loginValidation), authController.login);
router.post("/google", authController.googleAuth);
router.post("/forgot-password", validate(forgotValidation), authController.forgotPassword);
router.post("/reset-password", validate(resetValidation), authController.resetPassword);

module.exports = router;
