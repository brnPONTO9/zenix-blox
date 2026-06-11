ALTER TABLE "WheelItem"
ADD COLUMN "wheelNumber" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "SpinHistory"
ADD COLUMN "wheelNumber" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "WheelItem"
ADD CONSTRAINT "WheelItem_wheelNumber_check"
CHECK ("wheelNumber" BETWEEN 1 AND 4);

ALTER TABLE "SpinHistory"
ADD CONSTRAINT "SpinHistory_wheelNumber_check"
CHECK ("wheelNumber" BETWEEN 1 AND 4);

CREATE INDEX "WheelItem_wheelNumber_active_deletedAt_idx"
ON "WheelItem"("wheelNumber", "active", "deletedAt");
