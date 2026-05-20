import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { RequestUser } from '../auth/types/jwt-payload.type';
import { JoinTrainerDto } from './dto/join-trainer.dto';
import { TrainerService } from './trainer.service';

@ApiTags('trainee')
@ApiBearerAuth()
@Roles(UserRole.TRAINEE)
@Controller('trainee')
export class TraineeController {
  constructor(private readonly trainerService: TrainerService) {}

  @Post('join')
  @ApiOperation({ summary: 'Join a trainer using an invite code' })
  async joinTrainer(@CurrentUser() user: RequestUser, @Body() dto: JoinTrainerDto) {
    const result = await this.trainerService.joinTrainer(user.id, dto);
    return { success: true, ...result };
  }
}
