import { execSync } from "node:child_process";

export default function setup(): void {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://velo:velo@localhost:5432/veloaudit_test?schema=public";
  execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: url }, stdio: "ignore" });
}
