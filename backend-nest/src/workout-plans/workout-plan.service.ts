import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkoutPlanDto } from './dto/create-workout-plan.dto';

@Injectable()
export class WorkoutPlanService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Trainee ────────────────────────────────────────────────────────────────

  async getMyWorkoutPlan(traineeId: string) {
    return this.prisma.workoutPlan.findUnique({
      where: { userId: traineeId },
      include: {
        workoutDays: {
          include: { exercises: { include: { exercise: true } } },
          orderBy: { dayOfWeek: 'asc' },
        },
      },
    });
  }

  async getMyWorkoutDay(traineeId: string, dayOfWeek: number) {
    const workoutPlan = await this.prisma.workoutPlan.findUnique({ where: { userId: traineeId } });
    if (!workoutPlan) return null;

    return this.prisma.workoutDay.findUnique({
      where: { workoutPlanId_dayOfWeek: { workoutPlanId: workoutPlan.id, dayOfWeek } },
      include: { exercises: { include: { exercise: true } } },
    });
  }

  // ─── Trainer ────────────────────────────────────────────────────────────────

  async getWorkoutPlan(trainerId: string, traineeId: string) {
    await this.verifyTraineeOwnership(trainerId, traineeId);
    return this.getMyWorkoutPlan(traineeId);
  }

  async createWorkoutPlan(trainerId: string, traineeId: string, dto: CreateWorkoutPlanDto) {
    await this.verifyTraineeOwnership(trainerId, traineeId);

    const existing = await this.prisma.workoutPlan.findUnique({ where: { userId: traineeId } });
    if (existing) throw new BadRequestException('Workout plan already exists. Use PUT to update.');

    return this.prisma.workoutPlan.create({
      data: {
        name: dto.name,
        userId: traineeId,
        workoutDays: { create: this.buildWorkoutDaysInput(dto) },
      },
    });
  }

  async replaceWorkoutPlan(trainerId: string, traineeId: string, dto: CreateWorkoutPlanDto) {
    await this.verifyTraineeOwnership(trainerId, traineeId);

    return this.prisma.$transaction(async (tx) => {
      await tx.workoutDay.deleteMany({ where: { workoutPlan: { userId: traineeId } } });

      return tx.workoutPlan.upsert({
        where: { userId: traineeId },
        create: {
          name: dto.name,
          userId: traineeId,
          workoutDays: { create: this.buildWorkoutDaysInput(dto) },
        },
        update: {
          name: dto.name,
          workoutDays: { create: this.buildWorkoutDaysInput(dto) },
        },
      });
    });
  }

  async deleteWorkoutPlan(trainerId: string, traineeId: string) {
    await this.verifyTraineeOwnership(trainerId, traineeId);

    try {
      await this.prisma.workoutPlan.delete({ where: { userId: traineeId } });
      return { message: 'Workout plan deleted successfully' };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Workout plan not found');
      }
      throw error;
    }
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  private async verifyTraineeOwnership(trainerId: string, traineeId: string) {
    const trainee = await this.prisma.user.findFirst({
      where: { id: traineeId, trainerId, role: UserRole.TRAINEE },
    });
    if (!trainee) throw new NotFoundException('Trainee not found or not assigned to you');
    return trainee;
  }

  private buildWorkoutDaysInput(dto: CreateWorkoutPlanDto) {
    return dto.workoutDays.map((day) => ({
      dayOfWeek: day.dayOfWeek,
      description: day.description ?? null,
      exercises: {
        create: day.exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight ?? null,
          restTime: ex.restTime ?? null,
        })),
      },
    }));
  }
}
