import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Goal, CreateGoalData } from '@/types/goal'
import * as goalService from '@/services/goalService'
import * as investmentGoalService from '@/services/investmentGoalService'
import { useTransactionStore } from '@/stores/transaction'

export const useGoalStore = defineStore('goal', () => {
  const goals = ref<Goal[]>([])

  const txStore = useTransactionStore()

  // Transaction-based balance per goal (deposits - withdrawals)
  const goalBalances = computed(() => {
    const balances: Record<string, number> = {}
    for (const tx of txStore.transactions) {
      if (tx.type === 'income' && tx.goalId) {
        balances[tx.goalId] = (balances[tx.goalId] ?? 0) + tx.amount
      }
      if (tx.type === 'transfer' && tx.transferToGoalId) {
        balances[tx.transferToGoalId] = (balances[tx.transferToGoalId] ?? 0) + tx.amount
      }
      if (tx.type === 'transfer' && tx.goalId && tx.transferToPocketId) {
        balances[tx.goalId] = (balances[tx.goalId] ?? 0) - tx.amount
        if (balances[tx.goalId]! < 0) balances[tx.goalId] = 0
      }
    }
    return balances
  })

  // For investment goals: principal + simulated return. For saving: same as goalBalances.
  const goalDisplayBalances = computed(() => {
    const result: Record<string, number> = {}
    const txBal = goalBalances.value
    for (const g of goals.value) {
      if (g.type === 'investment') {
        const goalTxs = txStore.transactions.filter(
          (tx) => tx.goalId === g.id || tx.transferToGoalId === g.id,
        )
        const activities = investmentGoalService.getActivityEntries(g.id)
        const { principal, simulatedReturn } = investmentGoalService.computeInvestmentState(
          g.id,
          goalTxs,
          activities,
        )
        result[g.id] = principal + simulatedReturn
      } else {
        result[g.id] = txBal[g.id] ?? 0
      }
    }
    return result
  })

  const goalsWithBalances = computed(() => {
    const balances = goalDisplayBalances.value
    return goals.value.map((g) => ({
      ...g,
      currentBalance: balances[g.id] ?? 0,
    }))
  })

  function init() {
    goals.value = goalService.getAllGoals()
    runInvestmentSimulations()
  }

  function fetchGoals() {
    goals.value = goalService.getAllGoals()
    runInvestmentSimulations()
  }

  function runInvestmentSimulations() {
    const list = goals.value.filter((g) => g.type === 'investment' && (g.annualReturnPercentage ?? 0) > 0)
    for (const goal of list) {
      const goalTxs = txStore.transactions.filter(
        (tx) => tx.goalId === goal.id || tx.transferToGoalId === goal.id,
      )
      investmentGoalService.runDailySimulation(
        goal,
        goalTxs,
        investmentGoalService.getActivityEntries,
        investmentGoalService.appendActivityEntry,
        (id, date) => goalService.updateGoal(id, { lastReturnCalculationDate: date }),
      )
    }
    goals.value = goalService.getAllGoals()
  }

  function getGoalById(id: string): Goal | null {
    return goals.value.find((g) => g.id === id) ?? null
  }

  function createGoal(data: CreateGoalData): Goal {
    const created = goalService.createGoal(data)
    goals.value = goalService.getAllGoals()
    return created
  }

  function updateGoal(id: string, data: Partial<Pick<Goal, 'name' | 'icon' | 'targetAmount' | 'durationMonths' | 'color'>>) {
    const updated = goalService.updateGoal(id, data)
    goals.value = goalService.getAllGoals()
    return updated
  }

  function deleteGoal(id: string) {
    investmentGoalService.deleteActivityForGoal(id)
    goalService.deleteGoal(id)
    goals.value = goalService.getAllGoals()
  }

  return {
    goals,
    goalBalances,
    goalDisplayBalances,
    goalsWithBalances,
    init,
    fetchGoals,
    getGoalById,
    createGoal,
    updateGoal,
    deleteGoal,
    runInvestmentSimulations,
  }
})
