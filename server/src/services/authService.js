const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const prisma = require("../../prisma/prisma");
const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key_change_this";

// Hash password
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

// Compare password
async function comparePassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}

// Generate JWT token
function generateToken(id, role) {
  return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: "7d" });
}

// Register user (with optional role, defaults to TRAINEE)
async function registerUser(name, email, password, phone = null, role = "TRAINEE") {
  try {
    // Check if email already exists
    console.log(prisma);
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error("Email already registered");
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        role,
      },
    });

    // Generate token
    const token = generateToken(user.id, user.role);

    return {
      success: true,
      message: "User registered successfully.",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

// Login user (only by email and password)
async function loginUser(email, password) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error("Invalid email or password");
    }

    // Compare password
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      throw new Error("Invalid email or password");
    }

    // Generate token
    const token = generateToken(user.id, user.role);

    return {
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

// Verify JWT token
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  registerUser,
  loginUser,
};
