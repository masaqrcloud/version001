-- AlterTable
ALTER TABLE "PasaparolaRound" ADD COLUMN "currentLetter" TEXT NOT NULL DEFAULT 'A';
ALTER TABLE "PasaparolaRound" ADD COLUMN "letterEndsAt" DATETIME;
