const express = require("express");
const { registerUser, loginUser } = require("../services/authService");
const { authenticateToken, isAdmin } = require("../middleware/authMiddleware");

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

module.exports = router;
