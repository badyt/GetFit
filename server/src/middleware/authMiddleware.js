const { verifyToken } = require("../services/authService");

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token is required",
      });
    }

    const decoded = verifyToken(token);
    req.user = decoded; // Attach user info to request
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: error.message,
    });
  }
}

// Middleware to check if user is a trainer
function isTrainer(req, res, next) {
  if (req.user.role !== "TRAINER") {
    return res.status(403).json({
      success: false,
      message: "Only trainers can access this resource",
    });
  }
  next();
}

// Middleware to check if user is a trainee
function isTrainee(req, res, next) {
  if (req.user.role !== "TRAINEE") {
    return res.status(403).json({
      success: false,
      message: "Only trainees can access this resource",
    });
  }
  next();
}

// Middleware to check if user is an admin
function isAdmin(req, res, next) {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Only admins can access this resource",
    });
  }
  next();
}

module.exports = {
  authenticateToken,
  isTrainer,
  isTrainee,
  isAdmin,
};
