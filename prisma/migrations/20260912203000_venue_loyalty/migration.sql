-- AlterTable
ALTER TABLE "Venue" ADD COLUMN "loyaltyItemId" TEXT;
CREATE INDEX "Venue_loyaltyItemId_idx" ON "Venue"("loyaltyItemId");
