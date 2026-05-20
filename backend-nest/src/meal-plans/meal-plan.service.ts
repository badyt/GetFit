import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMealPlanDto } from './dto/create-meal-plan.dto';

@Injectable()
export class MealPlanService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Trainee ────────────────────────────────────────────────────────────────

  async getMyMealPlan(traineeId: string) {
    return this.prisma.mealPlan.findUnique({
      where: { userId: traineeId },
      include: {
        mealDays: {
          include: { meals: { include: { food: true } } },
          orderBy: { dayOfWeek: 'asc' },
        },
      },
    });
  }

  async getMyMealDay(traineeId: string, dayOfWeek: number) {
    const mealPlan = await this.prisma.mealPlan.findUnique({ where: { userId: traineeId } });
    if (!mealPlan) return null;

    return this.prisma.mealDay.findUnique({
      where: { mealPlanId_dayOfWeek: { mealPlanId: mealPlan.id, dayOfWeek } },
      include: { meals: { include: { food: true } } },
    });
  }

  // ─── Trainer ────────────────────────────────────────────────────────────────

  async getMealPlan(trainerId: string, traineeId: string) {
    await this.verifyTraineeOwnership(trainerId, traineeId);
    return this.getMyMealPlan(traineeId);
  }

  async createMealPlan(trainerId: string, traineeId: string, dto: CreateMealPlanDto) {
    await this.verifyTraineeOwnership(trainerId, traineeId);

    const existing = await this.prisma.mealPlan.findUnique({ where: { userId: traineeId } });
    if (existing) throw new BadRequestException('Meal plan already exists. Use PUT to update.');

    return this.prisma.mealPlan.create({
      data: {
        name: dto.name,
        userId: traineeId,
        mealDays: { create: this.buildMealDaysInput(dto) },
      },
    });
  }

  async replaceMealPlan(trainerId: string, traineeId: string, dto: CreateMealPlanDto) {
    await this.verifyTraineeOwnership(trainerId, traineeId);

    return this.prisma.$transaction(async (tx) => {
      await tx.mealDay.deleteMany({ where: { mealPlan: { userId: traineeId } } });

      return tx.mealPlan.upsert({
        where: { userId: traineeId },
        create: {
          name: dto.name,
          userId: traineeId,
          mealDays: { create: this.buildMealDaysInput(dto) },
        },
        update: {
          name: dto.name,
          mealDays: { create: this.buildMealDaysInput(dto) },
        },
      });
    });
  }

  async deleteMealPlan(trainerId: string, traineeId: string) {
    await this.verifyTraineeOwnership(trainerId, traineeId);

    try {
      await this.prisma.mealPlan.delete({ where: { userId: traineeId } });
      return { message: 'Meal plan deleted successfully' };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Meal plan not found');
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

  private buildMealDaysInput(dto: CreateMealPlanDto) {
    return dto.mealDays.map((day) => ({
      dayOfWeek: day.dayOfWeek,
      meals: {
        create: day.meals.map((meal) => ({
          foodId: meal.foodId,
          quantity: meal.quantity,
          mealTime: meal.mealTime,
          description: meal.description ?? null,
        })),
      },
    }));
  }
}
