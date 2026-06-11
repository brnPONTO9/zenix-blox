CREATE TABLE "AutoKeyGrant" (
    "id" TEXT NOT NULL,
    "deviceHash" TEXT NOT NULL,
    "ipHash" TEXT,
    "accessKeyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutoKeyGrant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AutoKeyGrant_deviceHash_key" ON "AutoKeyGrant"("deviceHash");
CREATE UNIQUE INDEX "AutoKeyGrant_ipHash_key" ON "AutoKeyGrant"("ipHash");
CREATE UNIQUE INDEX "AutoKeyGrant_accessKeyId_key" ON "AutoKeyGrant"("accessKeyId");

ALTER TABLE "AutoKeyGrant"
ADD CONSTRAINT "AutoKeyGrant_accessKeyId_fkey"
FOREIGN KEY ("accessKeyId") REFERENCES "AccessKey"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
