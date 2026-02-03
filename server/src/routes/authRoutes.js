const express = require("express");
const { registerUser, loginUser, verifyEmailToken } = require("../services/authService");
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
    return res.status(401).json({
      success: false,
      message: error.message,
    });
  }
});

// Validate token endpoint
router.get("/validate", authenticateToken, (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Token is valid",
      user: req.user,
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
        trainee: {
          include: {
            trainer: true,
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

    // Prepare user response with trainer info if trainee
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    if (user.role === "TRAINEE" && user.trainee) {
      userResponse.trainerId = user.trainee.trainerId;
      if (user.trainee.trainer) {
        userResponse.trainer = {
          id: user.trainee.trainer.id,
          name: user.trainee.trainer.name,
        };
      }
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

module.exports = router;
