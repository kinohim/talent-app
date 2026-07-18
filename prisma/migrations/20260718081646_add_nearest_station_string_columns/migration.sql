-- AlterTable
ALTER TABLE "employee" ADD COLUMN     "nearestStationLine" VARCHAR(100),
ADD COLUMN     "nearestStationName" VARCHAR(100);

-- AlterTable
ALTER TABLE "site" ADD COLUMN     "nearestStationLine" VARCHAR(100),
ADD COLUMN     "nearestStationName" VARCHAR(100);
