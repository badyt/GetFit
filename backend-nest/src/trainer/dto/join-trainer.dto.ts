import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class JoinTrainerDto {
  @ApiProperty()
  @IsString()
  code: string;
}
