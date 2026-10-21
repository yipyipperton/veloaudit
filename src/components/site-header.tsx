import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

export function Logo() {
  return (
    <span className="brand-gradient grid size-6 place-items-center rounded-[7px] shadow-[0_0_0_1px_oklch(1_0_0/12%)_inset,0_4px_12px_-4px_oklch(0.56_0.22_277/60%)]">
      <svg viewBox="0 0 24 24" className="size-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 17a8 8 0 1 1 16 0" /><path d="M12 17l4.5-5" />
      </svg>
    </span>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/70 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 text-[15px] font-semibold tracking-tight">
          <Logo /> VeloAudit
        </Link>
        <nav className="flex items-center gap-0.5 text-[13px]">
          <Link href="/#audits" className="hidden rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground sm:block">Audits</Link>
          <a href="https://github.com/yipyipperton/veloaudit/blob/main/docs/API.md" className="hidden rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground sm:block">API</a>
          <a href="https://github.com/yipyipperton/veloaudit" className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground">GitHub</a>
          <span className="mx-1.5 h-4 w-px bg-border" />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-[13px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2.5"><Logo /><span>VeloAudit · data from Google PageSpeed Insights &amp; Chrome UX Report</span></div>
        <div className="flex gap-5">
          <a className="hover:text-foreground" href="https://github.com/yipyipperton/veloaudit/blob/main/ARCHITECTURE.md">Architecture</a>
          <a className="hover:text-foreground" href="https://github.com/yipyipperton/veloaudit/blob/main/docs/API.md">API</a>
          <a className="hover:text-foreground" href="https://github.com/yipyipperton/veloaudit">Source</a>
        </div>
      </div>
    </footer>
  );
}
