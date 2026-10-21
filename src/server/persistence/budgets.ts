import type { Budget, MetricSource, Strategy } from "@prisma/client";
import { prisma } from "./db";

export function listBudgets(url: string, strategy: Strategy): Promise<Budget[]> {
  return prisma.budget.findMany({ where: { url, strategy }, orderBy: [{ source: "asc" }, { metric: "asc" }] });
}
/** Upsert: one target per (url, strategy, source, metric). */
export function upsertBudget(input: { url: string; strategy: Strategy; source: MetricSource; metric: string; threshold: number }): Promise<Budget> {
  const { url, strategy, source, metric, threshold } = input;
  return prisma.budget.upsert({
    where: { url_strategy_source_metric: { url, strategy, source, metric } },
    create: input,
    update: { threshold },
  });
}
export async function deleteBudget(id: string): Promise<boolean> {
  const r = await prisma.budget.deleteMany({ where: { id } });
  return r.count > 0;
}
