import { useEffect, useState } from 'react'
import type { Expense, Group, LedgerState, Payment, User } from '../domain/types'
import { api } from '../lib/api'
import { DIRECT_SPLIT_GROUP_ID } from '../lib/directSplits'

const STORAGE_KEY = 'fairshare-ledger-v1'

const emptyState: LedgerState = {
  currentUserId: '',
  users: [],
  groups: [],
  expenses: [],
  payments: [],
}

function computeInitials(name?: string): string {
  if (!name) return 'FS'
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function readStoredLedger(): LedgerState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as LedgerState
      if (parsed?.currentUserId && parsed.currentUserId !== 'u-you') return parsed
    }
  } catch {
    // Ignore parse errors and start from a clean state.
  }
  return emptyState
}

export function useLedger() {
  const [state, setState] = useState<LedgerState>(readStoredLedger)

  const [loading, setLoading] = useState(true)

  // Persist current state
  useEffect(() => {
    if (state.currentUserId && state.currentUserId !== 'u-you') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    }
  }, [state])

  // Sync live data from Spring Boot database on mount
  useEffect(() => {
    let active = true

    async function loadLiveData() {
      try {
        const profile = await api.users.getProfile()
        if (!active) return

        const currentUser: User = {
          id: String(profile.id),
          name: profile.name,
          email: profile.email,
          initials: profile.initials || computeInitials(profile.name),
          color: profile.color || '#173f3a',
          avatarUrl: profile.avatarUrl,
          phone: profile.phone,
          defaultCurrency: profile.defaultCurrency || 'INR',
          language: profile.language || 'en',
        }

        // Fetch groups
        let groups: Group[] = []
        try {
          const apiGroups = await api.groups.list()
          groups = (apiGroups || []).map((g: any) => ({
            id: String(g.id),
            name: g.name,
            kind: g.kind || 'other',
            emoji: g.emoji || '💰',
            memberIds: (g.memberIds || []).map(String),
            simplifyDebts: Boolean(g.simplifyDebts),
          }))
        } catch (e) {
          console.warn('Could not load groups from API', e)
        }

        // Concurrently fetch members, expenses, and payments
        const [membersResults, expensesResult, paymentsResults] = await Promise.all([
          Promise.allSettled(groups.map((g) => api.groups.getMembers(g.id))),
          api.expenses.listAllUser().catch((e) => {
            console.warn('Could not load expenses from API', e)
            return [] as Expense[]
          }),
          Promise.allSettled(groups.map((g) => api.payments.listGroup(g.id))),
        ])

        const usersMap = new Map<string, User>()
        usersMap.set(currentUser.id, currentUser)

        for (const res of membersResults) {
          if (res.status === 'fulfilled' && Array.isArray(res.value)) {
            for (const m of res.value) {
              if (m && !usersMap.has(m.id)) {
                usersMap.set(m.id, {
                  id: String(m.id),
                  name: m.name,
                  email: m.email,
                  initials: m.initials || computeInitials(m.name),
                  color: m.color || '#2d6a4f',
                  avatarUrl: m.avatarUrl,
                  phone: m.phone,
                  defaultCurrency: m.defaultCurrency || 'INR',
                  language: m.language || 'en',
                })
              }
            }
          }
        }

        const stored = readStoredLedger()
        const localDirectExpenses = stored.expenses.filter((expense) => expense.groupId === DIRECT_SPLIT_GROUP_ID)
        const directParticipantIds = new Set(localDirectExpenses.flatMap((expense) => [
          expense.createdBy,
          ...expense.payers.map((payer) => payer.userId),
          ...expense.shares.map((share) => share.userId),
        ]))
        for (const localUser of stored.users.filter((user) => directParticipantIds.has(user.id))) {
          if (!usersMap.has(localUser.id)) usersMap.set(localUser.id, localUser)
        }

        const expenses: Expense[] = [
          ...(expensesResult || []),
          ...localDirectExpenses.filter((local) => !(expensesResult || []).some((remote) => remote.id === local.id)),
        ]

        const paymentsList: Payment[] = []
        for (const res of paymentsResults) {
          if (res.status === 'fulfilled' && Array.isArray(res.value)) {
            paymentsList.push(...res.value)
          }
        }

        if (active) {
          setState({
            currentUserId: currentUser.id,
            users: Array.from(usersMap.values()),
            groups,
            expenses,
            payments: paymentsList,
          })
          setLoading(false)
        }
      } catch (err) {
        console.warn('Backend database not reachable, using current state', err)
        if (active) setLoading(false)
      }
    }

    void loadLiveData()

    return () => {
      active = false
    }
  }, [])

  async function addExpense(expense: Expense) {
    try {
      const created = await api.expenses.create(expense.groupId, expense)
      setState((current: LedgerState) => ({
        ...current,
        expenses: [created, ...current.expenses.filter((e) => e.id !== expense.id)],
      }))
    } catch (err) {
      console.warn('API expense creation failed, saving locally', err)
      setState((current: LedgerState) => ({ ...current, expenses: [expense, ...current.expenses] }))
    }
  }

  async function updateExpense(expense: Expense) {
    if (expense.groupId === DIRECT_SPLIT_GROUP_ID) {
      setState((current: LedgerState) => ({
        ...current,
        expenses: current.expenses.map((entry) => entry.id === expense.id ? expense : entry),
      }))
      return
    }
    try {
      const updated = await api.expenses.update(expense.id, expense)
      setState((current: LedgerState) => ({
        ...current,
        expenses: current.expenses.map((entry) => (entry.id === expense.id ? updated : entry)),
      }))
    } catch (err) {
      console.warn('API expense update failed, saving locally', err)
      setState((current: LedgerState) => ({
        ...current,
        expenses: current.expenses.map((entry) => (entry.id === expense.id ? expense : entry)),
      }))
    }
  }

  async function deleteExpense(expenseId: string) {
    const directExpense = state.expenses.find((expense) => expense.id === expenseId)?.groupId === DIRECT_SPLIT_GROUP_ID
    if (!directExpense) {
      try {
        await api.expenses.delete(expenseId)
      } catch (err) {
        console.warn('API expense delete failed', err)
      }
    }
    setState((current: LedgerState) => ({
      ...current,
      expenses: current.expenses.filter((entry) => entry.id !== expenseId),
    }))
  }

  function addDirectExpense(expense: Expense, people: User[]) {
    setState((current: LedgerState) => {
      const users = new Map(current.users.map((user) => [user.id, user]))
      for (const person of people) users.set(person.id, { ...users.get(person.id), ...person })
      return {
        ...current,
        users: Array.from(users.values()),
        expenses: [expense, ...current.expenses.filter((entry) => entry.id !== expense.id)],
      }
    })
  }

  async function addPayment(payment: Payment) {
    try {
      const recorded = await api.payments.record(payment.groupId, payment)
      setState((current: LedgerState) => ({
        ...current,
        payments: [recorded, ...current.payments.filter((p) => p.id !== payment.id)],
      }))
    } catch (err) {
      console.warn('API payment record failed, saving locally', err)
      setState((current: LedgerState) => ({ ...current, payments: [payment, ...current.payments] }))
    }
  }

  async function updatePayment(payment: Payment) {
    setState((current: LedgerState) => ({
      ...current,
      payments: current.payments.map((entry) => (entry.id === payment.id ? payment : entry)),
    }))
  }

  async function deletePayment(paymentId: string) {
    try {
      await api.payments.delete(paymentId)
    } catch (err) {
      console.warn('API payment delete failed', err)
    }
    setState((current: LedgerState) => ({
      ...current,
      payments: current.payments.filter((entry) => entry.id !== paymentId),
    }))
  }

  async function addGroup(group: Group) {
    try {
      const created = await api.groups.create({
        name: group.name,
        kind: group.kind,
        emoji: group.emoji,
        simplifyDebts: group.simplifyDebts,
        memberIds: group.memberIds,
      })
      const mappedGroup: Group = {
        id: String(created.id),
        name: created.name,
        kind: (created.kind as any) || 'other',
        emoji: created.emoji || '💰',
        simplifyDebts: created.simplifyDebts,
        memberIds: (created.memberIds || []).map(String),
      }
      setState((current: LedgerState) => ({
        ...current,
        groups: [mappedGroup, ...current.groups.filter((g) => g.id !== mappedGroup.id)],
      }))
    } catch (err) {
      console.warn('API group creation failed, saving locally', err)
      setState((current: LedgerState) => ({ ...current, groups: [group, ...current.groups] }))
    }
  }

  function updateGroup(group: Group) {
    setState((current: LedgerState) => ({
      ...current,
      groups: current.groups.map((entry) => (entry.id === group.id ? group : entry)),
    }))
  }

  function deleteGroup(groupId: string) {
    setState((current: LedgerState) => ({
      ...current,
      groups: current.groups.filter((entry) => entry.id !== groupId),
      expenses: current.expenses.filter((entry) => entry.groupId !== groupId),
      payments: current.payments.filter((entry) => entry.groupId !== groupId),
    }))
  }

  async function updateCurrentUser(
    profile: Partial<Pick<User, 'name' | 'email' | 'avatarUrl' | 'phone' | 'instagramHandle' | 'defaultCurrency' | 'language'>>,
  ) {
    try {
      await api.users.updateProfile(profile)
    } catch (err) {
      console.warn('API user profile update failed', err)
    }
    setState((current: LedgerState) => {
      const currentUser = current.users.find((user) => user.id === current.currentUserId)
      const nextCurrency = profile.defaultCurrency
      const currencyChanged = Boolean(nextCurrency && nextCurrency !== (currentUser?.defaultCurrency ?? 'INR'))
      return {
        ...current,
        users: current.users.map((user) =>
          user.id === current.currentUserId
            ? {
                ...user,
                ...profile,
                initials: computeInitials(profile.name ?? user.name),
              }
            : user,
        ),
        expenses: currencyChanged ? current.expenses.map((expense) => ({ ...expense, currency: nextCurrency! })) : current.expenses,
        payments: currencyChanged ? current.payments.map((payment) => ({ ...payment, currency: nextCurrency! })) : current.payments,
      }
    })
  }

  return {
    state,
    loading,
    addExpense,
    addDirectExpense,
    updateExpense,
    deleteExpense,
    addPayment,
    updatePayment,
    deletePayment,
    addGroup,
    updateGroup,
    deleteGroup,
    updateCurrentUser,
  }
}
