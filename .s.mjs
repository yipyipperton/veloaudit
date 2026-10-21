import { chromium } from "@playwright/test";
const [base, rid, prefix] = process.argv.slice(2);
const b = await chromium.launch();
for (const theme of ["light", "dark"]) for (const [vw, tag] of [[1360, "desktop-vp"], [390, "mobile-vp"]]) {
  const ctx = await b.newContext({ viewport: { width: vw, height: 900 }, colorScheme: theme, deviceScaleFactor: tag === "mobile-vp" ? 2 : 1 });
  await ctx.addInitScript((t) => localStorage.setItem("theme", t), theme);
  const p = await ctx.newPage();
  for (const tab of ["mobile", "desktop"]) {
    await p.goto(`${base}/runs/${rid}?tab=${tab}`); await p.waitForSelector('[data-testid=score]'); await p.waitForTimeout(1500);
    if (tab === "mobile") { const s = p.locator("[data-testid=opportunities] summary").first(); await s.click(); }
    await p.screenshot({ path: `${prefix}-${tab}-tab-${theme}-${tag}.png`, fullPage: true });
  }
  await ctx.close();
}
await b.close();
