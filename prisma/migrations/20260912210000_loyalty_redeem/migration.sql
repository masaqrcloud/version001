-- AlterTable
ALTER TABLE "VenueMember" ADD COLUMN "loyaltyRedeemed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "OrderItem" ADD COLUMN "complimentary" BOOLEAN NOT NULL DEFAULT false;
