import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

export class WorkoutExerciseDto {
  @ApiProperty()
  @IsString()
  exerciseId: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  sets: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  reps: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  weight?: number;

  @ApiPropertyOptional({ description: 'Rest time in seconds' })
  @IsInt()
  @IsOptional()
  restTime?: number;
}

export class WorkoutDayDto {
  @ApiProperty({ minimum: 0, maximum: 6, description: '0 = Sunday, 6 = Saturday' })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ type: [WorkoutExerciseDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkoutExerciseDto)
  exercises: WorkoutExerciseDto[];
}

export class CreateWorkoutPlanDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ type: [WorkoutDayDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkoutDayDto)
  workoutDays: WorkoutDayDto[];
}
