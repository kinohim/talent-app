-- CreateEnum
CREATE TYPE "Role" AS ENUM ('GENERAL', 'MANAGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "FinalSchoolType" AS ENUM ('HIGH_SCHOOL', 'VOCATIONAL', 'JUNIOR_COLLEGE', 'UNIVERSITY', 'GRAD_SCHOOL');

-- CreateEnum
CREATE TYPE "GraduationStatus" AS ENUM ('GRADUATED', 'WITHDREW');

-- CreateEnum
CREATE TYPE "SkillLevel" AS ENUM ('LOW', 'MID', 'HIGH');

-- CreateTable
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "employeeId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "email" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "passwordResetToken" TEXT,
    "passwordResetExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "department" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "departmentName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee" (
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKana" TEXT NOT NULL,
    "birthDate" DATE,
    "gender" "Gender",
    "departmentId" INTEGER,
    "nearestStationId" INTEGER,
    "experienceYears" INTEGER,
    "careerSummary" TEXT,
    "selfPr" TEXT,
    "finalSchoolName" TEXT,
    "finalDepartmentName" TEXT,
    "finalSchoolType" "FinalSchoolType",
    "graduationYearMonth" DATE,
    "graduationStatus" "GraduationStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "employee_pkey" PRIMARY KEY ("employeeId")
);

-- CreateTable
CREATE TABLE "railway_line" (
    "id" SERIAL NOT NULL,
    "lineName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "railway_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "station" (
    "id" SERIAL NOT NULL,
    "stationName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "station_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "station_line_link" (
    "id" SERIAL NOT NULL,
    "lineId" INTEGER NOT NULL,
    "stationId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "station_line_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_category" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "skill_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "skillName" TEXT NOT NULL,
    "hasVersion" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_version" (
    "id" SERIAL NOT NULL,
    "skillId" INTEGER NOT NULL,
    "versionName" TEXT NOT NULL,
    "versionOrder" INTEGER,
    "releaseDate" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "skill_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_skill_link" (
    "id" SERIAL NOT NULL,
    "employeeId" TEXT NOT NULL,
    "skillId" INTEGER NOT NULL,
    "skillVersionId" INTEGER,
    "skillLevel" "SkillLevel",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "employee_skill_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certification_category" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "certification_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certification" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "certificationName" TEXT NOT NULL,
    "certificationOrganization" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "certification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_certification_link" (
    "id" SERIAL NOT NULL,
    "employeeId" TEXT NOT NULL,
    "certificationId" INTEGER NOT NULL,
    "acquiredDate" DATE,
    "expirationDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "employee_certification_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_role" (
    "id" SERIAL NOT NULL,
    "roleName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "project_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project" (
    "id" SERIAL NOT NULL,
    "employeeId" TEXT NOT NULL,
    "siteName" TEXT NOT NULL,
    "projectTitle" TEXT NOT NULL,
    "projectSummary" TEXT,
    "startDate" DATE,
    "endDate" DATE,
    "totalTeamSize" TEXT,
    "teamSize" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_role_link" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "projectRoleId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "project_role_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_detail" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "overview" TEXT,
    "researchAnalysis" BOOLEAN,
    "requirementsDefinition" BOOLEAN,
    "basicDesign" BOOLEAN,
    "detailedDesign" BOOLEAN,
    "development" BOOLEAN,
    "testing" BOOLEAN,
    "operation" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "project_detail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_skill_link" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "skillId" INTEGER NOT NULL,
    "skillVersionId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "project_skill_link_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_employeeId_key" ON "user"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "department_code_key" ON "department"("code");

-- CreateIndex
CREATE INDEX "employee_name_idx" ON "employee"("name");

-- CreateIndex
CREATE INDEX "employee_nameKana_idx" ON "employee"("nameKana");

-- CreateIndex
CREATE INDEX "employee_departmentId_idx" ON "employee"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "station_line_link_lineId_stationId_key" ON "station_line_link"("lineId", "stationId");

-- CreateIndex
CREATE UNIQUE INDEX "skill_category_code_key" ON "skill_category"("code");

-- CreateIndex
CREATE INDEX "employee_skill_link_skillId_idx" ON "employee_skill_link"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "employee_skill_link_employeeId_skillId_skillVersionId_key" ON "employee_skill_link"("employeeId", "skillId", "skillVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "certification_category_code_key" ON "certification_category"("code");

-- CreateIndex
CREATE INDEX "employee_certification_link_certificationId_idx" ON "employee_certification_link"("certificationId");

-- CreateIndex
CREATE UNIQUE INDEX "project_role_link_projectId_projectRoleId_key" ON "project_role_link"("projectId", "projectRoleId");

-- CreateIndex
CREATE UNIQUE INDEX "project_detail_projectId_key" ON "project_detail"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "project_skill_link_projectId_skillId_skillVersionId_key" ON "project_skill_link"("projectId", "skillId", "skillVersionId");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("employeeId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee" ADD CONSTRAINT "employee_nearestStationId_fkey" FOREIGN KEY ("nearestStationId") REFERENCES "station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "station_line_link" ADD CONSTRAINT "station_line_link_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "railway_line"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "station_line_link" ADD CONSTRAINT "station_line_link_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill" ADD CONSTRAINT "skill_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "skill_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_version" ADD CONSTRAINT "skill_version_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_skill_link" ADD CONSTRAINT "employee_skill_link_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("employeeId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_skill_link" ADD CONSTRAINT "employee_skill_link_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_skill_link" ADD CONSTRAINT "employee_skill_link_skillVersionId_fkey" FOREIGN KEY ("skillVersionId") REFERENCES "skill_version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certification" ADD CONSTRAINT "certification_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "certification_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_certification_link" ADD CONSTRAINT "employee_certification_link_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("employeeId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_certification_link" ADD CONSTRAINT "employee_certification_link_certificationId_fkey" FOREIGN KEY ("certificationId") REFERENCES "certification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employee"("employeeId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_role_link" ADD CONSTRAINT "project_role_link_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_role_link" ADD CONSTRAINT "project_role_link_projectRoleId_fkey" FOREIGN KEY ("projectRoleId") REFERENCES "project_role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_detail" ADD CONSTRAINT "project_detail_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_skill_link" ADD CONSTRAINT "project_skill_link_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_skill_link" ADD CONSTRAINT "project_skill_link_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_skill_link" ADD CONSTRAINT "project_skill_link_skillVersionId_fkey" FOREIGN KEY ("skillVersionId") REFERENCES "skill_version"("id") ON DELETE SET NULL ON UPDATE CASCADE;
