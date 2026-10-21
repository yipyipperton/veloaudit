-- DropIndex
DROP INDEX "Budget_url_strategy_idx";

-- DropIndex
DROP INDEX "Budget_url_strategy_source_metric_key";

-- AlterTable
ALTER TABLE "Audit" ADD COLUMN     "ownerHash" TEXT;

-- AlterTable
ALTER TABLE "AuditRun" ADD COLUMN     "ownerHash" TEXT;

-- AlterTable
ALTER TABLE "Budget" ADD COLUMN     "ownerHash" TEXT;

-- CreateIndex
CREATE INDEX "Audit_ownerHash_createdAt_idx" ON "Audit"("ownerHash", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Audit_ownerHash_url_strategy_createdAt_idx" ON "Audit"("ownerHash", "url", "strategy", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditRun_ownerHash_createdAt_idx" ON "AuditRun"("ownerHash", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Budget_ownerHash_url_strategy_idx" ON "Budget"("ownerHash", "url", "strategy");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_ownerHash_url_strategy_source_metric_key" ON "Budget"("ownerHash", "url", "strategy", "source", "metric");

