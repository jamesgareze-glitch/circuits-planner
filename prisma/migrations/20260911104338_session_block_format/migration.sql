-- AlterTable
ALTER TABLE "SessionBlock"
ADD COLUMN "format" TEXT NOT NULL DEFAULT 'straight_sets',
ADD COLUMN "rounds" INTEGER,
ADD COLUMN "workSeconds" INTEGER,
ADD COLUMN "restSeconds" INTEGER,
ADD COLUMN "timeCapMinutes" INTEGER,
ADD COLUMN "isPartner" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "partnerNote" TEXT;
