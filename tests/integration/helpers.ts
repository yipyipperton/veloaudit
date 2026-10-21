import { prisma } from "@/server/persistence/db";
import { SYNTHETIC_PSI_WITH_FIELD } from "../fixtures/psi-synthetic";

export async function resetDb(): Promise<void> {
  await prisma.budget.deleteMany({});
  await prisma.audit.deleteMany({});
}
/** SYNTHETIC PSI payload used by fake runners (not real data). */
export const syntheticPsi = (): unknown => structuredClone(SYNTHETIC_PSI_WITH_FIELD);
