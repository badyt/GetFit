import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { WorkoutPlanService } from './workout-plan.service';
import { PrismaService } from '../prisma/prisma.service';

const TRAINER_ID = 'trainer-1';
const TRAINEE_ID = 'trainee-1';

const mockTrainee = { id: TRAINEE_ID, role: UserRole.TRAINEE, trainerId: TRAINER_ID };

const mockWorkoutPlan = {
  id: 'wp-1',
  name: 'Week Plan',
  userId: TRAINEE_ID,
  workoutDays: [
    {
      id: 'wd-1',
      dayOfWeek: 1,
      description: null,
      exercises: [{ id: 'we-1', exercise: { id: 'e1', name: 'Squat' } }],
    },
  ],
};

const mockPrisma = {
  user: { findFirst: jest.fn() },
  workoutPlan: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    upsert: jest.fn(),
  },
  workoutDay: {
    findUnique: jest.fn(),
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

const createPlanDto = {
  name: 'Week Plan',
  workoutDays: [
    {
      dayOfWeek: 1,
      description: null,
      exercises: [{ exerciseId: 'e1', sets: 3, reps: 10, weight: null, restTime: null }],
    },
  ],
};

describe('WorkoutPlanService', () => {
  let service: WorkoutPlanService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WorkoutPlanService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(WorkoutPlanService);
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => cb(mockPrisma));
  });

  // ─── getMyWorkoutPlan ──────────────────────────────────────────────────────

  describe('getMyWorkoutPlan', () => {
    it('returns null when trainee has no workout plan', async () => {
      mockPrisma.workoutPlan.findUnique.mockResolvedValue(null);
      expect(await service.getMyWorkoutPlan(TRAINEE_ID)).toBeNull();
    });

    it('returns full plan with days and exercises', async () => {
      mockPrisma.workoutPlan.findUnique.mockResolvedValue(mockWorkoutPlan);
      expect(await service.getMyWorkoutPlan(TRAINEE_ID)).toEqual(mockWorkoutPlan);
    });
  });

  // ─── getMyWorkoutDay ───────────────────────────────────────────────────────

  describe('getMyWorkoutDay', () => {
    it('returns null when trainee has no workout plan', async () => {
      mockPrisma.workoutPlan.findUnique.mockResolvedValue(null);
      const result = await service.getMyWorkoutDay(TRAINEE_ID, 1);
      expect(result).toBeNull();
      expect(mockPrisma.workoutDay.findUnique).not.toHaveBeenCalled();
    });

    it('returns null when specific day does not exist', async () => {
      mockPrisma.workoutPlan.findUnique.mockResolvedValue({ id: 'wp-1' });
      mockPrisma.workoutDay.findUnique.mockResolvedValue(null);
      expect(await service.getMyWorkoutDay(TRAINEE_ID, 3)).toBeNull();
    });

    it('returns the day with exercises', async () => {
      const day = { id: 'wd-1', dayOfWeek: 1, exercises: [] };
      mockPrisma.workoutPlan.findUnique.mockResolvedValue({ id: 'wp-1' });
      mockPrisma.workoutDay.findUnique.mockResolvedValue(day);
      expect(await service.getMyWorkoutDay(TRAINEE_ID, 1)).toEqual(day);
    });
  });

  // ─── createWorkoutPlan ─────────────────────────────────────────────────────

  describe('createWorkoutPlan', () => {
    it('throws NotFoundException when trainee not owned', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      await expect(service.createWorkoutPlan(TRAINER_ID, TRAINEE_ID, createPlanDto)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when plan already exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockTrainee);
      mockPrisma.workoutPlan.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(service.createWorkoutPlan(TRAINER_ID, TRAINEE_ID, createPlanDto)).rejects.toThrow(BadRequestException);
    });

    it('creates plan with exercises', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockTrainee);
      mockPrisma.workoutPlan.findUnique.mockResolvedValue(null);
      mockPrisma.workoutPlan.create.mockResolvedValue(mockWorkoutPlan);

      const result = await service.createWorkoutPlan(TRAINER_ID, TRAINEE_ID, createPlanDto);
      expect(result).toEqual(mockWorkoutPlan);
    });
  });

  // ─── replaceWorkoutPlan ────────────────────────────────────────────────────

  describe('replaceWorkoutPlan', () => {
    it('throws NotFoundException when trainee not owned', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      await expect(service.replaceWorkoutPlan(TRAINER_ID, TRAINEE_ID, createPlanDto)).rejects.toThrow(NotFoundException);
    });

    it('deletes existing days and upserts in a transaction', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockTrainee);
      mockPrisma.workoutDay.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.workoutPlan.upsert.mockResolvedValue(mockWorkoutPlan);

      await service.replaceWorkoutPlan(TRAINER_ID, TRAINEE_ID, createPlanDto);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.workoutDay.deleteMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.workoutPlan.upsert).toHaveBeenCalledTimes(1);
    });
  });

  // ─── deleteWorkoutPlan ─────────────────────────────────────────────────────

  describe('deleteWorkoutPlan', () => {
    it('throws NotFoundException when trainee not owned', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      await expect(service.deleteWorkoutPlan(TRAINER_ID, TRAINEE_ID)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException on Prisma P2025', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockTrainee);
      const p2025 = Object.assign(new Prisma.PrismaClientKnownRequestError('Not found', { code: 'P2025', clientVersion: '0' }), {});
      mockPrisma.workoutPlan.delete.mockRejectedValue(p2025);
      await expect(service.deleteWorkoutPlan(TRAINER_ID, TRAINEE_ID)).rejects.toThrow(NotFoundException);
    });

    it('returns success message', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockTrainee);
      mockPrisma.workoutPlan.delete.mockResolvedValue({});
      const result = await service.deleteWorkoutPlan(TRAINER_ID, TRAINEE_ID);
      expect(result.message).toContain('deleted');
    });
  });
});
