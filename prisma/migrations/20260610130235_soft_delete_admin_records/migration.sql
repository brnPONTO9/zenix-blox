-- AlterTable
ALTER TABLE "AccessKey" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "WheelItem" ADD COLUMN     "deletedAt" TIMESTAMP(3);
