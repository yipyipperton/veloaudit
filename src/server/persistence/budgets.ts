import type { Budget, MetricSource, Strategy } from "@prisma/client";
import { prisma } from "./db";

/** Budgets are private to their owner. */
export function listBudgets(ownerHash: string, url: string, strategy: Strategy): Promise<Budget[]> {
  return prisma.budget.findMany({ where: { ownerHash, url, strategy }, orderBy: [{ source: "asc" }, { metric: "asc" }] });
}
/** Upsert: one target per (owner, url, strategy, source, metric). */
export function upsertBudget(input: { ownerHash: string; url: string; strategy: Strategy; source: MetricSource; metric: string; threshold: number }): Promise<Budget> {
  const { ownerHash, url, strategy, source, metric, threshold } = input;
  return prisma.budget.upsert({
    where: { ownerHash_url_strategy_source_metric: { ownerHash, url, strategy, source, metric } },
    create: input,
    update: { threshold },
  });
}
/** Deletes only if the budget belongs to the owner (others' ids behave as not found). */
export async function deleteBudget(id: string, ownerHash: string): Promise<boolean> {
  const r = await prisma.budget.deleteMany({ where: { id, ownerHash } });
  return r.count > 0;
}
