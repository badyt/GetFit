import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { RequestUser } from '../auth/types/jwt-payload.type';
import { ParseDatePipe } from '../common/pipes/parse-date.pipe';
import { HistoryRangeQueryDto } from './dto/history-range-query.dto';
import { UpsertDailyHistoryDto } from './dto/upsert-daily-history.dto';
import { HistoryService } from './history.service';

@ApiTags('history')
@ApiBearerAuth()
@Roles(UserRole.TRAINEE)
@Controller('history')
export class HistoryTraineeController {
  constructor(private readonly historyService: HistoryService) {}

  // Declared before /:date to prevent "range" being captured as a date param
  @Get('range')
  @ApiOperation({ summary: 'Get my history for a date range' })
  getMyHistoryRange(@CurrentUser() user: RequestUser, @Query() query: HistoryRangeQueryDto) {
    return this.historyService.getMyHistoryRange(user.id, query);
  }

  @Get(':date')
  @ApiOperation({ summary: 'Get my history for a specific date' })
  async getMyDailyHistory(
    @CurrentUser() user: RequestUser,
    @Param('date', ParseDatePipe) date: Date,
  ) {
    const data = await this.historyService.getMyDailyHistory(user.id, date);
    return data ?? {};
  }

  @Post()
  @ApiOperation({ summary: 'Create or update my daily history entry' })
  upsertDailyHistory(@CurrentUser() user: RequestUser, @Body() dto: UpsertDailyHistoryDto) {
    return this.historyService.upsertDailyHistory(user.id, dto);
  }
}
