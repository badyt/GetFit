import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { TraineeController } from './trainee.controller';
import { TrainerController } from './trainer.controller';
import { TrainerService } from './trainer.service';

@Module({
  imports: [EmailModule],
  controllers: [TrainerController, TraineeController],
  providers: [TrainerService],
})
export class TrainerModule {}
