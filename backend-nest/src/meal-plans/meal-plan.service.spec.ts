import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { MealPlanService } from './meal-plan.service';
import { PrismaService } from '../prisma/prisma.service';

const TRAINER_ID = 'trainer-1';
const TRAINEE_ID = 'trainee-1';

const mockTrainee = { id: TRAINEE_ID, role: UserRole.TRAINEE, trainerId: TRAINER_ID };

const mockMealPlan = {
  id: 'mp-1',
  name: 'Week Plan',
  userId: TRAINEE_ID,
  mealDays: [
    {
      id: 'md-1',
      dayOfWeek: 1,
      meals: [{ id: 'meal-1', food: { id: 'f1', name: 'Oats' } }],
    },
  ],
};

const mockPrisma = {
  user: { findFirst: jest.fn() },
  mealPlan: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    upsert: jest.fn(),
  },
  mealDay: {
    findUnique: jest.fn(),
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

const createPlanDto = {
  name: 'Week Plan',
  mealDays: [
    {
      dayOfWeek: 1,
      meals: [{ foodId: 'f1', quantity: 100, mealTime: 'Breakfast', description: null }],
    },
  ],
};

describe('MealPlanService', () => {
  let service: MealPlanService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MealPlanService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(MealPlanService);
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => cb(mockPrisma));
  });

  // ─── getMyMealPlan ─────────────────────────────────────────────────────────

  describe('getMyMealPlan', () => {
    it('returns null when trainee has no meal plan', async () => {
      mockPrisma.mealPlan.findUnique.mockResolvedValue(null);
      const result = await service.getMyMealPlan(TRAINEE_ID);
      expect(result).toBeNull();
    });

    it('returns full meal plan with days and meals', async () => {
      mockPrisma.mealPlan.findUnique.mockResolvedValue(mockMealPlan);
      const result = await service.getMyMealPlan(TRAINEE_ID);
      expect(result).toEqual(mockMealPlan);
    });
  });

  // ─── getMyMealDay ──────────────────────────────────────────────────────────

  describe('getMyMealDay', () => {
    it('returns null when trainee has no meal plan', async () => {
      mockPrisma.mealPlan.findUnique.mockResolvedValue(null);
      const result = await service.getMyMealDay(TRAINEE_ID, 1);
      expect(result).toBeNull();
      expect(mockPrisma.mealDay.findUnique).not.toHaveBeenCalled();
    });

    it('returns null when specific day does not exist', async () => {
      mockPrisma.mealPlan.findUnique.mockResolvedValue({ id: 'mp-1' });
      mockPrisma.mealDay.findUnique.mockResolvedValue(null);
      const result = await service.getMyMealDay(TRAINEE_ID, 3);
      expect(result).toBeNull();
    });

    it('returns the day with meals', async () => {
      const day = { id: 'md-1', dayOfWeek: 1, meals: [] };
      mockPrisma.mealPlan.findUnique.mockResolvedValue({ id: 'mp-1' });
      mockPrisma.mealDay.findUnique.mockResolvedValue(day);
      const result = await service.getMyMealDay(TRAINEE_ID, 1);
      expect(result).toEqual(day);
    });
  });

  // ─── getMealPlan ───────────────────────────────────────────────────────────

  describe('getMealPlan', () => {
    it('throws NotFoundException when trainee not owned by trainer', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      await expect(service.getMealPlan(TRAINER_ID, TRAINEE_ID)).rejects.toThrow(NotFoundException);
    });

    it('returns meal plan for owned trainee', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockTrainee);
      mockPrisma.mealPlan.findUnique.mockResolvedValue(mockMealPlan);
      const result = await service.getMealPlan(TRAINER_ID, TRAINEE_ID);
      expect(result).toEqual(mockMealPlan);
    });
  });

  // ─── createMealPlan ────────────────────────────────────────────────────────

  describe('createMealPlan', () => {
    it('throws NotFoundException when trainee not owned', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      await expect(service.createMealPlan(TRAINER_ID, TRAINEE_ID, createPlanDto)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when plan already exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockTrainee);
      mockPrisma.mealPlan.findUnique.mockResolvedValue({ id: 'existing-mp' });
      await expect(service.createMealPlan(TRAINER_ID, TRAINEE_ID, createPlanDto)).rejects.toThrow(BadRequestException);
      expect(mockPrisma.mealPlan.create).not.toHaveBeenCalled();
    });

    it('creates plan with nested days and meals', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockTrainee);
      mockPrisma.mealPlan.findUnique.mockResolvedValue(null);
      mockPrisma.mealPlan.create.mockResolvedValue(mockMealPlan);

      const result = await service.createMealPlan(TRAINER_ID, TRAINEE_ID, createPlanDto);

      expect(mockPrisma.mealPlan.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockMealPlan);
    });
  });

  // ─── replaceMealPlan ───────────────────────────────────────────────────────

  describe('replaceMealPlan', () => {
    it('throws NotFoundException when trainee not owned', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      await expect(service.replaceMealPlan(TRAINER_ID, TRAINEE_ID, createPlanDto)).rejects.toThrow(NotFoundException);
    });

    it('deletes existing days and upserts plan in a transaction', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockTrainee);
      mockPrisma.mealDay.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.mealPlan.upsert.mockResolvedValue(mockMealPlan);

      const result = await service.replaceMealPlan(TRAINER_ID, TRAINEE_ID, createPlanDto);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.mealDay.deleteMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.mealPlan.upsert).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockMealPlan);
    });
  });

  // ─── deleteMealPlan ────────────────────────────────────────────────────────

  describe('deleteMealPlan', () => {
    it('throws NotFoundException when trainee not owned', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      await expect(service.deleteMealPlan(TRAINER_ID, TRAINEE_ID)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException on Prisma P2025 (record not found)', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockTrainee);
      const p2025 = Object.assign(new Prisma.PrismaClientKnownRequestError('Not found', { code: 'P2025', clientVersion: '0' }), {});
      mockPrisma.mealPlan.delete.mockRejectedValue(p2025);
      await expect(service.deleteMealPlan(TRAINER_ID, TRAINEE_ID)).rejects.toThrow(NotFoundException);
    });

    it('returns success message when plan deleted', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockTrainee);
      mockPrisma.mealPlan.delete.mockResolvedValue({});
      const result = await service.deleteMealPlan(TRAINER_ID, TRAINEE_ID);
      expect(result.message).toContain('deleted');
    });
  });
});
