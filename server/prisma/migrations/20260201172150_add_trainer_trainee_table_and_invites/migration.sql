/*
  Warnings:

  - You are about to drop the column `trainerId` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "RelationshipStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- DropIndex
DROP INDEX "User_trainerId_idx";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "trainerId";

-- CreateTable
CREATE TABLE "TrainerTrainee" (
    "id" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "traineeId" TEXT NOT NULL,
    "status" "RelationshipStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainerTrainee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainerInvite" (
    "id" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "traineeEmail" VARCHAR(255) NOT NULL,
    "traineeId" TEXT,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainerInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainerTrainee_trainerId_idx" ON "TrainerTrainee"("trainerId");

-- CreateIndex
CREATE INDEX "TrainerTrainee_traineeId_idx" ON "TrainerTrainee"("traineeId");

-- CreateIndex
CREATE INDEX "TrainerTrainee_status_idx" ON "TrainerTrainee"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TrainerTrainee_trainerId_traineeId_key" ON "TrainerTrainee"("trainerId", "traineeId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainerInvite_inviteCode_key" ON "TrainerInvite"("inviteCode");

-- CreateIndex
CREATE INDEX "TrainerInvite_trainerId_idx" ON "TrainerInvite"("trainerId");

-- CreateIndex
CREATE INDEX "TrainerInvite_traineeId_idx" ON "TrainerInvite"("traineeId");

-- CreateIndex
CREATE INDEX "TrainerInvite_traineeEmail_idx" ON "TrainerInvite"("traineeEmail");

-- CreateIndex
CREATE INDEX "TrainerInvite_inviteCode_idx" ON "TrainerInvite"("inviteCode");

-- CreateIndex
CREATE INDEX "TrainerInvite_status_idx" ON "TrainerInvite"("status");

-- AddForeignKey
ALTER TABLE "TrainerTrainee" ADD CONSTRAINT "TrainerTrainee_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerTrainee" ADD CONSTRAINT "TrainerTrainee_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerInvite" ADD CONSTRAINT "TrainerInvite_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerInvite" ADD CONSTRAINT "TrainerInvite_traineeId_fkey" FOREIGN KEY ("traineeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
