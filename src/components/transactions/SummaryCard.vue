<script setup lang="ts">
import { computed } from 'vue'
import type { TransactionSummary } from '@/types/transaction'
import BaseCard from '@/components/ui/BaseCard.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { formatIDR } from '@/utils/currency'

interface Props {
    summary: TransactionSummary
}

const props = defineProps<Props>()

const formattedIncome = computed(() => {
    return formatIDR(props.summary.totalIncome)
})

const formattedExpenses = computed(() => {
    return formatIDR(props.summary.totalExpenses)
})

const formattedBalance = computed(() => {
    return formatIDR(props.summary.balance)
})
</script>

<template>
    <div class="grid gap-4 sm:grid">
        <BaseCard>
            <div class="flex items-center gap-3">
                <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-green-700">
                    <font-awesome-icon :icon="['fas', 'arrow-up']" class="text-xl" />
                </div>
                <div>
                    <p class="text-sm text-slate-600 dark:text-slate-400">Total Income</p>
                    <p class="text-xl font-bold text-green-700 dark:text-green-400">{{ formattedIncome }}</p>
                    <p class="text-xs text-slate-500 dark:text-slate-400">{{ summary.incomeCount }} transaksi</p>
                </div>
            </div>
        </BaseCard>

        <BaseCard>
            <div class="flex items-center gap-3">
                <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-red-100 text-red-700">
                    <font-awesome-icon :icon="['fas', 'arrow-down']" class="text-xl" />
                </div>
                <div>
                    <p class="text-sm text-slate-600 dark:text-slate-400">Total Expense</p>
                    <p class="text-xl font-bold text-red-700 dark:text-red-400">{{ formattedExpenses }}</p>
                    <p class="text-xs text-slate-500 dark:text-slate-400">{{ summary.expenseCount }} transaksi</p>
                </div>
            </div>
        </BaseCard>

        <BaseCard>
            <div class="flex items-center gap-3">
                <div :class="[
                    'flex h-12 w-12 items-center justify-center rounded-lg',
                    summary.balance >= 0 ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700',
                ]">
                    <font-awesome-icon :icon="['fas', 'wallet']" class="text-xl" />
                </div>
                <div>
                    <p class="text-sm text-slate-600 dark:text-slate-400">Saldo</p>
                    <p :class="[
                        'text-xl font-bold',
                        summary.balance >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-orange-700 dark:text-orange-400',
                    ]">
                        {{ formattedBalance }}
                    </p>
                    <p class="text-xs text-slate-500 dark:text-slate-400">Jumlah bersih</p>
                </div>
            </div>
        </BaseCard>
    </div>
</template>
