import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, Min } from 'class-validator';

export class UpsertDailyHistoryDto {
  @ApiProperty({ example: '2024-01-15', description: 'ISO 8601 date string' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ description: 'Body weight in kg' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  weight?: number;

  @ApiPropertyOptional({ description: 'Total calorie intake for the day' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  calorieIntake?: number;

  @ApiPropertyOptional({ description: 'Total protein intake for the day in grams' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  proteinIntake?: number;
}
