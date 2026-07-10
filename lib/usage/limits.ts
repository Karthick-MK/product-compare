import { db } from '@/lib/db/prisma'
import type { Plan, UsageLimits } from '@/types'

const PLAN_LIMITS: Record<Plan, UsageLimits> = {
  admin: { maxComparisons: null, maxAiCallsPerMonth: null, maxProductsPerComparison: 6 },
  free:  { maxComparisons: 3,    maxAiCallsPerMonth: 10,   maxProductsPerComparison: 3 },
  pro:   { maxComparisons: null, maxAiCallsPerMonth: 100,  maxProductsPerComparison: 6 },
}

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

async function getOrCreateUsage(workspaceId: string) {
  const month = currentMonth()
  return db.usage.upsert({
    where: { workspaceId_month: { workspaceId, month } },
    create: { workspaceId, month },
    update: {},
  })
}

export async function checkAiGenerationLimit(workspaceId: string, plan: string): Promise<void> {
  const limits = PLAN_LIMITS[plan as Plan] ?? PLAN_LIMITS.free
  if (limits.maxAiCallsPerMonth === null) return

  const usage = await getOrCreateUsage(workspaceId)
  if (usage.aiCalls >= limits.maxAiCallsPerMonth) {
    throw new Error(`AI generation limit reached (${limits.maxAiCallsPerMonth}/month). Upgrade to Pro.`)
  }
}

export async function incrementAiUsage(workspaceId: string): Promise<void> {
  const month = currentMonth()
  await db.usage.upsert({
    where: { workspaceId_month: { workspaceId, month } },
    create: { workspaceId, month, aiCalls: 1 },
    update: { aiCalls: { increment: 1 } },
  })
}

export async function checkComparisonLimit(workspaceId: string, plan: string): Promise<void> {
  const limits = PLAN_LIMITS[plan as Plan] ?? PLAN_LIMITS.free
  if (limits.maxComparisons === null) return

  const count = await db.comparison.count({ where: { workspaceId } })
  if (count >= limits.maxComparisons) {
    throw new Error(`Comparison limit reached (${limits.maxComparisons} max on free plan). Upgrade to Pro.`)
  }
}

export function getMaxProducts(plan: string): number {
  return (PLAN_LIMITS[plan as Plan] ?? PLAN_LIMITS.free).maxProductsPerComparison
}
