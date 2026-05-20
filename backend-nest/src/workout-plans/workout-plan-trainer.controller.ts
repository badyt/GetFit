import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { RequestUser } from '../auth/types/jwt-payload.type';
import { CreateWorkoutPlanDto } from './dto/create-workout-plan.dto';
import { WorkoutPlanService } from './workout-plan.service';

@ApiTags('workout-plans')
@ApiBearerAuth()
@Roles(UserRole.TRAINER)
@Controller('trainer/trainees/:traineeId/workout-plan')
export class WorkoutPlanTrainerController {
  constructor(private readonly workoutPlanService: WorkoutPlanService) {}

  @Get()
  @ApiOperation({ summary: "Get a trainee's full workout plan" })
  getWorkoutPlan(@CurrentUser() user: RequestUser, @Param('traineeId') traineeId: string) {
    return this.workoutPlanService.getWorkoutPlan(user.id, traineeId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a workout plan for a trainee' })
  createWorkoutPlan(
    @CurrentUser() user: RequestUser,
    @Param('traineeId') traineeId: string,
    @Body() dto: CreateWorkoutPlanDto,
  ) {
    return this.workoutPlanService.createWorkoutPlan(user.id, traineeId, dto);
  }

  @Put()
  @ApiOperation({ summary: "Replace a trainee's workout plan (full replacement)" })
  replaceWorkoutPlan(
    @CurrentUser() user: RequestUser,
    @Param('traineeId') traineeId: string,
    @Body() dto: CreateWorkoutPlanDto,
  ) {
    return this.workoutPlanService.replaceWorkoutPlan(user.id, traineeId, dto);
  }

  @Delete()
  @ApiOperation({ summary: "Delete a trainee's workout plan" })
  deleteWorkoutPlan(@CurrentUser() user: RequestUser, @Param('traineeId') traineeId: string) {
    return this.workoutPlanService.deleteWorkoutPlan(user.id, traineeId);
  }
}
