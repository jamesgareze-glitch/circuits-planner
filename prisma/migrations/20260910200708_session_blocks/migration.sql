-- CreateTable
CREATE TABLE "SessionBlock" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "categoryId" TEXT,
    "textContent" TEXT,

    CONSTRAINT "SessionBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SessionBlock_sessionId_idx" ON "SessionBlock"("sessionId");

-- AddForeignKey
ALTER TABLE "SessionBlock" ADD CONSTRAINT "SessionBlock_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionBlock" ADD CONSTRAINT "SessionBlock_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "SessionExercise" ADD COLUMN "blockId" TEXT,
ADD COLUMN "weight" DOUBLE PRECISION,
ADD COLUMN "reps" INTEGER;

-- CreateIndex
CREATE INDEX "SessionExercise_blockId_idx" ON "SessionExercise"("blockId");

-- AddForeignKey
ALTER TABLE "SessionExercise" ADD CONSTRAINT "SessionExercise_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "SessionBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN "exercisesPerCategoryDefault" INTEGER NOT NULL DEFAULT 1;
