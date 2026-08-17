import { describe, expect, it } from 'vitest'
import type { Expense, Payment } from './types'
import {
  calculateBalances,
  parseMoney,
  simplifyDebts,
  splitByPercentages,
  splitByShares,
  splitEqually,
  validateExactSplit,
} from './money'

describe('money parsing', () => {
  it('parses major units without floating-point storage', () => {
    expect(parseMoney('1,234.56')).toBe(123456)
    expect(parseMoney('25')).toBe(2500)
    expect(parseMoney('0')).toBeNull()
    expect(parseMoney('12.345')).toBeNull()
  })
})

describe('split allocation', () => {
  it('uses deterministic largest-remainder rounding for equal splits', () => {
    expect(splitEqually(100, ['a', 'b', 'c'])).toEqual([
      { userId: 'a', amount: 34 },
      { userId: 'b', amount: 33 },
      { userId: 'c', amount: 33 },
    ])
  })

  it('allocates percentages and shares to the exact total', () => {
    expect(splitByPercentages(999, [
      { userId: 'a', percentage: 60 },
      { userId: 'b', percentage: 40 },
    ])).toEqual([
      { userId: 'a', amount: 599 },
      { userId: 'b', amount: 400 },
    ])

    expect(splitByShares(1000, [
      { userId: 'a', shares: 2 },
      { userId: 'b', shares: 1 },
    ])).toEqual([
      { userId: 'a', amount: 667 },
      { userId: 'b', amount: 333 },
    ])
  })

  it('rejects invalid exact and percentage splits', () => {
    expect(() => validateExactSplit(100, [{ userId: 'a', amount: 99 }])).toThrow()
    expect(() => splitByPercentages(100, [{ userId: 'a', percentage: 90 }])).toThrow()
  })
})

describe('balances and simplification', () => {
  const expense: Expense = {
    id: 'e1',
    groupId: 'g1',
    description: 'Dinner',
    category: 'Dining',
    currency: 'INR',
    amount: 3000,
    occurredAt: '2026-08-09',
    createdAt: '2026-08-09T00:00:00Z',
    createdBy: 'a',
    payers: [{ userId: 'a', amount: 3000 }],
    shares: [
      { userId: 'a', amount: 1000 },
      { userId: 'b', amount: 1000 },
      { userId: 'c', amount: 1000 },
    ],
  }

  it('derives balances from paid minus owed and applies settlements', () => {
    const before = calculateBalances(['a', 'b', 'c'], [expense], [], 'INR')
    expect(before).toEqual({ a: 2000, b: -1000, c: -1000 })

    const payment: Payment = {
      id: 'p1',
      groupId: 'g1',
      currency: 'INR',
      amount: 1000,
      fromUserId: 'b',
      toUserId: 'a',
      occurredAt: '2026-08-09',
      createdAt: '2026-08-09T00:00:00Z',
    }
    expect(calculateBalances(['a', 'b', 'c'], [expense], [payment], 'INR')).toEqual({
      a: 1000,
      b: 0,
      c: -1000,
    })
  })

  it('minimizes payment paths without changing net balances', () => {
    expect(simplifyDebts({ a: -2000, b: 0, c: 2000 })).toEqual([
      { fromUserId: 'a', toUserId: 'c', amount: 2000 },
    ])
  })
})
