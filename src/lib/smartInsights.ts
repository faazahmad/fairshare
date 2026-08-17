import type { Debt, Expense, Group, LedgerState } from '../domain/types'
import { calculateBalances, simplifyDebts } from '../domain/money'

export interface SmartInsights {
  debts: Debt[]
  totalOutstanding: number
  largestDebt?: Debt
  topCategory?: { category: string; amount: number; share: number }
  oldestOpenExpense?: Expense
  personalDirection: 'owed' | 'owing' | 'settled'
  personalAmount: number
  recommendations: Array<{
    id: string
    title: string
    copy: string
    kind: 'remind' | 'settle' | 'spending' | 'clean'
  }>
}

export function buildSmartInsights(state: LedgerState, group: Group): SmartInsights {
  const expenses = state.expenses.filter((expense) => expense.groupId === group.id)
  const payments = state.payments.filter((payment) => payment.groupId === group.id)
  const balances = calculateBalances(group.memberIds, expenses, payments, 'INR')
  const debts = simplifyDebts(balances)
  const currentBalance = balances[state.currentUserId] ?? 0
  const largestDebt = [...debts].sort((a, b) => b.amount - a.amount)[0]
  const totalSpend = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const categories = new Map<string, number>()
  for (const expense of expenses) categories.set(expense.category, (categories.get(expense.category) ?? 0) + expense.amount)
  const topCategoryEntry = [...categories.entries()].sort((a, b) => b[1] - a[1])[0]
  const topCategory = topCategoryEntry
    ? { category: topCategoryEntry[0], amount: topCategoryEntry[1], share: totalSpend ? topCategoryEntry[1] / totalSpend : 0 }
    : undefined
  const oldestOpenExpense = [...expenses].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))[0]
  const recommendations: SmartInsights['recommendations'] = []

  const incoming = debts.find((debt) => debt.toUserId === state.currentUserId)
  const outgoing = debts.find((debt) => debt.fromUserId === state.currentUserId)
  if (incoming) recommendations.push({ id: 'remind-largest', title: 'A friendly nudge could close this group', copy: 'Prepare a balance-aware reminder for the largest amount owed to you.', kind: 'remind' })
  if (outgoing) recommendations.push({ id: 'settle-largest', title: 'One payment reduces your outstanding balance', copy: 'Fairshare has prefilled the most useful settlement to record next.', kind: 'settle' })
  if (topCategory && topCategory.share >= 0.35) recommendations.push({ id: 'category-focus', title: `${topCategory.category} drives ${Math.round(topCategory.share * 100)}% of spend`, copy: 'This category is unusually dominant in the group total.', kind: 'spending' })
  recommendations.push({ id: 'clean-plan', title: `${debts.length || 'No'} transfer${debts.length === 1 ? '' : 's'} in the cleanest settle plan`, copy: group.simplifyDebts ? 'Debt simplification is active and preserves every member’s net balance.' : 'Turn on simplification to reduce the number of payment paths.', kind: 'clean' })

  return {
    debts,
    totalOutstanding: debts.reduce((sum, debt) => sum + debt.amount, 0),
    largestDebt,
    topCategory,
    oldestOpenExpense,
    personalDirection: currentBalance > 0 ? 'owed' : currentBalance < 0 ? 'owing' : 'settled',
    personalAmount: Math.abs(currentBalance),
    recommendations,
  }
}
