import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async getFoods() {
    return this.prisma.food.findMany({
      select: {
        id: true,
        name: true,
        caloriesPer100g: true,
        proteinPer100g: true,
        image: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async getExercises() {
    return this.prisma.exerciseCategory.findMany({
      select: {
        id: true,
        name: true,
        exercises: {
          select: {
            id: true,
            name: true,
            description: true,
            image: true,
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }
}
