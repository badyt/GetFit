import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { RequestUser } from '../auth/types/jwt-payload.type';
import { WorkoutPlanService } from './workout-plan.service';

@ApiTags('workout-plans')
@ApiBearerAuth()
@Roles(UserRole.TRAINEE)
@Controller('workout-plans')
export class WorkoutPlanTraineeController {
  constructor(private readonly workoutPlanService: WorkoutPlanService) {}

  @Get('my')
  @ApiOperation({ summary: 'Get my full workout plan' })
  getMyWorkoutPlan(@CurrentUser() user: RequestUser) {
    return this.workoutPlanService.getMyWorkoutPlan(user.id);
  }

  @Get('day/:dayOfWeek')
  @ApiOperation({ summary: 'Get my workout plan for a specific day (0=Sun, 6=Sat)' })
  getMyWorkoutDay(
    @CurrentUser() user: RequestUser,
    @Param('dayOfWeek', ParseIntPipe) dayOfWeek: number,
  ) {
    return this.workoutPlanService.getMyWorkoutDay(user.id, dayOfWeek);
  }
}
