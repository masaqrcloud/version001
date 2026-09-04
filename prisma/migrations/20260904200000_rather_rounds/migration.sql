-- CreateTable
CREATE TABLE "RatherRound" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tableSessionId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "votes" TEXT NOT NULL DEFAULT '{}',
    "seenIds" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RatherRound_tableSessionId_fkey" FOREIGN KEY ("tableSessionId") REFERENCES "TableSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RatherRound_tableSessionId_createdAt_idx" ON "RatherRound"("tableSessionId", "createdAt");
