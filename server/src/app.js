const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const trainerRoutes = require("./routes/trainerRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api", trainerRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
