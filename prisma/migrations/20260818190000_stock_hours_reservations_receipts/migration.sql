-- AlterTable
ALTER TABLE "Venue" ADD COLUMN "openingHours" TEXT;
ALTER TABLE "MenuItem" ADD COLUMN "stockTracked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MenuItem" ADD COLUMN "stockQuantity" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MenuItem" ADD COLUMN "lowStockThreshold" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "Guest" ADD COLUMN "receiptEmail" TEXT;
ALTER TABLE "Guest" ADD COLUMN "receiptSentAt" DATETIME;

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "venueId" TEXT NOT NULL,
    "tableId" TEXT,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "guestCount" INTEGER NOT NULL,
    "reservationDate" TEXT NOT NULL,
    "reservationTime" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Reservation_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Reservation_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Reservation_venueId_reservationDate_reservationTime_idx" ON "Reservation"("venueId", "reservationDate", "reservationTime");
CREATE INDEX "Reservation_status_createdAt_idx" ON "Reservation"("status", "createdAt");
