import { prisma } from "@/server/persistence/db";
import { SYNTHETIC_PSI_WITH_FIELD } from "../fixtures/psi-synthetic";

export async function resetDb(): Promise<void> {
  await prisma.budget.deleteMany({});
  await prisma.audit.deleteMany({});
  await prisma.auditRun.deleteMany({});
}
/** SYNTHETIC PSI payload used by fake runners (not real data). */
export const syntheticPsi = (): unknown => structuredClone(SYNTHETIC_PSI_WITH_FIELD);

import { OWNER_COOKIE, encodeOwnerCookie, hashOwner } from "@/server/http/session";
/** SYNTHETIC owner ids (43-char base64url, like real ones) and their signed cookies, for isolation tests. */
export const OWNER_A = "A".repeat(43);
export const OWNER_B = "B".repeat(43);
export const cookieFor = (ownerId: string): string => `${OWNER_COOKIE}=${encodeOwnerCookie(ownerId)}`;
export const hashFor = hashOwner;
/** Extract "name=value" from a Set-Cookie header so it can be replayed as a Cookie header. */
export const replayCookie = (res: Response): string => (res.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
