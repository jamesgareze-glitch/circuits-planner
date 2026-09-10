-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "dateIsGuess" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rawContent" TEXT,
ADD COLUMN     "title" TEXT,
ALTER COLUMN "targetMinutes" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SessionExercise" ALTER COLUMN "allocatedMinutes" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "recencyFilter" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "recencyWeeks" INTEGER NOT NULL DEFAULT 2;
