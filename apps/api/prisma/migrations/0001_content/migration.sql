-- CreateTable
CREATE TABLE "Profile" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(5000) NOT NULL,
    "specialization" VARCHAR(160),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileLink" (
    "id" UUID NOT NULL,
    "profileId" INTEGER NOT NULL DEFAULT 1,
    "label" VARCHAR(80) NOT NULL,
    "url" VARCHAR(2048) NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" UUID NOT NULL,
    "profileId" INTEGER NOT NULL DEFAULT 1,
    "name" VARCHAR(80) NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Experience" (
    "id" UUID NOT NULL,
    "profileId" INTEGER NOT NULL DEFAULT 1,
    "company" VARCHAR(160) NOT NULL,
    "position" VARCHAR(160) NOT NULL,
    "description" VARCHAR(5000),
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Experience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" UUID NOT NULL,
    "profileId" INTEGER NOT NULL DEFAULT 1,
    "name" VARCHAR(160) NOT NULL,
    "description" VARCHAR(5000) NOT NULL,
    "websiteUrl" VARCHAR(2048),
    "repositoryUrl" VARCHAR(2048),
    "imageUrl" VARCHAR(2048),
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfileLink_profileId_position_idx" ON "ProfileLink"("profileId", "position");

-- CreateIndex
CREATE INDEX "Skill_profileId_sortOrder_createdAt_id_idx" ON "Skill"("profileId", "sortOrder", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_profileId_normalizedName_key" ON "Skill"("profileId", "normalizedName");

-- CreateIndex
CREATE INDEX "Experience_profileId_sortOrder_createdAt_id_idx" ON "Experience"("profileId", "sortOrder", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Project_profileId_sortOrder_createdAt_id_idx" ON "Project"("profileId", "sortOrder", "createdAt", "id");

-- AddForeignKey
ALTER TABLE "ProfileLink" ADD CONSTRAINT "ProfileLink_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Experience" ADD CONSTRAINT "Experience_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Domain invariants not represented by Prisma schema attributes.
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_singleton" CHECK ("id" = 1);
ALTER TABLE "Experience" ADD CONSTRAINT "Experience_dates" CHECK ("endDate" IS NULL OR "endDate" >= "startDate");
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_order" CHECK ("sortOrder" BETWEEN 0 AND 9999);
ALTER TABLE "Experience" ADD CONSTRAINT "Experience_order" CHECK ("sortOrder" BETWEEN 0 AND 9999);
ALTER TABLE "Project" ADD CONSTRAINT "Project_order" CHECK ("sortOrder" BETWEEN 0 AND 9999);
