-- AlterTable
ALTER TABLE "Table" ADD COLUMN "mergedSessionId" TEXT REFERENCES "TableSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Table_mergedSessionId_idx" ON "Table"("mergedSessionId");
