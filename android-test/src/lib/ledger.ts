import type { Expense, Group, LedgerState, User } from '../domain/types'
import { calculateBalances } from '../domain/money'

export const categoryEmoji: Record<string, string> = {
  Dining: '🍜',
  Stay: '🛏️',
  Transport: '🛵',
  Groceries: '🛒',
  Rent: '🔑',
  Entertainment: '🎟️',
  Sports: '🏸',
  General: '🧾',
}

export function findUser(users: User[], id: string): User {
  const user = users.find((entry) => entry.id === id)
  if (!user) throw new Error(`Unknown user ${id}`)
  return user
}

export function shortName(user: User, currentUserId: string): string {
  return user.id === currentUserId ? 'You' : user.name.split(' ')[0] ?? user.name
}

export function groupBalance(state: LedgerState, group: Group, userId = state.currentUserId): number {
  const currency = state.users.find((user) => user.id === state.currentUserId)?.defaultCurrency ?? 'INR'
  return calculateBalances(
    group.memberIds,
    state.expenses.filter((entry) => entry.groupId === group.id),
    state.payments.filter((entry) => entry.groupId === group.id),
    currency,
  )[userId] ?? 0
}

export function expenseUserNet(expense: Expense, userId: string): number {
  const paid = expense.payers.find((entry) => entry.userId === userId)?.amount ?? 0
  const owed = expense.shares.find((entry) => entry.userId === userId)?.amount ?? 0
  return paid - owed
}
