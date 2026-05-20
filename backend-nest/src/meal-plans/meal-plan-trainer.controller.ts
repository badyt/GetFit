import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { RequestUser } from '../auth/types/jwt-payload.type';
import { CreateMealPlanDto } from './dto/create-meal-plan.dto';
import { MealPlanService } from './meal-plan.service';

@ApiTags('meal-plans')
@ApiBearerAuth()
@Roles(UserRole.TRAINER)
@Controller('trainer/trainees/:traineeId/meal-plan')
export class MealPlanTrainerController {
  constructor(private readonly mealPlanService: MealPlanService) {}

  @Get()
  @ApiOperation({ summary: "Get a trainee's full meal plan" })
  getMealPlan(@CurrentUser() user: RequestUser, @Param('traineeId') traineeId: string) {
    return this.mealPlanService.getMealPlan(user.id, traineeId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a meal plan for a trainee' })
  createMealPlan(
    @CurrentUser() user: RequestUser,
    @Param('traineeId') traineeId: string,
    @Body() dto: CreateMealPlanDto,
  ) {
    return this.mealPlanService.createMealPlan(user.id, traineeId, dto);
  }

  @Put()
  @ApiOperation({ summary: "Replace a trainee's meal plan (full replacement)" })
  replaceMealPlan(
    @CurrentUser() user: RequestUser,
    @Param('traineeId') traineeId: string,
    @Body() dto: CreateMealPlanDto,
  ) {
    return this.mealPlanService.replaceMealPlan(user.id, traineeId, dto);
  }

  @Delete()
  @ApiOperation({ summary: "Delete a trainee's meal plan" })
  deleteMealPlan(@CurrentUser() user: RequestUser, @Param('traineeId') traineeId: string) {
    return this.mealPlanService.deleteMealPlan(user.id, traineeId);
  }
}
