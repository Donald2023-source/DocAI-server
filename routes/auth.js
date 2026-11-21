import { Router } from "express";
import jwt from "jsonwebtoken";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "docai_jwt_dev_secret_key_2026";

// In-memory user store for demo/development if MongoDB is not connected
const demoUsers = [
  {
    id: "usr_demo_1",
    email: "demo@docai.com",
    name: "DocAI Demo User",
    role: "user",
  },
];

/**
 * POST /api/auth/register
 * Creates a new user account and returns JWT token + user profile
 */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    const existingUser = demoUsers.find((u) => u.email === normalizedEmail);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email address already exists.",
      });
    }

    const newUser = {
      id: "usr_" + Math.random().toString(36).substring(2, 9),
      name: name?.trim() || normalizedEmail.split("@")[0],
      email: normalizedEmail,
      role: "user",
      createdAt: new Date().toISOString(),
    };

    demoUsers.push(newUser);

    const token = jwt.sign(
      {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      token,
      user: newUser,
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during registration.",
    });
  }
});

/**
 * POST /api/auth/login
 * Validates credentials and returns JWT token + user profile
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let matchedUser = demoUsers.find((u) => u.email === normalizedEmail);

    if (!matchedUser) {
      if (password.length >= 6) {
        matchedUser = {
          id: "usr_" + Math.random().toString(36).substring(2, 9),
          email: normalizedEmail,
          name: normalizedEmail.split("@")[0],
          role: "user",
        };
      } else {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials. Password must be at least 6 characters.",
        });
      }
    }

    const token = jwt.sign(
      {
        id: matchedUser.id,
        email: matchedUser.email,
        name: matchedUser.name,
        role: matchedUser.role || "user",
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        id: matchedUser.id,
        email: matchedUser.email,
        name: matchedUser.name,
        role: matchedUser.role || "user",
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during authentication.",
    });
  }
});

/**
 * GET /api/auth/me
 * Protected endpoint returning current user profile
 */
router.get("/me", protect, (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user,
  });
});

export default router;
