-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "googleSub" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME
);

CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");
CREATE UNIQUE INDEX "Customer_googleSub_key" ON "Customer"("googleSub");
CREATE INDEX "Customer_deletedAt_idx" ON "Customer"("deletedAt");

-- CreateTable
CREATE TABLE "VenueMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "venueId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unlinkedAt" DATETIME,
    CONSTRAINT "VenueMember_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VenueMember_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "VenueMember_venueId_customerId_key" ON "VenueMember"("venueId", "customerId");
CREATE INDEX "VenueMember_venueId_unlinkedAt_idx" ON "VenueMember"("venueId", "unlinkedAt");

-- AlterTable
ALTER TABLE "Guest" ADD COLUMN "customerId" TEXT;
CREATE INDEX "Guest_customerId_idx" ON "Guest"("customerId");
