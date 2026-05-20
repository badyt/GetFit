import { Module } from '@nestjs/common';
import { HistoryTraineeController } from './history-trainee.controller';
import { HistoryTrainerController } from './history-trainer.controller';
import { HistoryService } from './history.service';

@Module({
  controllers: [HistoryTraineeController, HistoryTrainerController],
  providers: [HistoryService],
})
export class HistoryModule {}
