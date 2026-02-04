/*
  Warnings:

  - Added the required column `mealTime` to the `MealDayFood` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MealDayFood" ADD COLUMN     "mealTime" VARCHAR(5) NOT NULL;
