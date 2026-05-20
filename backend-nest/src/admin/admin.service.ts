import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { CreateFoodDto } from './dto/create-food.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Stats ──────────────────────────────────────────────────────────────────

  async getStats() {
    const [totalUsers, trainers, trainees, admins, foods, exercises, categories] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { role: UserRole.TRAINER } }),
        this.prisma.user.count({ where: { role: UserRole.TRAINEE } }),
        this.prisma.user.count({ where: { role: UserRole.ADMIN } }),
        this.prisma.food.count(),
        this.prisma.exercise.count(),
        this.prisma.exerciseCategory.count(),
      ]);

    return { totalUsers, trainers, trainees, admins, foods, exercises, categories };
  }

  // ─── Users ──────────────────────────────────────────────────────────────────

  async getUsers(query: AdminUsersQueryDto) {
    const where: Prisma.UserWhereInput = {};

    if (query.role) where.role = query.role;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        profilePicture: true,
        isEmailVerified: true,
        createdAt: true,
        trainerId: true,
        trainer: { select: { id: true, name: true } },
        _count: { select: { trainees: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async promoteUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, name: true },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.role !== UserRole.TRAINEE) {
      throw new BadRequestException(`Cannot promote — user is already a ${user.role}`);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { role: UserRole.TRAINER, trainerId: null },
      select: { id: true, name: true, email: true, role: true },
    });

    return { message: `${updated.name} promoted to TRAINER`, user: updated };
  }

  async deleteUser(adminId: string, targetId: string) {
    if (adminId === targetId) {
      throw new BadRequestException('You cannot delete yourself');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, name: true, role: true },
    });

    if (!user) throw new NotFoundException('User not found');

    // onDelete: SetNull on the trainer relation handles trainee unlinking automatically.
    // onDelete: Cascade handles their history, plans, and invites.
    await this.prisma.user.delete({ where: { id: targetId } });

    return { message: `${user.name} (${user.role}) deleted successfully` };
  }

  // ─── Foods ──────────────────────────────────────────────────────────────────

  async getFoods() {
    return this.prisma.food.findMany({ orderBy: { name: 'asc' } });
  }

  async createFood(dto: CreateFoodDto, imageUrl: string | null) {
    const existing = await this.prisma.food.findFirst({
      where: { name: { equals: dto.name.trim(), mode: 'insensitive' } },
    });
    if (existing) throw new ConflictException(`A food named "${dto.name}" already exists`);

    return this.prisma.food.create({
      data: {
        name: dto.name.trim(),
        caloriesPer100g: dto.caloriesPer100g,
        proteinPer100g: dto.proteinPer100g,
        image: imageUrl,
      },
    });
  }

  async deleteFood(id: string) {
    const food = await this.prisma.food.findUnique({ where: { id } });
    if (!food) throw new NotFoundException('Food not found');

    // Cascades to MealDayFood — removes this food from all trainee meal plans
    await this.prisma.food.delete({ where: { id } });
    return { message: `${food.name} deleted` };
  }

  // ─── Exercise categories ────────────────────────────────────────────────────

  async getCategories() {
    return this.prisma.exerciseCategory.findMany({
      select: {
        id: true,
        name: true,
        _count: { select: { exercises: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  // ─── Exercises ──────────────────────────────────────────────────────────────

  async getExercises() {
    return this.prisma.exercise.findMany({
      include: { category: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createExercise(dto: CreateExerciseDto, imageUrl: string | null) {
    if (!dto.categoryId && !dto.categoryName) {
      throw new BadRequestException('Either categoryId or categoryName must be provided');
    }

    let resolvedCategoryId = dto.categoryId;

    if (!resolvedCategoryId && dto.categoryName) {
      const category = await this.prisma.exerciseCategory.upsert({
        where: { name: dto.categoryName.trim() },
        update: {},
        create: { name: dto.categoryName.trim() },
      });
      resolvedCategoryId = category.id;
    }

    const existing = await this.prisma.exercise.findFirst({
      where: {
        name: { equals: dto.name.trim(), mode: 'insensitive' },
        categoryId: resolvedCategoryId,
      },
    });
    if (existing) {
      throw new ConflictException(`An exercise named "${dto.name}" already exists in this category`);
    }

    return this.prisma.exercise.create({
      data: {
        name: dto.name.trim(),
        description: dto.description ?? null,
        image: imageUrl,
        categoryId: resolvedCategoryId!,
      },
      include: { category: { select: { id: true, name: true } } },
    });
  }

  async deleteExercise(id: string) {
    const exercise = await this.prisma.exercise.findUnique({ where: { id } });
    if (!exercise) throw new NotFoundException('Exercise not found');

    // Cascades to WorkoutDayExercise — removes this exercise from all trainee workout plans
    await this.prisma.exercise.delete({ where: { id } });
    return { message: `${exercise.name} deleted` };
  }
}
