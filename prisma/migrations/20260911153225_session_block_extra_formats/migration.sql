-- AlterTable
ALTER TABLE "SessionBlock" ADD COLUMN     "ladderEnd" INTEGER,
ADD COLUMN     "ladderPyramid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ladderStart" INTEGER,
ADD COLUMN     "ladderStep" INTEGER,
ADD COLUMN     "ladderUnit" TEXT;
