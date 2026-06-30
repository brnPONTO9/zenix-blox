CREATE TABLE "CentralCartOrder" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "eventId" TEXT,
    "packageId" TEXT NOT NULL,
    "packageName" TEXT,
    "buyerEmail" TEXT,
    "wheelNumber" INTEGER NOT NULL,
    "accessKeyId" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CentralCartOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CentralCartOrder_orderId_key" ON "CentralCartOrder"("orderId");
CREATE UNIQUE INDEX "CentralCartOrder_eventId_key" ON "CentralCartOrder"("eventId");
CREATE UNIQUE INDEX "CentralCartOrder_accessKeyId_key" ON "CentralCartOrder"("accessKeyId");
CREATE INDEX "CentralCartOrder_wheelNumber_idx" ON "CentralCartOrder"("wheelNumber");
CREATE INDEX "CentralCartOrder_packageId_idx" ON "CentralCartOrder"("packageId");

ALTER TABLE "CentralCartOrder" ADD CONSTRAINT "CentralCartOrder_accessKeyId_fkey" FOREIGN KEY ("accessKeyId") REFERENCES "AccessKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;
