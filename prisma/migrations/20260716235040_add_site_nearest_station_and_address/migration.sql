-- AlterTable
ALTER TABLE "site" ADD COLUMN     "address" TEXT,
ADD COLUMN     "nearestStationId" INTEGER;

-- AddForeignKey
ALTER TABLE "site" ADD CONSTRAINT "site_nearestStationId_fkey" FOREIGN KEY ("nearestStationId") REFERENCES "station"("id") ON DELETE SET NULL ON UPDATE CASCADE;
