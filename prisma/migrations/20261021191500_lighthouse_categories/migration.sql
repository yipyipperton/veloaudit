-- AlterTable
ALTER TABLE "Audit" ADD COLUMN     "accessibilityScore" DOUBLE PRECISION,
ADD COLUMN     "bestPracticesScore" DOUBLE PRECISION,
ADD COLUMN     "categories" JSONB,
ADD COLUMN     "seoScore" DOUBLE PRECISION;

