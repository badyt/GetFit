const express = require("express");
const { registerUser, loginUser, verifyEmailToken, resendVerificationCode, verifyCodeAndLogin } = require("../services/authService");
const { authenticateToken, isAdmin } = require("../middleware/authMiddleware");
const prisma = require("../../prisma/prisma");

const router = express.Router();

// Register endpoint (only register as TRAINEE)
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required",
      });
    }

    const result = await registerUser(name, email, password, phone);
    return res.status(201).json(result);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Login endpoint (only email and password)
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const result = await loginUser(email, password);
    return res.status(200).json(result);
  } catch (error) {
    // Handle different error codes
    if (error.code === "USER_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        code: "USER_NOT_FOUND",
        message: error.message,
      });
    }

    if (error.code === "INVALID_PASSWORD") {
      return res.status(401).json({
        success: false,
        code: "INVALID_PASSWORD",
        message: error.message,
      });
    }

    if (error.code === "EMAIL_NOT_VERIFIED") {
      return res.status(403).json({
        success: false,
        code: "EMAIL_NOT_VERIFIED",
        message: error.message,
        email: error.email,
        name: error.name,
      });
    }

    return res.status(401).json({
      success: false,
      message: error.message,
    });
  }
});

// Validate token endpoint
router.get("/validate", authenticateToken, async (req, res) => {
  try {
    // Fetch full user data from database
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        trainer: {
          select: {
            id: true,
            name: true,
            profilePicture: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    return res.status(200).json({
      success: true,
      message: "Token is valid",
      user: userWithoutPassword,
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Token validation failed",
    });
  }
});

// Get current user endpoint
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        trainer: true, // Get trainer info if user is a trainee
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prepare user response
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture,
      createdAt: user.createdAt,
      isEmailVerified: user.isEmailVerified,
    };

    // Add trainer info if user has a trainer (is a trainee)
    if (user.trainerId && user.trainer) {
      userResponse.trainerId = user.trainerId;
      userResponse.trainer = {
        id: user.trainer.id,
        name: user.trainer.name,
        profilePicture: user.trainer.profilePicture,
      };
    }

    return res.status(200).json({
      success: true,
      message: "User retrieved successfully",
      user: userResponse,
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Failed to retrieve user",
    });
  }
});

// Verify email endpoint
router.post("/verify-email", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Verification token is required",
      });
    }

    const result = await verifyEmailToken(token);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Resend verification code endpoint
router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const result = await resendVerificationCode(email);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Verify code and login endpoint
router.post("/verify-code-login", async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: "Email and verification code are required",
      });
    }

    const result = await verifyCodeAndLogin(email, code);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Health check endpoint for Docker
router.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

module.exports = router;
