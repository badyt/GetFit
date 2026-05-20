import { Module } from '@nestjs/common';
import { MealPlanTraineeController } from './meal-plan-trainee.controller';
import { MealPlanTrainerController } from './meal-plan-trainer.controller';
import { MealPlanService } from './meal-plan.service';

@Module({
  controllers: [MealPlanTrainerController, MealPlanTraineeController],
  providers: [MealPlanService],
})
export class MealPlansModule {}
