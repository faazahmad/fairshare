import type { Allocation, Debt, Expense, ID, Payment } from './types'

const EPSILON = 0.000_001

export function parseMoney(value: string): number | null {
  const normalized = value.trim().replace(/,/g, '')
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null

  const [whole = '0', fraction = ''] = normalized.split('.')
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null
}

export function formatMoney(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount / 100)
}

function allocateByWeights(total: number, weightedUsers: Array<{ userId: ID; weight: number }>): Allocation[] {
  if (!Number.isSafeInteger(total) || total < 0) {
    throw new Error('Total must be a non-negative integer in minor units.')
  }
  if (weightedUsers.length === 0) throw new Error('At least one participant is required.')
  if (weightedUsers.some(({ weight }) => !Number.isFinite(weight) || weight < 0)) {
    throw new Error('Weights must be finite and non-negative.')
  }

  const weightTotal = weightedUsers.reduce((sum, entry) => sum + entry.weight, 0)
  if (weightTotal <= 0) throw new Error('At least one weight must be greater than zero.')

  const raw = weightedUsers.map((entry, index) => {
    const exact = (total * entry.weight) / weightTotal
    const floor = Math.floor(exact)
    return { ...entry, index, amount: floor, remainder: exact - floor }
  })

  const remaining = total - raw.reduce((sum, entry) => sum + entry.amount, 0)
  const remainderOrder = [...raw].sort(
    (a, b) => b.remainder - a.remainder || a.index - b.index,
  )

  for (let index = 0; index < remaining; index += 1) {
    const recipient = remainderOrder[index % remainderOrder.length]
    if (recipient) recipient.amount += 1
  }

  return raw.map(({ userId, amount }) => ({ userId, amount }))
}

export function splitEqually(total: number, userIds: ID[]): Allocation[] {
  return allocateByWeights(total, userIds.map((userId) => ({ userId, weight: 1 })))
}

export function splitByShares(total: number, shares: Array<{ userId: ID; shares: number }>): Allocation[] {
  return allocateByWeights(
    total,
    shares.map(({ userId, shares: weight }) => ({ userId, weight })),
  )
}

export function splitByPercentages(
  total: number,
  percentages: Array<{ userId: ID; percentage: number }>,
): Allocation[] {
  const percentageTotal = percentages.reduce((sum, entry) => sum + entry.percentage, 0)
  if (Math.abs(percentageTotal - 100) > EPSILON) {
    throw new Error('Percentages must add up to 100.')
  }
  return allocateByWeights(
    total,
    percentages.map(({ userId, percentage }) => ({ userId, weight: percentage })),
  )
}

export function validateExactSplit(total: number, allocations: Allocation[]): Allocation[] {
  const allocated = allocations.reduce((sum, entry) => sum + entry.amount, 0)
  if (allocated !== total) throw new Error('Exact amounts must add up to the expense total.')
  if (allocations.some((entry) => !Number.isSafeInteger(entry.amount) || entry.amount < 0)) {
    throw new Error('Exact amounts must be non-negative integers in minor units.')
  }
  return allocations
}

export function assertExpenseInvariant(expense: Expense): void {
  const paid = expense.payers.reduce((sum, entry) => sum + entry.amount, 0)
  const owed = expense.shares.reduce((sum, entry) => sum + entry.amount, 0)
  if (paid !== expense.amount || owed !== expense.amount) {
    throw new Error('Paid and owed allocations must both equal the expense total.')
  }
}

export function calculateBalances(
  memberIds: ID[],
  expenses: Expense[],
  payments: Payment[],
  currency: string,
): Record<ID, number> {
  const balances = Object.fromEntries(memberIds.map((id) => [id, 0])) as Record<ID, number>

  for (const expense of expenses.filter((entry) => entry.currency === currency)) {
    assertExpenseInvariant(expense)
    for (const payer of expense.payers) balances[payer.userId] = (balances[payer.userId] ?? 0) + payer.amount
    for (const share of expense.shares) balances[share.userId] = (balances[share.userId] ?? 0) - share.amount
  }

  for (const payment of payments.filter((entry) => entry.currency === currency)) {
    balances[payment.fromUserId] = (balances[payment.fromUserId] ?? 0) + payment.amount
    balances[payment.toUserId] = (balances[payment.toUserId] ?? 0) - payment.amount
  }

  return balances
}

export function simplifyDebts(balances: Record<ID, number>): Debt[] {
  const debtors = Object.entries(balances)
    .filter(([, amount]) => amount < 0)
    .map(([userId, amount]) => ({ userId, amount: -amount }))
    .sort((a, b) => b.amount - a.amount || a.userId.localeCompare(b.userId))

  const creditors = Object.entries(balances)
    .filter(([, amount]) => amount > 0)
    .map(([userId, amount]) => ({ userId, amount }))
    .sort((a, b) => b.amount - a.amount || a.userId.localeCompare(b.userId))

  const net = Object.values(balances).reduce((sum, amount) => sum + amount, 0)
  if (net !== 0) throw new Error('Balances must net to zero before simplification.')

  const debts: Debt[] = []
  let debtorIndex = 0
  let creditorIndex = 0

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex]
    const creditor = creditors[creditorIndex]
    if (!debtor || !creditor) break

    const amount = Math.min(debtor.amount, creditor.amount)
    if (amount > 0) debts.push({ fromUserId: debtor.userId, toUserId: creditor.userId, amount })
    debtor.amount -= amount
    creditor.amount -= amount
    if (debtor.amount === 0) debtorIndex += 1
    if (creditor.amount === 0) creditorIndex += 1
  }

  return debts
}
