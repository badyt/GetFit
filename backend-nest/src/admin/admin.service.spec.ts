import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';

const ADMIN_ID = 'admin-1';
const USER_ID = 'user-1';

const mockPrisma = {
  user: {
    count: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  food: {
    count: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  exercise: {
    count: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  exerciseCategory: {
    count: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
};

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(AdminService);
    jest.clearAllMocks();
  });

  // ─── getStats ──────────────────────────────────────────────────────────────

  describe('getStats', () => {
    it('returns aggregate counts in parallel', async () => {
      mockPrisma.user.count.mockResolvedValue(10);
      mockPrisma.food.count.mockResolvedValue(50);
      mockPrisma.exercise.count.mockResolvedValue(100);
      mockPrisma.exerciseCategory.count.mockResolvedValue(8);

      const result = await service.getStats();

      expect(result).toMatchObject({ totalUsers: 10, foods: 50, exercises: 100, categories: 8 });
    });
  });

  // ─── promoteUser ───────────────────────────────────────────────────────────

  describe('promoteUser', () => {
    it('throws NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.promoteUser(USER_ID)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when user is already a TRAINER', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: USER_ID, role: UserRole.TRAINER, name: 'Bob' });
      await expect(service.promoteUser(USER_ID)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when user is already an ADMIN', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: USER_ID, role: UserRole.ADMIN, name: 'Admin' });
      await expect(service.promoteUser(USER_ID)).rejects.toThrow(BadRequestException);
    });

    it('promotes trainee to trainer and clears trainerId', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: USER_ID, role: UserRole.TRAINEE, name: 'Alice' });
      mockPrisma.user.update.mockResolvedValue({
        id: USER_ID,
        name: 'Alice',
        email: 'alice@example.com',
        role: UserRole.TRAINER,
      });

      const result = await service.promoteUser(USER_ID);

      expect(result.user.role).toBe(UserRole.TRAINER);
      expect(result.message).toContain('TRAINER');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { role: UserRole.TRAINER, trainerId: null } }),
      );
    });
  });

  // ─── deleteUser ────────────────────────────────────────────────────────────

  describe('deleteUser', () => {
    it('throws BadRequestException when admin tries to delete themselves', async () => {
      await expect(service.deleteUser(ADMIN_ID, ADMIN_ID)).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when target user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.deleteUser(ADMIN_ID, USER_ID)).rejects.toThrow(NotFoundException);
    });

    it('deletes the user and returns confirmation message', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: USER_ID, name: 'Alice', role: UserRole.TRAINEE });
      mockPrisma.user.delete.mockResolvedValue({});

      const result = await service.deleteUser(ADMIN_ID, USER_ID);
      expect(result.message).toContain('deleted');
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: USER_ID } });
    });
  });

  // ─── createFood ────────────────────────────────────────────────────────────

  describe('createFood', () => {
    const dto = { name: 'Oatmeal', caloriesPer100g: 350, proteinPer100g: 13 };

    it('throws ConflictException when food name already exists', async () => {
      mockPrisma.food.findFirst.mockResolvedValue({ id: 'f1', name: 'Oatmeal' });
      await expect(service.createFood(dto, null)).rejects.toThrow(ConflictException);
      expect(mockPrisma.food.create).not.toHaveBeenCalled();
    });

    it('creates food without image', async () => {
      mockPrisma.food.findFirst.mockResolvedValue(null);
      mockPrisma.food.create.mockResolvedValue({ id: 'f1', name: 'Oatmeal', image: null });

      const result = await service.createFood(dto, null);
      expect(result.name).toBe('Oatmeal');
      expect(mockPrisma.food.create).toHaveBeenCalledTimes(1);
    });

    it('creates food with image URL', async () => {
      mockPrisma.food.findFirst.mockResolvedValue(null);
      mockPrisma.food.create.mockResolvedValue({ id: 'f1', name: 'Oatmeal', image: '/uploads/food/img.jpg' });

      const result = await service.createFood(dto, '/uploads/food/img.jpg');
      expect(result.image).toBe('/uploads/food/img.jpg');
    });
  });

  // ─── deleteFood ────────────────────────────────────────────────────────────

  describe('deleteFood', () => {
    it('throws NotFoundException when food not found', async () => {
      mockPrisma.food.findUnique.mockResolvedValue(null);
      await expect(service.deleteFood('f-unknown')).rejects.toThrow(NotFoundException);
    });

    it('deletes food and returns confirmation', async () => {
      mockPrisma.food.findUnique.mockResolvedValue({ id: 'f1', name: 'Oatmeal' });
      mockPrisma.food.delete.mockResolvedValue({});
      const result = await service.deleteFood('f1');
      expect(result.message).toContain('Oatmeal');
    });
  });

  // ─── createExercise ────────────────────────────────────────────────────────

  describe('createExercise', () => {
    it('throws BadRequestException when neither categoryId nor categoryName provided', async () => {
      await expect(service.createExercise({ name: 'Squat' } as never, null)).rejects.toThrow(BadRequestException);
    });

    it('upserts category by name when categoryName is provided', async () => {
      const dto = { name: 'Squat', categoryName: 'Legs' };
      mockPrisma.exerciseCategory.upsert.mockResolvedValue({ id: 'cat-1' });
      mockPrisma.exercise.findFirst.mockResolvedValue(null);
      mockPrisma.exercise.create.mockResolvedValue({ id: 'e1', name: 'Squat' });

      await service.createExercise(dto as never, null);
      expect(mockPrisma.exerciseCategory.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { name: 'Legs' } }),
      );
    });

    it('throws ConflictException when exercise already exists in category', async () => {
      const dto = { name: 'Squat', categoryId: 'cat-1' };
      mockPrisma.exercise.findFirst.mockResolvedValue({ id: 'e1', name: 'Squat' });
      await expect(service.createExercise(dto as never, null)).rejects.toThrow(ConflictException);
    });

    it('creates exercise with categoryId and image', async () => {
      const dto = { name: 'Squat', categoryId: 'cat-1' };
      mockPrisma.exercise.findFirst.mockResolvedValue(null);
      mockPrisma.exercise.create.mockResolvedValue({ id: 'e1', name: 'Squat', image: '/img.jpg' });

      const result = await service.createExercise(dto as never, '/img.jpg');
      expect(result.name).toBe('Squat');
    });
  });

  // ─── deleteExercise ────────────────────────────────────────────────────────

  describe('deleteExercise', () => {
    it('throws NotFoundException when exercise not found', async () => {
      mockPrisma.exercise.findUnique.mockResolvedValue(null);
      await expect(service.deleteExercise('e-unknown')).rejects.toThrow(NotFoundException);
    });

    it('deletes exercise and returns confirmation', async () => {
      mockPrisma.exercise.findUnique.mockResolvedValue({ id: 'e1', name: 'Squat' });
      mockPrisma.exercise.delete.mockResolvedValue({});
      const result = await service.deleteExercise('e1');
      expect(result.message).toContain('Squat');
    });
  });
});
