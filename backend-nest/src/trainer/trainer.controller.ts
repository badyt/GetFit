import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { RequestUser } from '../auth/types/jwt-payload.type';
import { SendInviteDto } from './dto/send-invite.dto';
import { TrainerService } from './trainer.service';

@ApiTags('trainer')
@ApiBearerAuth()
@Roles(UserRole.TRAINER)
@Controller('trainer')
export class TrainerController {
  constructor(private readonly trainerService: TrainerService) {}

  @Post('invite')
  @ApiOperation({ summary: 'Send an invite to a trainee by email' })
  async sendInvite(@CurrentUser() user: RequestUser, @Body() dto: SendInviteDto) {
    const result = await this.trainerService.sendInvite(user.id, dto);
    return { success: true, ...result };
  }

  @Get('trainees')
  @ApiOperation({ summary: 'List all trainees assigned to this trainer' })
  async getTrainees(@CurrentUser() user: RequestUser) {
    const data = await this.trainerService.getTrainees(user.id);
    return { success: true, ...data };
  }

  @Get('trainees/:traineeId/plans')
  @ApiOperation({ summary: "Get a summary of a trainee's meal and workout plans" })
  async getTraineePlans(@CurrentUser() user: RequestUser, @Param('traineeId') traineeId: string) {
    const data = await this.trainerService.getTraineePlans(user.id, traineeId);
    return { success: true, ...data };
  }
}
