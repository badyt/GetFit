const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const prisma = require("../../prisma/prisma");
const { generateVerificationToken, sendVerificationEmail, sendWelcomeEmail, VERIFICATION_EMAIL_EXPIRY } = require("./emailService");

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
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error("Email already registered");
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Generate verification token
    const verificationToken = generateVerificationToken();
    const verificationExpires = new Date(Date.now() + VERIFICATION_EMAIL_EXPIRY);

    // Create user with verification token
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        role,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      },
    });

    // Send verification email
    const verificationLink = `${process.env.APP_URL || "http://localhost:3000"}/verify-email?token=${verificationToken}`;
    
    try {
      await sendVerificationEmail(email, name, verificationToken, verificationLink);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      // Don't fail registration if email fails, just log it
    }

    // Generate token
    const token = generateToken(user.id, user.role);

    return {
      success: true,
      message: "User registered successfully. Please check your email to verify your account.",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
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
      include: {
        trainer: true, // Get trainer info if user is a trainee
      },
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

    // Prepare user response
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    // Add trainer info if user has a trainer (is a trainee)
    if (user.trainerId && user.trainer) {
      userResponse.trainerId = user.trainerId;
      userResponse.trainer = {
        id: user.trainer.id,
        name: user.trainer.name,
      };
    }

    return {
      success: true,
      message: "Login successful",
      token,
      user: userResponse,
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

// Verify email using verification token
async function verifyEmailToken(verificationToken) {
  try {
    const user = await prisma.user.findUnique({
      where: { emailVerificationToken: verificationToken },
    });

    if (!user) {
      throw new Error("Invalid verification token");
    }

    // Check if token has expired
    if (user.emailVerificationExpires && user.emailVerificationExpires < new Date()) {
      throw new Error("Verification token has expired");
    }

    // Mark email as verified
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    // Send welcome email
    try {
      await sendWelcomeEmail(updatedUser.email, updatedUser.name);
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
    }

    return {
      success: true,
      message: "Email verified successfully",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        isEmailVerified: updatedUser.isEmailVerified,
      },
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  registerUser,
  loginUser,
  verifyEmailToken,
};
