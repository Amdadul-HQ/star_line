-- AlterTable
ALTER TABLE "Route" ADD COLUMN     "acFareBdt" INTEGER;

-- AlterTable
ALTER TABLE "RouteStop" ADD COLUMN     "counterAddress" TEXT,
ADD COLUMN     "counterPhone" TEXT,
ADD COLUMN     "isCounter" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "note" TEXT;

-- CreateTable
CREATE TABLE "RouteStopStaff" (
    "routeStopId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "RouteStopStaff_pkey" PRIMARY KEY ("routeStopId","userId")
);

-- AddForeignKey
ALTER TABLE "RouteStopStaff" ADD CONSTRAINT "RouteStopStaff_routeStopId_fkey" FOREIGN KEY ("routeStopId") REFERENCES "RouteStop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteStopStaff" ADD CONSTRAINT "RouteStopStaff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
