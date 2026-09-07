-- CreateTable
CREATE TABLE "TenTenRound" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tableSessionId" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "scores" TEXT NOT NULL DEFAULT '{}',
    "seenIds" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TenTenRound_tableSessionId_fkey" FOREIGN KEY ("tableSessionId") REFERENCES "TableSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TenTenRound_tableSessionId_createdAt_idx" ON "TenTenRound"("tableSessionId", "createdAt");
