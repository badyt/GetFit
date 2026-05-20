import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class HistoryRangeQueryDto {
  @ApiProperty({ example: '2024-01-01', description: 'Start date (ISO 8601)' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2024-01-31', description: 'End date (ISO 8601)' })
  @IsDateString()
  endDate: string;
}
