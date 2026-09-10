-- AlterTable
ALTER TABLE "Session" ADD COLUMN "sourceFilename" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Session_sourceFilename_key" ON "Session"("sourceFilename");
