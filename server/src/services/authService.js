const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
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

// Register user (only as TRAINEE by default)
async function registerUser(name, email, password, phone = null) {
  try {
    // Check if email already exists in any user table
    const existingTrainee = await prisma.trainee.findUnique({
      where: { email },
    });

    const existingTrainer = await prisma.trainer.findUnique({
      where: { email },
    });

    const existingAdmin = await prisma.admin.findUnique({
      where: { email },
    });

    if (existingTrainee || existingTrainer || existingAdmin) {
      throw new Error("Email already registered");
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create trainee (no trainer assigned yet, only admin can assign)
    const trainee = await prisma.trainee.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        role: "TRAINEE",
        // trainerId is optional now, so trainee can register without a trainer
      },
    });

    // Generate token
    const token = generateToken(trainee.id, "TRAINEE");

    return {
      success: true,
      message:
        "Trainee registered successfully. Awaiting trainer assignment from admin.",
      token,
      user: {
        id: trainee.id,
        name: trainee.name,
        email: trainee.email,
        role: "TRAINEE",
      },
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

// Login user (role-based detection)
async function loginUser(email, password, role) {
  try {
    if (!role || !["TRAINEE", "TRAINER", "ADMIN"].includes(role)) {
      throw new Error(
        "Invalid role. Please specify 'TRAINEE', 'TRAINER', or 'ADMIN'"
      );
    }

    let user;
    let userRole;

    if (role === "TRAINEE") {
      user = await prisma.trainee.findUnique({
        where: { email },
      });
      userRole = "TRAINEE";
    } else if (role === "TRAINER") {
      user = await prisma.trainer.findUnique({
        where: { email },
      });
      userRole = "TRAINER";
    } else if (role === "ADMIN") {
      user = await prisma.admin.findUnique({
        where: { email },
      });
      userRole = "ADMIN";
    }

    if (!user) {
      throw new Error("Invalid email or password");
    }

    // Compare password
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      throw new Error("Invalid email or password");
    }

    // Generate token
    const token = generateToken(user.id, userRole);

    return {
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: userRole,
      },
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

// Admin assigns trainee to trainer (only callable by admin)
async function assignTraineeToTrainer(traineeId, trainerId) {
  try {
    // Verify trainee exists
    const trainee = await prisma.trainee.findUnique({
      where: { id: traineeId },
    });

    if (!trainee) {
      throw new Error("Trainee not found");
    }

    // Verify trainer exists
    const trainer = await prisma.trainer.findUnique({
      where: { id: trainerId },
    });

    if (!trainer) {
      throw new Error("Trainer not found");
    }

    // Assign trainee to trainer
    const updatedTrainee = await prisma.trainee.update({
      where: { id: traineeId },
      data: {
        trainerId: trainerId,
      },
      include: {
        trainer: true,
      },
    });

    return {
      success: true,
      message: "Trainee assigned to trainer successfully",
      trainee: updatedTrainee,
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
  assignTraineeToTrainer,
};
