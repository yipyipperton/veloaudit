-- AlterTable
ALTER TABLE "Audit" ADD COLUMN     "diagnostics" JSONB,
ADD COLUMN     "fieldDistributions" JSONB,
ADD COLUMN     "labMetricScores" JSONB,
ADD COLUMN     "runId" TEXT;

-- CreateTable
CREATE TABLE "AuditRun" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditAsset" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "idx" INTEGER NOT NULL,
    "mime" TEXT NOT NULL,
    "timingMs" DOUBLE PRECISION,
    "data" BYTEA NOT NULL,

    CONSTRAINT "AuditAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditRun_createdAt_idx" ON "AuditRun"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "AuditAsset_auditId_kind_idx_key" ON "AuditAsset"("auditId", "kind", "idx");

-- CreateIndex
CREATE INDEX "Audit_runId_idx" ON "Audit"("runId");

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AuditRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditAsset" ADD CONSTRAINT "AuditAsset_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
