const express = require("express");
const prisma = require("../../prisma/prisma");
const { authenticateToken, isTrainer, isTrainee } = require("../middleware/authMiddleware");
const { sendTrainerInviteEmail } = require("../services/emailService");

const router = express.Router();

// POST /trainer/invites (trainer only)
router.post("/trainer/invites", authenticateToken, isTrainer, async (req, res) => {
  try {
    const { email, message, expiresInDays } = req.body || {};

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Trainee email is required",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const expiresAt = new Date();
    const days = Number.isFinite(Number(expiresInDays)) ? Number(expiresInDays) : 7;
    expiresAt.setDate(expiresAt.getDate() + Math.max(1, days));

    // Get trainer info
    const trainer = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { name: true },
    });

    // Check for existing pending invite
    const existingInvite = await prisma.trainerInvite.findFirst({
      where: {
        trainerId: req.user.id,
        traineeEmail: normalizedEmail,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
      select: { inviteCode: true, expiresAt: true },
    });

    if (existingInvite) {
      // Resend email with existing code
      try {
        await sendTrainerInviteEmail(normalizedEmail, trainer.name, existingInvite.inviteCode, message);
      } catch (emailError) {
        console.error("Failed to resend invite email:", emailError);
        return res.status(500).json({
          success: false,
          message: "Failed to send invite email. Please try again.",
        });
      }

      return res.status(200).json({
        success: true,
        message: `Invite code sent to ${normalizedEmail}`,
        expiresAt: existingInvite.expiresAt,
      });
    }

    // Create new invite
    const invite = await prisma.trainerInvite.create({
      data: {
        trainerId: req.user.id,
        traineeEmail: normalizedEmail,
        message: message ? String(message) : null,
        expiresAt,
      },
      select: { inviteCode: true, expiresAt: true },
    });

    // Send invite email to trainee
    try {
      await sendTrainerInviteEmail(normalizedEmail, trainer.name, invite.inviteCode, message);
    } catch (emailError) {
      console.error("Failed to send invite email:", emailError);
      // Delete the invite since email failed
      await prisma.trainerInvite.delete({
        where: { inviteCode: invite.inviteCode },
      });
      return res.status(500).json({
        success: false,
        message: "Failed to send invite email. Please check the email address and try again.",
      });
    }

    return res.status(201).json({
      success: true,
      message: `Invite code sent to ${normalizedEmail}`,
      expiresAt: invite.expiresAt,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create invite",
    });
  }
});

// POST /trainee/join (trainee only)
router.post("/trainee/join", authenticateToken, isTrainee, async (req, res) => {
  try {
    const { code } = req.body || {};

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Invite code is required",
      });
    }

    const trainee = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, trainerId: true, role: true },
    });

    if (!trainee) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (trainee.trainerId) {
      return res.status(409).json({
        success: false,
        message: "You already have a trainer",
      });
    }

    const invite = await prisma.trainerInvite.findUnique({
      where: { inviteCode: String(code) },
    });

    if (!invite || invite.status !== "PENDING" || invite.expiresAt <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired invite code",
      });
    }

    if (invite.traineeEmail.toLowerCase() !== trainee.email.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: "This invite is not for your email",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: trainee.id },
        data: { trainerId: invite.trainerId },
        select: { id: true, name: true, email: true, trainerId: true },
      });

      await tx.trainerInvite.update({
        where: { id: invite.id },
        data: { status: "ACCEPTED", traineeId: trainee.id },
      });

      return updatedUser;
    });

    return res.status(200).json({
      success: true,
      message: "Joined trainer successfully",
      trainee: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to join trainer",
    });
  }
});

