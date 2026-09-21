-- AlterTable
ALTER TABLE "Venue" ADD COLUMN "reportEmail" TEXT;
ALTER TABLE "Venue" ADD COLUMN "reportMail" BOOLEAN NOT NULL DEFAULT true;
