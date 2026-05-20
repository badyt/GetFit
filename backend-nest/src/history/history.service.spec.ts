import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { HistoryService } from './history.service';
import { PrismaService } from '../prisma/prisma.service';

const TRAINER_ID = 'trainer-1';
const TRAINEE_ID = 'trainee-1';

const mockTrainee = { id: TRAINEE_ID, role: UserRole.TRAINEE, trainerId: TRAINER_ID };

const mockPrisma = {
  user: { findFirst: jest.fn() },
  dailyHistory: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
};

const mockRecord = {
  id: 'dh-1',
  userId: TRAINEE_ID,
  date: new Date('2024-01-15'),
  weight: 75.5,
  calorieIntake: 2000,
  proteinIntake: 150,
};

describe('HistoryService', () => {
  let service: HistoryService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        HistoryService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(HistoryService);
    jest.clearAllMocks();
  });

  // ─── upsertDailyHistory ────────────────────────────────────────────────────

  describe('upsertDailyHistory', () => {
    it('throws BadRequestException when no fields provided', async () => {
      const dto = { date: '2024-01-15' };
      await expect(service.upsertDailyHistory(TRAINEE_ID, dto as never)).rejects.toThrow(BadRequestException);
      expect(mockPrisma.dailyHistory.upsert).not.toHaveBeenCalled();
    });

    it('creates new record when one field is provided', async () => {
      mockPrisma.dailyHistory.upsert.mockResolvedValue(mockRecord);
      const dto = { date: '2024-01-15', weight: 75.5 };
      const result = await service.upsertDailyHistory(TRAINEE_ID, dto as never);
      expect(result).toEqual(mockRecord);
      expect(mockPrisma.dailyHistory.upsert).toHaveBeenCalledTimes(1);
    });

    it('passes only defined fields to the update clause', async () => {
      mockPrisma.dailyHistory.upsert.mockResolvedValue(mockRecord);
      const dto = { date: '2024-01-15', calorieIntake: 2000 };
      await service.upsertDailyHistory(TRAINEE_ID, dto as never);

      const call = mockPrisma.dailyHistory.upsert.mock.calls[0][0] as { update: Record<string, unknown> };
      expect(call.update).toEqual({ calorieIntake: 2000 });
      expect(call.update).not.toHaveProperty('weight');
    });

    it('accepts all three fields at once', async () => {
      mockPrisma.dailyHistory.upsert.mockResolvedValue(mockRecord);
      const dto = { date: '2024-01-15', weight: 75.5, calorieIntake: 2000, proteinIntake: 150 };
      await service.upsertDailyHistory(TRAINEE_ID, dto);
      expect(mockPrisma.dailyHistory.upsert).toHaveBeenCalledTimes(1);
    });
  });

  // ─── getMyHistoryRange ─────────────────────────────────────────────────────

  describe('getMyHistoryRange', () => {
    it('throws BadRequestException when startDate is after endDate', async () => {
      const query = { startDate: '2024-01-20', endDate: '2024-01-10' };
      await expect(service.getMyHistoryRange(TRAINEE_ID, query)).rejects.toThrow(BadRequestException);
    });

    it('returns records within the date range', async () => {
      mockPrisma.dailyHistory.findMany.mockResolvedValue([mockRecord]);
      const query = { startDate: '2024-01-10', endDate: '2024-01-20' };
      const result = await service.getMyHistoryRange(TRAINEE_ID, query);
      expect(result).toHaveLength(1);
      expect(mockPrisma.dailyHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: TRAINEE_ID }) }),
      );
    });

    it('accepts equal start and end dates', async () => {
      mockPrisma.dailyHistory.findMany.mockResolvedValue([mockRecord]);
      const query = { startDate: '2024-01-15', endDate: '2024-01-15' };
      await expect(service.getMyHistoryRange(TRAINEE_ID, query)).resolves.toHaveLength(1);
    });
  });

  // ─── getMyDailyHistory ─────────────────────────────────────────────────────

  describe('getMyDailyHistory', () => {
    it('returns null when no record exists for the date', async () => {
      mockPrisma.dailyHistory.findUnique.mockResolvedValue(null);
      const result = await service.getMyDailyHistory(TRAINEE_ID, new Date('2024-01-15'));
      expect(result).toBeNull();
    });

    it('returns the record for the given date', async () => {
      mockPrisma.dailyHistory.findUnique.mockResolvedValue(mockRecord);
      const result = await service.getMyDailyHistory(TRAINEE_ID, new Date('2024-01-15'));
      expect(result).toEqual(mockRecord);
    });
  });

  // ─── getTraineeDailyHistory ────────────────────────────────────────────────

  describe('getTraineeDailyHistory', () => {
    it('throws NotFoundException when trainee not owned by trainer', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      await expect(service.getTraineeDailyHistory(TRAINER_ID, TRAINEE_ID, new Date())).rejects.toThrow(NotFoundException);
    });

    it('delegates to getMyDailyHistory after ownership check', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockTrainee);
      mockPrisma.dailyHistory.findUnique.mockResolvedValue(mockRecord);

      const result = await service.getTraineeDailyHistory(TRAINER_ID, TRAINEE_ID, new Date('2024-01-15'));
      expect(result).toEqual(mockRecord);
    });
  });

  // ─── getTraineeHistoryRange ────────────────────────────────────────────────

  describe('getTraineeHistoryRange', () => {
    it('throws NotFoundException when trainee not owned', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      const query = { startDate: '2024-01-10', endDate: '2024-01-20' };
      await expect(service.getTraineeHistoryRange(TRAINER_ID, TRAINEE_ID, query)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException for invalid date range even after ownership check', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockTrainee);
      const query = { startDate: '2024-01-20', endDate: '2024-01-10' };
      await expect(service.getTraineeHistoryRange(TRAINER_ID, TRAINEE_ID, query)).rejects.toThrow(BadRequestException);
    });

    it('returns history records for the trainee', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockTrainee);
      mockPrisma.dailyHistory.findMany.mockResolvedValue([mockRecord]);
      const query = { startDate: '2024-01-10', endDate: '2024-01-20' };
      const result = await service.getTraineeHistoryRange(TRAINER_ID, TRAINEE_ID, query);
      expect(result).toHaveLength(1);
    });
  });
});
