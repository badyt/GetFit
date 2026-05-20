import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HistoryRangeQueryDto } from './dto/history-range-query.dto';
import { UpsertDailyHistoryDto } from './dto/upsert-daily-history.dto';

@Injectable()
export class HistoryService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Trainee ────────────────────────────────────────────────────────────────

  async getMyDailyHistory(userId: string, date: Date) {
    return this.prisma.dailyHistory.findUnique({
      where: { userId_date: { userId, date } },
    });
  }

  async getMyHistoryRange(userId: string, query: HistoryRangeQueryDto) {
    this.validateDateRange(query.startDate, query.endDate);

    return this.prisma.dailyHistory.findMany({
      where: {
        userId,
        date: {
          gte: new Date(query.startDate),
          lte: new Date(query.endDate),
        },
      },
      orderBy: { date: 'asc' },
    });
  }

  async upsertDailyHistory(userId: string, dto: UpsertDailyHistoryDto) {
    if (dto.weight === undefined && dto.calorieIntake === undefined && dto.proteinIntake === undefined) {
      throw new BadRequestException(
        'At least one field (weight, calorieIntake, proteinIntake) must be provided',
      );
    }

    const date = new Date(dto.date);

    return this.prisma.dailyHistory.upsert({
      where: { userId_date: { userId, date } },
      create: {
        userId,
        date,
        weight: dto.weight ?? null,
        calorieIntake: dto.calorieIntake ?? null,
        proteinIntake: dto.proteinIntake ?? null,
      },
      update: {
        ...(dto.weight !== undefined && { weight: dto.weight }),
        ...(dto.calorieIntake !== undefined && { calorieIntake: dto.calorieIntake }),
        ...(dto.proteinIntake !== undefined && { proteinIntake: dto.proteinIntake }),
      },
    });
  }

  // ─── Trainer ────────────────────────────────────────────────────────────────

  async getTraineeDailyHistory(trainerId: string, traineeId: string, date: Date) {
    await this.verifyTraineeOwnership(trainerId, traineeId);
    return this.getMyDailyHistory(traineeId, date);
  }

  async getTraineeHistoryRange(trainerId: string, traineeId: string, query: HistoryRangeQueryDto) {
    await this.verifyTraineeOwnership(trainerId, traineeId);
    return this.getMyHistoryRange(traineeId, query);
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  private async verifyTraineeOwnership(trainerId: string, traineeId: string) {
    const trainee = await this.prisma.user.findFirst({
      where: { id: traineeId, trainerId, role: UserRole.TRAINEE },
    });
    if (!trainee) throw new NotFoundException('Trainee not found or not assigned to you');
    return trainee;
  }

  private validateDateRange(startDate: string, endDate: string): void {
    if (new Date(startDate) > new Date(endDate)) {
      throw new BadRequestException('startDate must be before or equal to endDate');
    }
  }
}
