-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('TRAINER', 'TRAINEE', 'ADMIN');

-- DropForeignKey
ALTER TABLE "Trainee" DROP CONSTRAINT "Trainee_trainerId_fkey";

-- AlterTable
ALTER TABLE "Trainee" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'TRAINEE',
ALTER COLUMN "trainerId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Trainer" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'TRAINER';

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" TEXT NOT NULL,
    "phone" VARCHAR(20),
    "role" "UserRole" NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- AddForeignKey
ALTER TABLE "Trainee" ADD CONSTRAINT "Trainee_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "Trainer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
