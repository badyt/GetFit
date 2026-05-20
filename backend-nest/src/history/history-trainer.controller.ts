import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { RequestUser } from '../auth/types/jwt-payload.type';
import { ParseDatePipe } from '../common/pipes/parse-date.pipe';
import { HistoryRangeQueryDto } from './dto/history-range-query.dto';
import { HistoryService } from './history.service';

@ApiTags('history')
@ApiBearerAuth()
@Roles(UserRole.TRAINER)
@Controller('history/trainee/:traineeId')
export class HistoryTrainerController {
  constructor(private readonly historyService: HistoryService) {}

  // Declared before /:date to prevent "range" being captured as a date param
  @Get('range')
  @ApiOperation({ summary: "Get a trainee's history for a date range" })
  getTraineeHistoryRange(
    @CurrentUser() user: RequestUser,
    @Param('traineeId') traineeId: string,
    @Query() query: HistoryRangeQueryDto,
  ) {
    return this.historyService.getTraineeHistoryRange(user.id, traineeId, query);
  }

  @Get(':date')
  @ApiOperation({ summary: "Get a trainee's history for a specific date" })
  getTraineeDailyHistory(
    @CurrentUser() user: RequestUser,
    @Param('traineeId') traineeId: string,
    @Param('date', ParseDatePipe) date: Date,
  ) {
    return this.historyService.getTraineeDailyHistory(user.id, traineeId, date);
  }
}
