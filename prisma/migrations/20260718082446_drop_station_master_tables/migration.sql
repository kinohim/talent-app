-- DropForeignKey
ALTER TABLE "employee" DROP CONSTRAINT "employee_nearestStationId_fkey";

-- DropForeignKey
ALTER TABLE "site" DROP CONSTRAINT "site_nearestStationId_fkey";

-- DropForeignKey
ALTER TABLE "station_line_link" DROP CONSTRAINT "station_line_link_lineId_fkey";

-- DropForeignKey
ALTER TABLE "station_line_link" DROP CONSTRAINT "station_line_link_stationId_fkey";

-- AlterTable
ALTER TABLE "employee" DROP COLUMN "nearestStationId";

-- AlterTable
ALTER TABLE "site" DROP COLUMN "nearestStationId";

-- DropTable
DROP TABLE "railway_line";

-- DropTable
DROP TABLE "station";

-- DropTable
DROP TABLE "station_line_link";

