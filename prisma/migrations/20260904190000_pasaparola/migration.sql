-- CreateTable
CREATE TABLE "PasaparolaWord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "letter" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "clue" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "PasaparolaRound" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tableSessionId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" DATETIME NOT NULL,
    "wordIds" TEXT NOT NULL,
    "claims" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasaparolaRound_tableSessionId_fkey" FOREIGN KEY ("tableSessionId") REFERENCES "TableSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PasaparolaPlay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roundId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "answers" TEXT NOT NULL DEFAULT '{}',
    "score" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PasaparolaPlay_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "PasaparolaRound" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PasaparolaPlay_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PasaparolaWord_letter_idx" ON "PasaparolaWord"("letter");

-- CreateIndex
CREATE INDEX "PasaparolaRound_tableSessionId_startedAt_idx" ON "PasaparolaRound"("tableSessionId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasaparolaPlay_roundId_guestId_key" ON "PasaparolaPlay"("roundId", "guestId");
