const express = require("express");
const cors = require("cors");
const path = require("path");
const authRoutes = require("./routes/authRoutes");
const trainerRoutes = require("./routes/trainerRoutes");
const catalogRoutes = require("./routes/catalogRoutes");
const planRoutes = require("./routes/planRoutes");
const historyRoutes = require("./routes/historyRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const userRoutes = require("./routes/userRoutes");
const authMiddleware = require("./middleware/authMiddleware");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static images
const frontendPath = path.join(__dirname, "../../frontend/assets/images");
app.use("/images", express.static(frontendPath));

// Serve uploaded files (profile pictures, etc.)
const uploadsPath = path.join(__dirname, "../uploads");
app.use("/uploads", express.static(uploadsPath));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api", trainerRoutes);
app.use("/api/catalog", catalogRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/user", userRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
