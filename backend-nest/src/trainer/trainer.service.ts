import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { JoinTrainerDto } from './dto/join-trainer.dto';
import { SendInviteDto } from './dto/send-invite.dto';

@Injectable()
export class TrainerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  // ─── Invite ────────────────────────────────────────────────────────────────

  async sendInvite(trainerId: string, dto: SendInviteDto) {
    const { email, message, expiresInDays = 7 } = dto;

    const trainer = await this.prisma.user.findUnique({
      where: { id: trainerId },
      select: { name: true },
    });

    if (!trainer) throw new NotFoundException('Trainer not found');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Math.max(1, expiresInDays));

    // Reuse existing pending invite for the same email
    const existing = await this.prisma.trainerInvite.findFirst({
      where: { trainerId, traineeEmail: email, status: 'PENDING', expiresAt: { gt: new Date() } },
      select: { inviteCode: true, expiresAt: true },
    });

    if (existing) {
      await this.emailService.sendTrainerInviteEmail(email, trainer.name, existing.inviteCode, message);
      return { message: `Invite code sent to ${email}`, expiresAt: existing.expiresAt };
    }

    const invite = await this.prisma.trainerInvite.create({
      data: { trainerId, traineeEmail: email, message: message ?? null, expiresAt },
      select: { inviteCode: true, expiresAt: true },
    });

    try {
      await this.emailService.sendTrainerInviteEmail(email, trainer.name, invite.inviteCode, message);
    } catch {
      // Roll back the invite if email fails
      await this.prisma.trainerInvite.delete({ where: { inviteCode: invite.inviteCode } });
      throw new InternalServerErrorException(
        'Failed to send invite email. Please check the email address and try again.',
      );
    }

    return { message: `Invite code sent to ${email}`, expiresAt: invite.expiresAt };
  }

  async joinTrainer(traineeId: string, dto: JoinTrainerDto) {
    const trainee = await this.prisma.user.findUnique({
      where: { id: traineeId },
      select: { id: true, email: true, trainerId: true },
    });

    if (!trainee) throw new NotFoundException('User not found');
    if (trainee.trainerId) throw new ConflictException('You already have a trainer');

    const invite = await this.prisma.trainerInvite.findUnique({
      where: { inviteCode: dto.code },
    });

    if (!invite || invite.status !== 'PENDING' || invite.expiresAt <= new Date()) {
      throw new BadRequestException('Invalid or expired invite code');
    }

    if (invite.traineeEmail.toLowerCase() !== trainee.email.toLowerCase()) {
      throw new ForbiddenException('This invite is not for your email');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedTrainee = await tx.user.update({
        where: { id: traineeId },
        data: { trainerId: invite.trainerId },
        select: { id: true, name: true, email: true, trainerId: true },
      });

      await tx.trainerInvite.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED', traineeId },
      });

      return updatedTrainee;
    });

    return { message: 'Joined trainer successfully', trainee: result };
  }

  // ─── Trainees ──────────────────────────────────────────────────────────────

  async getTrainees(trainerId: string) {
    const trainees = await this.prisma.user.findMany({
      where: { trainerId, role: UserRole.TRAINEE },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        profilePicture: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return { trainees };
  }

  // ─── Plan summaries ────────────────────────────────────────────────────────

  async getTraineePlans(trainerId: string, traineeId: string) {
    await this.verifyTraineeOwnership(trainerId, traineeId);

    const [mealPlan, workoutPlan] = await Promise.all([
      this.prisma.mealPlan.findUnique({
        where: { userId: traineeId },
        include: { mealDays: { select: { id: true } } },
      }),
      this.prisma.workoutPlan.findUnique({
        where: { userId: traineeId },
        include: { workoutDays: { select: { id: true } } },
      }),
    ]);

    return {
      mealPlan: mealPlan
        ? { id: mealPlan.id, name: mealPlan.name, daysCount: mealPlan.mealDays.length }
        : null,
      workoutPlan: workoutPlan
        ? { id: workoutPlan.id, name: workoutPlan.name, daysCount: workoutPlan.workoutDays.length }
        : null,
    };
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private async verifyTraineeOwnership(trainerId: string, traineeId: string) {
    const trainee = await this.prisma.user.findFirst({
      where: { id: traineeId, trainerId, role: UserRole.TRAINEE },
    });
    if (!trainee) throw new NotFoundException('Trainee not found or not assigned to you');
    return trainee;
  }
}
