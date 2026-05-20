import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

export class MealDayFoodDto {
  @ApiProperty()
  @IsString()
  foodId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ example: '08:00' })
  @IsString()
  mealTime: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;
}

export class MealDayDto {
  @ApiProperty({ minimum: 0, maximum: 6, description: '0 = Sunday, 6 = Saturday' })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({ type: [MealDayFoodDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MealDayFoodDto)
  meals: MealDayFoodDto[];
}

export class CreateMealPlanDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ type: [MealDayDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MealDayDto)
  mealDays: MealDayDto[];
}
