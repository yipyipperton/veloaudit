import { expect, test, type Page } from "@playwright/test";

/**
 * Two isolated browser contexts (separate cookie jars = two anonymous visitors) must not see each other's audits.
 * Audits are created through the real API from inside each page; the target is a public IP literal, and
 * whether PSI later succeeds or fails does not matter for this test.
 */
async function createAudit(page: Page, url: string): Promise<{ runId: string; auditId: string }> {
  return page.evaluate(async (u) => {
    const r = await fetch("/api/audits", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: u, strategy: "mobile" }) });
    const j = (await r.json()) as { run: { id: string; audits: { id: string }[] } };
    return { runId: j.run.id, auditId: j.run.audits[0]!.id };
  }, url);
}

test("two anonymous visitors only see their own audits; a run link still works as a share link", async ({ browser }) => {
  const alice = await browser.newContext(), bob = await browser.newContext();
  const a = await alice.newPage(), b = await bob.newPage();
  await a.goto("/"); await b.goto("/");
  const aliceRun = await createAudit(a, "https://8.8.8.8/");
  await createAudit(b, "https://1.1.1.1/");

  const owner = (await alice.cookies()).find((c) => c.name === "__Host-va_owner");
  expect(owner?.httpOnly).toBe(true);
  expect(owner?.secure).toBe(true);
  expect(owner?.sameSite).toBe("Lax");

  await a.reload(); await b.reload();
  await expect(a.getByTestId("recent-audits")).toContainText("8.8.8.8");
  await expect(a.getByTestId("recent-audits")).not.toContainText("1.1.1.1");
  await expect(b.getByTestId("recent-audits")).toContainText("1.1.1.1");
  await expect(b.getByTestId("recent-audits")).not.toContainText("8.8.8.8");

  const listB = (await b.evaluate(() => fetch("/api/audits").then((r) => r.json()))) as { audits: { id: string }[] };
  expect(listB.audits.map((x) => x.id)).not.toContain(aliceRun.auditId);

  // Bob opens Alice's link explicitly: viewable, flagged as shared, and still absent from Bob's list.
  await b.goto(`/runs/${aliceRun.runId}`);
  await expect(b.getByTestId("shared-notice")).toBeVisible();
  await a.goto(`/runs/${aliceRun.runId}`);
  await expect(a.getByTestId("shared-notice")).toHaveCount(0);
  await b.goto("/");
  await expect(b.getByTestId("recent-audits")).not.toContainText("8.8.8.8");

  // A fresh visitor with no cookie sees nothing.
  const carol = await (await browser.newContext()).newPage();
  await carol.goto("/");
  await expect(carol.getByText(/No audits yet in this browser/)).toBeVisible();
  await alice.close(); await bob.close();
});
