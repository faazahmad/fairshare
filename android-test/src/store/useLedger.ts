import { useEffect, useState } from 'react'
import type { Expense, Group, LedgerState, Payment, User } from '../domain/types'
import { seedState } from '../data/seed'

const STORAGE_KEY = 'fairshare-ledger-v1'

function loadInitialState(): LedgerState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved) as LedgerState
  } catch {
    // A corrupt or unavailable local store should never prevent the app loading.
  }
  return seedState
}

export function useLedger() {
  const [state, setState] = useState<LedgerState>(loadInitialState)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  function addExpense(expense: Expense) {
    setState((current) => ({ ...current, expenses: [expense, ...current.expenses] }))
  }

  function updateExpense(expense: Expense) {
    setState((current) => ({
      ...current,
      expenses: current.expenses.map((entry) => entry.id === expense.id ? expense : entry),
    }))
  }

  function deleteExpense(expenseId: string) {
    setState((current) => ({
      ...current,
      expenses: current.expenses.filter((entry) => entry.id !== expenseId),
    }))
  }

  function addPayment(payment: Payment) {
    setState((current) => ({ ...current, payments: [payment, ...current.payments] }))
  }

  function updatePayment(payment: Payment) {
    setState((current) => ({
      ...current,
      payments: current.payments.map((entry) => entry.id === payment.id ? payment : entry),
    }))
  }

  function deletePayment(paymentId: string) {
    setState((current) => ({
      ...current,
      payments: current.payments.filter((entry) => entry.id !== paymentId),
    }))
  }

  function addGroup(group: Group) {
    setState((current) => ({ ...current, groups: [group, ...current.groups] }))
  }

  function updateGroup(group: Group) {
    setState((current) => ({
      ...current,
      groups: current.groups.map((entry) => entry.id === group.id ? group : entry),
    }))
  }

  function deleteGroup(groupId: string) {
    setState((current) => ({
      ...current,
      groups: current.groups.filter((entry) => entry.id !== groupId),
      expenses: current.expenses.filter((entry) => entry.groupId !== groupId),
      payments: current.payments.filter((entry) => entry.groupId !== groupId),
    }))
  }

  function updateCurrentUser(profile: Partial<Pick<User, 'name' | 'email' | 'avatarUrl' | 'phone' | 'instagramHandle' | 'defaultCurrency' | 'language'>>) {
    setState((current) => {
      const currentUser = current.users.find((user) => user.id === current.currentUserId)
      const nextCurrency = profile.defaultCurrency
      const currencyChanged = Boolean(nextCurrency && nextCurrency !== (currentUser?.defaultCurrency ?? 'INR'))
      return {
        ...current,
        users: current.users.map((user) => user.id === current.currentUserId
          ? {
              ...user,
              ...profile,
              initials: (profile.name ?? user.name)
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase() ?? '')
                .join(''),
            }
          : user),
        expenses: currencyChanged ? current.expenses.map((expense) => ({ ...expense, currency: nextCurrency! })) : current.expenses,
        payments: currencyChanged ? current.payments.map((payment) => ({ ...payment, currency: nextCurrency! })) : current.payments,
      }
    })
  }

  function resetDemo() {
    localStorage.removeItem(STORAGE_KEY)
    setState(seedState)
  }

  return {
    state,
    addExpense,
    updateExpense,
    deleteExpense,
    addPayment,
    updatePayment,
    deletePayment,
    addGroup,
    updateGroup,
    deleteGroup,
    updateCurrentUser,
    resetDemo,
  }
}
