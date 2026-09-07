-- CreateTable
CREATE TABLE "BestOfRound" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tableSessionId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "queue" TEXT NOT NULL DEFAULT '[]',
    "winners" TEXT NOT NULL DEFAULT '[]',
    "pair" TEXT NOT NULL DEFAULT '[]',
    "votes" TEXT NOT NULL DEFAULT '{}',
    "championId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BestOfRound_tableSessionId_fkey" FOREIGN KEY ("tableSessionId") REFERENCES "TableSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "BestOfRound_tableSessionId_createdAt_idx" ON "BestOfRound"("tableSessionId", "createdAt");
