import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { RequestUser } from '../auth/types/jwt-payload.type';
import { MealPlanService } from './meal-plan.service';

@ApiTags('meal-plans')
@ApiBearerAuth()
@Roles(UserRole.TRAINEE)
@Controller('meal-plans')
export class MealPlanTraineeController {
  constructor(private readonly mealPlanService: MealPlanService) {}

  @Get('my')
  @ApiOperation({ summary: 'Get my full meal plan' })
  getMyMealPlan(@CurrentUser() user: RequestUser) {
    return this.mealPlanService.getMyMealPlan(user.id);
  }

  @Get('day/:dayOfWeek')
  @ApiOperation({ summary: 'Get my meal plan for a specific day (0=Sun, 6=Sat)' })
  getMyMealDay(
    @CurrentUser() user: RequestUser,
    @Param('dayOfWeek', ParseIntPipe) dayOfWeek: number,
  ) {
    return this.mealPlanService.getMyMealDay(user.id, dayOfWeek);
  }
}
