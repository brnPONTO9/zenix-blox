UPDATE "AccessKey"
SET
    "active" = false,
    "deletedAt" = COALESCE("deletedAt", CURRENT_TIMESTAMP)
WHERE "id" IN (
    SELECT "accessKeyId"
    FROM "AutoKeyGrant"
);

DROP TABLE "AutoKeyGrant";
