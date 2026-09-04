-- CreateTable
CREATE TABLE "MemoryRound" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tableSessionId" TEXT NOT NULL,
    "tiles" TEXT NOT NULL,
    "faceUp" TEXT NOT NULL DEFAULT '[]',
    "matched" TEXT NOT NULL DEFAULT '{}',
    "players" TEXT NOT NULL DEFAULT '[]',
    "turnGuestId" TEXT,
    "scores" TEXT NOT NULL DEFAULT '{}',
    "hideAt" DATETIME,
    "startedAt" DATETIME,
    "endedAt" DATETIME,
    "moves" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MemoryRound_tableSessionId_fkey" FOREIGN KEY ("tableSessionId") REFERENCES "TableSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MemoryRound_tableSessionId_createdAt_idx" ON "MemoryRound"("tableSessionId", "createdAt");