// GET /trainer/trainees (trainer only)
router.get("/trainer/trainees", authenticateToken, isTrainer, async (req, res) => {
  try {
    const trainees = await prisma.user.findMany({
      where: { trainerId: req.user.id, role: "TRAINEE" },
      select: { id: true, name: true, email: true, phone: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      trainees,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch trainees",
    });
  }
});

// GET /trainer/trainee/:traineeId/plans (trainer only)
router.get("/trainer/trainee/:traineeId/plans", authenticateToken, isTrainer, async (req, res) => {
  try {
    const { traineeId } = req.params;

    // Verify trainee belongs to this trainer
    const trainee = await prisma.user.findFirst({
      where: { id: traineeId, trainerId: req.user.id, role: "TRAINEE" },
    });

    if (!trainee) {
      return res.status(404).json({ error: "Trainee not found" });
    }

    // Get meal plan summary
    const mealPlan = await prisma.mealPlan.findUnique({
      where: { userId: traineeId },
      include: {
        mealDays: {
          select: { id: true },
        },
      },
    });

    // Get workout plan summary
    const workoutPlan = await prisma.workoutPlan.findUnique({
      where: { userId: traineeId },
      include: {
        workoutDays: {
          select: { id: true },
        },
      },
    });

    res.json({
      mealPlan: mealPlan
        ? { id: mealPlan.id, name: mealPlan.name, daysCount: mealPlan.mealDays.length }
        : null,
      workoutPlan: workoutPlan
        ? { id: workoutPlan.id, name: workoutPlan.name, daysCount: workoutPlan.workoutDays.length }
        : null,
    });
  } catch (error) {
    console.error("Error fetching trainee plans:", error);
    res.status(500).json({ error: "Failed to fetch plans" });
  }
});

// GET /trainer/trainee/:traineeId/meal-plan (trainer only)
router.get("/trainer/trainee/:traineeId/meal-plan", authenticateToken, isTrainer, async (req, res) => {
  try {
    const { traineeId } = req.params;

    // Verify trainee belongs to this trainer
    const trainee = await prisma.user.findFirst({
      where: { id: traineeId, trainerId: req.user.id, role: "TRAINEE" },
    });

    if (!trainee) {
      return res.status(404).json({ error: "Trainee not found" });
    }

    const mealPlan = await prisma.mealPlan.findUnique({
      where: { userId: traineeId },
      include: {
        mealDays: {
          include: {
            meals: {
              include: {
                food: true,
              },
            },
          },
          orderBy: { dayOfWeek: "asc" },
        },
      },
    });

    res.json(mealPlan);
  } catch (error) {
    console.error("Error fetching meal plan:", error);
    res.status(500).json({ error: "Failed to fetch meal plan" });
  }
});

// POST /trainer/trainee/:traineeId/meal-plan (trainer only)
router.post("/trainer/trainee/:traineeId/meal-plan", authenticateToken, isTrainer, async (req, res) => {
  try {
    const { traineeId } = req.params;
    const { name, mealDays } = req.body;

    // Verify trainee belongs to this trainer
    const trainee = await prisma.user.findFirst({
      where: { id: traineeId, trainerId: req.user.id, role: "TRAINEE" },
    });

    if (!trainee) {
      return res.status(404).json({ error: "Trainee not found" });
    }

    // Check if plan already exists
    const existing = await prisma.mealPlan.findUnique({
      where: { userId: traineeId },
    });

    if (existing) {
      return res.status(400).json({ error: "Meal plan already exists. Use PUT to update." });
    }

    // Create meal plan with days and meals
    const mealPlan = await prisma.mealPlan.create({
      data: {
        name,
        userId: traineeId,
        mealDays: {
          create: mealDays.map((day) => ({
            dayOfWeek: day.dayOfWeek,
            meals: {
              create: day.meals.map((meal) => ({
                foodId: meal.foodId,
                quantity: meal.quantity,
                mealTime: meal.mealTime,
                description: meal.description || null,
              })),
            },
          })),
        },
      },
    });

    res.json(mealPlan);
  } catch (error) {
    console.error("Error creating meal plan:", error);
    res.status(500).json({ error: "Failed to create meal plan" });
  }
});

// PUT /trainer/trainee/:traineeId/meal-plan (trainer only)
router.put("/trainer/trainee/:traineeId/meal-plan", authenticateToken, isTrainer, async (req, res) => {
  try {
    const { traineeId } = req.params;
    const { name, mealDays } = req.body;

    // Verify trainee belongs to this trainer
    const trainee = await prisma.user.findFirst({
      where: { id: traineeId, trainerId: req.user.id, role: "TRAINEE" },
    });

    if (!trainee) {
      return res.status(404).json({ error: "Trainee not found" });
    }

    // Delete existing meal days and recreate them
    await prisma.mealDay.deleteMany({
      where: { mealPlan: { userId: traineeId } },
    });

    // Update or create meal plan
    const mealPlan = await prisma.mealPlan.upsert({
      where: { userId: traineeId },
      create: {
        name,
        userId: traineeId,
        mealDays: {
          create: mealDays.map((day) => ({
            dayOfWeek: day.dayOfWeek,
            meals: {
              create: day.meals.map((meal) => ({
                foodId: meal.foodId,
                quantity: meal.quantity,
                mealTime: meal.mealTime,
                description: meal.description || null,
              })),
            },
          })),
        },
      },
      update: {
        name,
        mealDays: {
          create: mealDays.map((day) => ({
            dayOfWeek: day.dayOfWeek,
            meals: {
              create: day.meals.map((meal) => ({
                foodId: meal.foodId,
                quantity: meal.quantity,
                mealTime: meal.mealTime,
                description: meal.description || null,
              })),
            },
          })),
        },
      },
    });

    res.json(mealPlan);
  } catch (error) {
    console.error("Error updating meal plan:", error);
    res.status(500).json({ error: "Failed to update meal plan" });
  }
});

// GET /trainer/trainee/:traineeId/workout-plan (trainer only)
router.get("/trainer/trainee/:traineeId/workout-plan", authenticateToken, isTrainer, async (req, res) => {
  try {
    const { traineeId } = req.params;

    // Verify trainee belongs to this trainer
    const trainee = await prisma.user.findFirst({
      where: { id: traineeId, trainerId: req.user.id, role: "TRAINEE" },
    });

    if (!trainee) {
      return res.status(404).json({ error: "Trainee not found" });
    }

    const workoutPlan = await prisma.workoutPlan.findUnique({
      where: { userId: traineeId },
      include: {
        workoutDays: {
          include: {
            exercises: {
              include: {
                exercise: true,
              },
            },
          },
          orderBy: { dayOfWeek: "asc" },
        },
      },
    });

    res.json(workoutPlan);
  } catch (error) {
    console.error("Error fetching workout plan:", error);
    res.status(500).json({ error: "Failed to fetch workout plan" });
  }
});

// POST /trainer/trainee/:traineeId/workout-plan (trainer only)
router.post("/trainer/trainee/:traineeId/workout-plan", authenticateToken, isTrainer, async (req, res) => {
  try {
    const { traineeId } = req.params;
    const { name, workoutDays } = req.body;

    // Verify trainee belongs to this trainer
    const trainee = await prisma.user.findFirst({
      where: { id: traineeId, trainerId: req.user.id, role: "TRAINEE" },
    });

    if (!trainee) {
      return res.status(404).json({ error: "Trainee not found" });
    }

    // Check if plan already exists
    const existing = await prisma.workoutPlan.findUnique({
      where: { userId: traineeId },
    });

    if (existing) {
      return res.status(400).json({ error: "Workout plan already exists. Use PUT to update." });
    }

    // Create workout plan with days and exercises
    const workoutPlan = await prisma.workoutPlan.create({
      data: {
        name,
        userId: traineeId,
        workoutDays: {
          create: workoutDays.map((day) => ({
            dayOfWeek: day.dayOfWeek,
            description: day.description || null,
            exercises: {
              create: day.exercises.map((exercise) => ({
                exerciseId: exercise.exerciseId,
                sets: exercise.sets,
                reps: exercise.reps,
                weight: exercise.weight || null,
                restTime: exercise.restTime || null,
              })),
            },
          })),
        },
      },
    });

    res.json(workoutPlan);
  } catch (error) {
    console.error("Error creating workout plan:", error);
    res.status(500).json({ error: "Failed to create workout plan" });
  }
});

// PUT /trainer/trainee/:traineeId/workout-plan (trainer only)
router.put("/trainer/trainee/:traineeId/workout-plan", authenticateToken, isTrainer, async (req, res) => {
  try {
    const { traineeId } = req.params;
    const { name, workoutDays } = req.body;

    // Verify trainee belongs to this trainer
    const trainee = await prisma.user.findFirst({
      where: { id: traineeId, trainerId: req.user.id, role: "TRAINEE" },
    });

    if (!trainee) {
      return res.status(404).json({ error: "Trainee not found" });
    }

    // Delete existing workout days and recreate them
    await prisma.workoutDay.deleteMany({
      where: { workoutPlan: { userId: traineeId } },
    });

    // Update or create workout plan
    const workoutPlan = await prisma.workoutPlan.upsert({
      where: { userId: traineeId },
      create: {
        name,
        userId: traineeId,
        workoutDays: {
          create: workoutDays.map((day) => ({
            dayOfWeek: day.dayOfWeek,
            description: day.description || null,
            exercises: {
              create: day.exercises.map((exercise) => ({
                exerciseId: exercise.exerciseId,
                sets: exercise.sets,
                reps: exercise.reps,
                weight: exercise.weight || null,
                restTime: exercise.restTime || null,
              })),
            },
          })),
        },
      },
      update: {
        name,
        workoutDays: {
          create: workoutDays.map((day) => ({
            dayOfWeek: day.dayOfWeek,
            description: day.description || null,
            exercises: {
              create: day.exercises.map((exercise) => ({
                exerciseId: exercise.exerciseId,
                sets: exercise.sets,
                reps: exercise.reps,
                weight: exercise.weight || null,
                restTime: exercise.restTime || null,
              })),
            },
          })),
        },
      },
    });

    res.json(workoutPlan);
  } catch (error) {
    console.error("Error updating workout plan:", error);
    res.status(500).json({ error: "Failed to update workout plan" });
  }
});

// DELETE /trainer/trainee/:traineeId/meal-plan (trainer only)
router.delete("/trainer/trainee/:traineeId/meal-plan", authenticateToken, isTrainer, async (req, res) => {
  try {
    const { traineeId } = req.params;

    // Verify trainee belongs to this trainer
    const trainee = await prisma.user.findFirst({
      where: { id: traineeId, trainerId: req.user.id, role: "TRAINEE" },
    });

    if (!trainee) {
      return res.status(404).json({ error: "Trainee not found" });
    }

    // Delete meal plan (cascade will handle mealDays and meals)
    await prisma.mealPlan.delete({
      where: { userId: traineeId },
    });

    res.json({ success: true, message: "Meal plan deleted successfully" });
  } catch (error) {
    console.error("Error deleting meal plan:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Meal plan not found" });
    }
    res.status(500).json({ error: "Failed to delete meal plan" });
  }
});

// DELETE /trainer/trainee/:traineeId/workout-plan (trainer only)
router.delete("/trainer/trainee/:traineeId/workout-plan", authenticateToken, isTrainer, async (req, res) => {
  try {
    const { traineeId } = req.params;

    // Verify trainee belongs to this trainer
    const trainee = await prisma.user.findFirst({
      where: { id: traineeId, trainerId: req.user.id, role: "TRAINEE" },
    });

    if (!trainee) {
      return res.status(404).json({ error: "Trainee not found" });
    }

    // Delete workout plan (cascade will handle workoutDays and exercises)
    await prisma.workoutPlan.delete({
      where: { userId: traineeId },
    });

    res.json({ success: true, message: "Workout plan deleted successfully" });
  } catch (error) {
    console.error("Error deleting workout plan:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Workout plan not found" });
    }
    res.status(500).json({ error: "Failed to delete workout plan" });
  }
});

module.exports = router;