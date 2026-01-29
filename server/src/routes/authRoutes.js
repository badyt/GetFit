const express = require("express");
const { registerUser, loginUser, assignTraineeToTrainer } = require("../services/authService");
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

// Login endpoint (role-based)
router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Validate input
    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Email, password, and role are required",
      });
    }

    const result = await loginUser(email, password, role);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message,
    });
  }
});

// Assign trainee to trainer (ADMIN ONLY)
router.post("/assign-trainee", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { traineeId, trainerId } = req.body;

    if (!traineeId || !trainerId) {
      return res.status(400).json({
        success: false,
        message: "traineeId and trainerId are required",
      });
    }

    const result = await assignTraineeToTrainer(traineeId, trainerId);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
