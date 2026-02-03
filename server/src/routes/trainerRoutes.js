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

module.exports = router;