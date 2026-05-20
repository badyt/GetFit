import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateFoodDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  // @Type(() => Number) converts the string value from multipart/form-data to a number
  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  caloriesPer100g: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  proteinPer100g: number;
}
