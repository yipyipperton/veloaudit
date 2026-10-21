-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "Strategy" AS ENUM ('MOBILE', 'DESKTOP');

-- CreateTable
CREATE TABLE "Audit" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "strategy" "Strategy" NOT NULL,
    "status" "AuditStatus" NOT NULL DEFAULT 'QUEUED',
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "finalUrl" TEXT,
    "lighthouseVersion" TEXT,
    "fetchTime" TEXT,
    "labScore" DOUBLE PRECISION,
    "labLcpMs" DOUBLE PRECISION,
    "labFcpMs" DOUBLE PRECISION,
    "labSpeedIndexMs" DOUBLE PRECISION,
    "labTbtMs" DOUBLE PRECISION,
    "labCls" DOUBLE PRECISION,
    "labTtfbMs" DOUBLE PRECISION,
    "fieldScope" TEXT,
    "fieldOverall" TEXT,
    "fieldLcpMs" DOUBLE PRECISION,
    "fieldLcpCategory" TEXT,
    "fieldInpMs" DOUBLE PRECISION,
    "fieldInpCategory" TEXT,
    "fieldCls" DOUBLE PRECISION,
    "fieldClsCategory" TEXT,
    "fieldFcpMs" DOUBLE PRECISION,
    "fieldFcpCategory" TEXT,
    "fieldTtfbMs" DOUBLE PRECISION,
    "fieldTtfbCategory" TEXT,
    "opportunities" JSONB,

    CONSTRAINT "Audit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Audit_createdAt_idx" ON "Audit"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Audit_status_idx" ON "Audit"("status");

-- CreateIndex
CREATE INDEX "Audit_url_strategy_createdAt_idx" ON "Audit"("url", "strategy", "createdAt" DESC);
