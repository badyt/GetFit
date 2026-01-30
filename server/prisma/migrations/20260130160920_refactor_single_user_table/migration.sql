/*
  Warnings:

  - You are about to drop the column `traineeId` on the `DailyHistory` table. All the data in the column will be lost.
  - You are about to drop the column `traineeId` on the `MealPlan` table. All the data in the column will be lost.
  - You are about to drop the column `traineeId` on the `WorkoutPlan` table. All the data in the column will be lost.
  - You are about to drop the `Admin` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Trainee` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Trainer` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId,date]` on the table `DailyHistory` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId]` on the table `MealPlan` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId]` on the table `WorkoutPlan` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `DailyHistory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `MealPlan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `WorkoutPlan` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "DailyHistory" DROP CONSTRAINT "DailyHistory_traineeId_fkey";

-- DropForeignKey
ALTER TABLE "MealPlan" DROP CONSTRAINT "MealPlan_traineeId_fkey";

-- DropForeignKey
ALTER TABLE "Trainee" DROP CONSTRAINT "Trainee_trainerId_fkey";

-- DropForeignKey
ALTER TABLE "WorkoutPlan" DROP CONSTRAINT "WorkoutPlan_traineeId_fkey";

-- DropIndex
DROP INDEX "DailyHistory_traineeId_date_key";

-- DropIndex
DROP INDEX "DailyHistory_traineeId_idx";

-- DropIndex
DROP INDEX "MealPlan_traineeId_idx";

-- DropIndex
DROP INDEX "MealPlan_traineeId_key";

-- DropIndex
DROP INDEX "WorkoutPlan_traineeId_idx";

-- DropIndex
DROP INDEX "WorkoutPlan_traineeId_key";

-- AlterTable
ALTER TABLE "DailyHistory" DROP COLUMN "traineeId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "MealPlan" DROP COLUMN "traineeId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "WorkoutPlan" DROP COLUMN "traineeId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- DropTable
DROP TABLE "Admin";

-- DropTable
DROP TABLE "Trainee";

-- DropTable
DROP TABLE "Trainer";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" TEXT NOT NULL,
    "phone" VARCHAR(20),
    "role" "UserRole" NOT NULL DEFAULT 'TRAINEE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "trainerId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_trainerId_idx" ON "User"("trainerId");

-- CreateIndex
CREATE INDEX "DailyHistory_userId_idx" ON "DailyHistory"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyHistory_userId_date_key" ON "DailyHistory"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "MealPlan_userId_key" ON "MealPlan"("userId");

-- CreateIndex
CREATE INDEX "MealPlan_userId_idx" ON "MealPlan"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutPlan_userId_key" ON "WorkoutPlan"("userId");

-- CreateIndex
CREATE INDEX "WorkoutPlan_userId_idx" ON "WorkoutPlan"("userId");

-- AddForeignKey
ALTER TABLE "WorkoutPlan" ADD CONSTRAINT "WorkoutPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlan" ADD CONSTRAINT "MealPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyHistory" ADD CONSTRAINT "DailyHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
