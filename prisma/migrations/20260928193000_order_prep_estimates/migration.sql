-- AlterTable
ALTER TABLE "Venue" ADD COLUMN "kitchenCapacity" INTEGER NOT NULL DEFAULT 3;

-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN "prepMinutes" INTEGER;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "estimatedMinutes" INTEGER;
ALTER TABLE "Order" ADD COLUMN "etaExtraMinutes" INTEGER NOT NULL DEFAULT 0;
