const express = require("express");
const { body } = require("express-validator");
const { register, login, getMe } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const emailPasswordRules = [
  body("email").isEmail().withMessage("Please provide a valid email"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
];

const registerValidation = [
  body("name").notEmpty().withMessage("Name is required"),
  ...emailPasswordRules,
  body("phone").optional().matches(/^[6-9]\d{9}$/).withMessage("Please provide a valid 10-digit phone number"),
];

router.post("/register/:role", registerValidation, register);
router.post("/login/:role", emailPasswordRules, login);
router.get("/me", protect, getMe);

module.exports = router;
