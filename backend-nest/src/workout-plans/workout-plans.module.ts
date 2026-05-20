import { Module } from '@nestjs/common';
import { WorkoutPlanTraineeController } from './workout-plan-trainee.controller';
import { WorkoutPlanTrainerController } from './workout-plan-trainer.controller';
import { WorkoutPlanService } from './workout-plan.service';

@Module({
  controllers: [WorkoutPlanTrainerController, WorkoutPlanTraineeController],
  providers: [WorkoutPlanService],
})
export class WorkoutPlansModule {}
