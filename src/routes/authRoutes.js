import { Router } from "express";
import rateLimit from "express-rate-limit";
import { body } from "express-validator";

import { registerUser } from "../controllers/authController.js";
import validate from "../middleware/validate.js";

const router = Router();

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many registration attempts. Please try again later.",
  },
});

const registerRules = [
  body("name")
    .isString().withMessage("Name is required")
    .bail()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage("Name must be between 2 and 50 characters"),
  body("email")
    .isString().withMessage("Email is required")
    .bail()
    .trim()
    .isEmail().withMessage("Please provide a valid email address")
    .bail()
    .normalizeEmail(),
  body("password")
    .isString().withMessage("Password is required")
    .bail()
    .isLength({ min: 8, max: 72 }).withMessage("Password must be between 8 and 72 characters")
    .bail()
    .matches(/[a-z]/).withMessage("Password must contain a lowercase letter")
    .bail()
    .matches(/[A-Z]/).withMessage("Password must contain an uppercase letter")
    .bail()
    .matches(/\d/).withMessage("Password must contain a number"),
  body("confirmPassword")
    .optional()
    .custom((value, { req }) => value === req.body.password)
    .withMessage("Passwords do not match"),
];

router.post("/register", registerLimiter, registerRules, validate, registerUser);

export default router;
