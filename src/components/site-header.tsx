import Link from "next/link";
import { Gauge } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-7 place-items-center rounded-md bg-gradient-to-br from-violet-500 to-sky-500 text-white shadow-sm"><Gauge className="size-4" /></span>
          VeloAudit
          <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] font-normal text-muted-foreground">PSI v5</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/" className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">Dashboard</Link>
          <a href="https://github.com/yipyipperton/veloaudit" className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">GitHub</a>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
