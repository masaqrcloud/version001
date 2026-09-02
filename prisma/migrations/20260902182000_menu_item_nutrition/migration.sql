-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN "allergens" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "MenuItem" ADD COLUMN "animalSource" TEXT;
ALTER TABLE "MenuItem" ADD COLUMN "containsAlcohol" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MenuItem" ADD COLUMN "containsPork" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MenuItem" ADD COLUMN "calories" INTEGER;
