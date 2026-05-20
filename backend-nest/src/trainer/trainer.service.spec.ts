import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { TrainerService } from './trainer.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  trainerInvite: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  mealPlan: { findUnique: jest.fn() },
  workoutPlan: { findUnique: jest.fn() },
  $transaction: jest.fn(),
};

const mockEmail = {
  sendTrainerInviteEmail: jest.fn().mockResolvedValue(undefined),
};

const TRAINER_ID = 'trainer-1';
const TRAINEE_ID = 'trainee-1';
const TRAINEE_EMAIL = 'trainee@example.com';

const mockTrainee = {
  id: TRAINEE_ID,
  email: TRAINEE_EMAIL,
  role: UserRole.TRAINEE,
  trainerId: null,
  name: 'Trainee',
};

const mockTrainer = { name: 'Trainer Bob' };

const mockInvite = {
  id: 'invite-1',
  trainerId: TRAINER_ID,
  traineeEmail: TRAINEE_EMAIL,
  inviteCode: 'CODE123',
  status: 'PENDING',
  expiresAt: new Date(Date.now() + 86_400_000),
  message: null,
};

describe('TrainerService', () => {
  let service: TrainerService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TrainerService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmailService, useValue: mockEmail },
      ],
    }).compile();

    service = module.get(TrainerService);
    jest.clearAllMocks();
    mockEmail.sendTrainerInviteEmail.mockResolvedValue(undefined);
    mockPrisma.$transaction.mockImplementation(async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => cb(mockPrisma));
  });

  // ─── sendInvite ────────────────────────────────────────────────────────────

  describe('sendInvite', () => {
    const dto = { email: TRAINEE_EMAIL, expiresInDays: 7 };

    it('throws NotFoundException when trainer not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.sendInvite(TRAINER_ID, dto)).rejects.toThrow(NotFoundException);
    });

    it('reuses existing pending invite and resends email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockTrainer);
      mockPrisma.trainerInvite.findFirst.mockResolvedValue({
        inviteCode: 'EXISTING',
        expiresAt: new Date(Date.now() + 86_400_000),
      });

      const result = await service.sendInvite(TRAINER_ID, dto);

      expect(mockPrisma.trainerInvite.create).not.toHaveBeenCalled();
      expect(mockEmail.sendTrainerInviteEmail).toHaveBeenCalledTimes(1);
      expect(result.message).toContain(TRAINEE_EMAIL);
    });

    it('creates new invite and sends email on success', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockTrainer);
      mockPrisma.trainerInvite.findFirst.mockResolvedValue(null);
      mockPrisma.trainerInvite.create.mockResolvedValue(mockInvite);

      const result = await service.sendInvite(TRAINER_ID, dto);

      expect(mockPrisma.trainerInvite.create).toHaveBeenCalledTimes(1);
      expect(mockEmail.sendTrainerInviteEmail).toHaveBeenCalledTimes(1);
      expect(result.message).toContain(TRAINEE_EMAIL);
    });

    it('rolls back invite and throws InternalServerError when email fails', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockTrainer);
      mockPrisma.trainerInvite.findFirst.mockResolvedValue(null);
      mockPrisma.trainerInvite.create.mockResolvedValue(mockInvite);
      mockPrisma.trainerInvite.delete.mockResolvedValue({});
      mockEmail.sendTrainerInviteEmail.mockRejectedValue(new Error('SMTP'));

      await expect(service.sendInvite(TRAINER_ID, dto)).rejects.toThrow(InternalServerErrorException);
      expect(mockPrisma.trainerInvite.delete).toHaveBeenCalledTimes(1);
    });
  });

  // ─── joinTrainer ───────────────────────────────────────────────────────────

  describe('joinTrainer', () => {
    const dto = { code: 'CODE123' };

    it('throws NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.joinTrainer(TRAINEE_ID, dto)).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when trainee already has a trainer', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockTrainee, trainerId: TRAINER_ID });
      await expect(service.joinTrainer(TRAINEE_ID, dto)).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException for invalid or expired invite', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockTrainee);
      mockPrisma.trainerInvite.findUnique.mockResolvedValue(null);
      await expect(service.joinTrainer(TRAINEE_ID, dto)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for expired invite', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockTrainee);
      mockPrisma.trainerInvite.findUnique.mockResolvedValue({
        ...mockInvite,
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(service.joinTrainer(TRAINEE_ID, dto)).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException when invite email does not match trainee', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockTrainee, email: 'other@example.com' });
      mockPrisma.trainerInvite.findUnique.mockResolvedValue(mockInvite);
      await expect(service.joinTrainer(TRAINEE_ID, dto)).rejects.toThrow(ForbiddenException);
    });

    it('links trainee to trainer and marks invite accepted', async () => {
      const updatedTrainee = { ...mockTrainee, trainerId: TRAINER_ID };
      mockPrisma.user.findUnique.mockResolvedValue(mockTrainee);
      mockPrisma.trainerInvite.findUnique.mockResolvedValue(mockInvite);
      mockPrisma.user.update.mockResolvedValue(updatedTrainee);
      mockPrisma.trainerInvite.update.mockResolvedValue({});

      const result = await service.joinTrainer(TRAINEE_ID, dto);

      expect(result.message).toContain('successfully');
      expect(result.trainee.trainerId).toBe(TRAINER_ID);
      expect(mockPrisma.trainerInvite.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'ACCEPTED' }) }),
      );
    });
  });

  // ─── getTrainees ───────────────────────────────────────────────────────────

  describe('getTrainees', () => {
    it('returns list of trainees for the trainer', async () => {
      const trainees = [{ id: TRAINEE_ID, name: 'Trainee', email: TRAINEE_EMAIL }];
      mockPrisma.user.findMany.mockResolvedValue(trainees);

      const result = await service.getTrainees(TRAINER_ID);
      expect(result.trainees).toHaveLength(1);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { trainerId: TRAINER_ID, role: UserRole.TRAINEE } }),
      );
    });
  });

  // ─── getTraineePlans ───────────────────────────────────────────────────────

  describe('getTraineePlans', () => {
    it('throws NotFoundException when trainee not owned by trainer', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      await expect(service.getTraineePlans(TRAINER_ID, TRAINEE_ID)).rejects.toThrow(NotFoundException);
    });

    it('returns null for both plans when trainee has none', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockTrainee);
      mockPrisma.mealPlan.findUnique.mockResolvedValue(null);
      mockPrisma.workoutPlan.findUnique.mockResolvedValue(null);

      const result = await service.getTraineePlans(TRAINER_ID, TRAINEE_ID);
      expect(result.mealPlan).toBeNull();
      expect(result.workoutPlan).toBeNull();
    });

    it('returns plan summaries with day counts', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockTrainee);
      mockPrisma.mealPlan.findUnique.mockResolvedValue({
        id: 'mp-1',
        name: 'My Meals',
        mealDays: [{ id: 'd1' }, { id: 'd2' }],
      });
      mockPrisma.workoutPlan.findUnique.mockResolvedValue({
        id: 'wp-1',
        name: 'My Workouts',
        workoutDays: [{ id: 'd1' }],
      });

      const result = await service.getTraineePlans(TRAINER_ID, TRAINEE_ID);
      expect(result.mealPlan?.daysCount).toBe(2);
      expect(result.workoutPlan?.daysCount).toBe(1);
    });
  });
});
