import { defineConfig } from "vitest/config";
import path from "node:path";

const alias = { "@": path.resolve(import.meta.dirname, "src") };
const TEST_DB = process.env.TEST_DATABASE_URL ?? "postgresql://velo:velo@localhost:5432/veloaudit_test?schema=public";

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      { resolve: { alias }, test: { name: "unit", include: ["tests/unit/**/*.test.ts"], environment: "node" } },
      {
        resolve: { alias },
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          fileParallelism: false,
          globalSetup: ["tests/integration/global-setup.ts"],
          env: {
            DATABASE_URL: TEST_DB,
            REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
            AUDIT_QUEUE_NAME: "audits-test",
            DNS_RESOLVER: process.env.DNS_RESOLVER ?? "system",
            PSI_API_KEY: "",
          },
        },
      },
    ],
  },
});
