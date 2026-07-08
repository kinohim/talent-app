-- CreateEnum
CREATE TYPE "OrgLevel" AS ENUM ('DIVISION', 'DEPARTMENT', 'GROUP');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'HR_SALES';

-- AlterTable
ALTER TABLE "department" ADD COLUMN     "orgLevel" "OrgLevel" NOT NULL,
ADD COLUMN     "parentId" INTEGER;

-- AlterTable
ALTER TABLE "project" DROP COLUMN "siteName",
ADD COLUMN     "siteId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "user" DROP COLUMN "passwordHash",
DROP COLUMN "passwordResetExpiresAt",
DROP COLUMN "passwordResetToken",
DROP COLUMN "username",
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "email" SET NOT NULL;

-- CreateTable
CREATE TABLE "site" (
    "id" SERIAL NOT NULL,
    "siteName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "site_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "department_parentId_idx" ON "department"("parentId");

-- CreateIndex
CREATE INDEX "project_siteId_idx" ON "project"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- AddForeignKey
ALTER TABLE "department" ADD CONSTRAINT "department_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

