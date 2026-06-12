ALTER TABLE "AccessKey"
ADD COLUMN "wheelNumber" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "AccessKey"
ADD CONSTRAINT "AccessKey_wheelNumber_check"
CHECK ("wheelNumber" BETWEEN 1 AND 4);

CREATE INDEX "AccessKey_wheelNumber_active_deletedAt_idx"
ON "AccessKey"("wheelNumber", "active", "deletedAt");
