import { describe, expect, it } from 'vitest'
import { seedState } from '../data/seed'
import { buildSmartInsights } from './smartInsights'

describe('Fairshare Smart insights', () => {
  it('turns a group ledger into a balanced, actionable settle plan', () => {
    const group = seedState.groups.find((candidate) => candidate.id === 'g-goa')
    expect(group).toBeDefined()

    const insights = buildSmartInsights(seedState, group!)
    const incoming = new Map<string, number>()
    const outgoing = new Map<string, number>()

    for (const debt of insights.debts) {
      outgoing.set(debt.fromUserId, (outgoing.get(debt.fromUserId) ?? 0) + debt.amount)
      incoming.set(debt.toUserId, (incoming.get(debt.toUserId) ?? 0) + debt.amount)
    }

    expect(insights.totalOutstanding).toBeGreaterThan(0)
    expect(insights.largestDebt?.amount).toBeGreaterThan(0)
    expect(insights.topCategory?.share).toBeGreaterThan(0)
    expect(insights.recommendations.at(-1)?.kind).toBe('clean')
    expect([...incoming.values()].reduce((sum, amount) => sum + amount, 0)).toBe(
      [...outgoing.values()].reduce((sum, amount) => sum + amount, 0),
    )
  })

  it('reports a settled group without proposing a transfer', () => {
    const group = { ...seedState.groups[0]!, id: 'g-empty', memberIds: ['u-you', 'u-maya'] }
    const state = { ...seedState, groups: [group], expenses: [], payments: [] }
    const insights = buildSmartInsights(state, group)

    expect(insights.debts).toEqual([])
    expect(insights.personalDirection).toBe('settled')
    expect(insights.totalOutstanding).toBe(0)
  })
})
