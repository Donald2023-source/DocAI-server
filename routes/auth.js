import { Router } from "express";
import jwt from "jsonwebtoken";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "docai_jwt_dev_secret_key_2026";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";

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

/* ==========================================================================
   GOOGLE OAUTH 2.0 FLOW
   ========================================================================== */

/**
 * GET /api/auth/google
 * Redirects user to Google OAuth consent screen
 */
router.get("/google", (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    // If not configured, redirect back to frontend with a clear notice
    return res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent("Google Client ID not configured in server .env")}`);
  }

  const redirectUri = `${BACKEND_URL}/api/auth/google/callback`;
  const scope = encodeURIComponent("openid email profile");
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=select_account`;

  return res.redirect(googleAuthUrl);
});

/**
 * GET /api/auth/google/callback
 * Exchanges auth code for Google user profile and issues JWT
 */
router.get("/google/callback", async (req, res) => {
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent(error || "Google authorization was cancelled.")}`);
  }

  try {
    const redirectUri = `${BACKEND_URL}/api/auth/google/callback`;

    // 1. Exchange authorization code for access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      throw new Error(tokenData.error_description || "Failed to exchange token with Google.");
    }

    // 2. Fetch real user profile from Google
    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileResponse.json();

    // 3. Create or find user in system
    const userPayload = {
      id: "usr_google_" + profile.sub,
      email: profile.email,
      name: profile.name || profile.email.split("@")[0],
      avatar: profile.picture,
      provider: "google",
      role: "user",
    };

    // 4. Issue application JWT
    const appToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: "7d" });

    // 5. Redirect back to frontend with session token
    return res.redirect(`${FRONTEND_URL}/login?token=${appToken}&email=${encodeURIComponent(userPayload.email)}&name=${encodeURIComponent(userPayload.name)}`);
  } catch (err) {
    console.error("Google OAuth error:", err);
    return res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent(err.message || "Failed to authenticate with Google.")}`);
  }
});

/* ==========================================================================
   GITHUB OAUTH 2.0 FLOW
   ========================================================================== */

/**
 * GET /api/auth/github
 * Redirects user to GitHub OAuth authorization screen
 */
router.get("/github", (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent("GitHub Client ID not configured in server .env")}`);
  }

  const redirectUri = `${BACKEND_URL}/api/auth/github/callback`;
  const scope = encodeURIComponent("read:user user:email");
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}`;

  return res.redirect(githubAuthUrl);
});

/**
 * GET /api/auth/github/callback
 * Exchanges auth code for GitHub user profile and issues JWT
 */
router.get("/github/callback", async (req, res) => {
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent(error || "GitHub authorization was cancelled.")}`);
  }

  try {
    // 1. Exchange authorization code for access token
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || tokenData.error) {
      throw new Error(tokenData.error_description || "Failed to exchange token with GitHub.");
    }

    // 2. Fetch real user profile from GitHub
    const profileResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "User-Agent": "DocAI-Server",
      },
    });
    const profile = await profileResponse.json();

    // 3. GitHub users can have private emails; fetch email endpoint if needed
    let email = profile.email;
    if (!email) {
      const emailsResponse = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "User-Agent": "DocAI-Server",
        },
      });
      const emails = await emailsResponse.json();
      const primaryEmail = Array.isArray(emails) ? emails.find((e) => e.primary && e.verified) : null;
      email = primaryEmail ? primaryEmail.email : `${profile.login}@users.noreply.github.com`;
    }

    const userPayload = {
      id: "usr_github_" + profile.id,
      email,
      name: profile.name || profile.login,
      avatar: profile.avatar_url,
      provider: "github",
      role: "user",
    };

    // 4. Issue application JWT
    const appToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: "7d" });

    // 5. Redirect back to frontend with session token
    return res.redirect(`${FRONTEND_URL}/login?token=${appToken}&email=${encodeURIComponent(userPayload.email)}&name=${encodeURIComponent(userPayload.name)}`);
  } catch (err) {
    console.error("GitHub OAuth error:", err);
    return res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent(err.message || "Failed to authenticate with GitHub.")}`);
  }
});

export default router;
