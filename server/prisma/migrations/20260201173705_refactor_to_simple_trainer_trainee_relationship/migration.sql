/*
  Warnings:

  - You are about to drop the `TrainerTrainee` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "TrainerTrainee" DROP CONSTRAINT "TrainerTrainee_traineeId_fkey";

-- DropForeignKey
ALTER TABLE "TrainerTrainee" DROP CONSTRAINT "TrainerTrainee_trainerId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "trainerId" TEXT;

-- DropTable
DROP TABLE "TrainerTrainee";

-- DropEnum
DROP TYPE "RelationshipStatus";

-- CreateIndex
CREATE INDEX "User_trainerId_idx" ON "User"("trainerId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
