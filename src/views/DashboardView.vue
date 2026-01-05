<script setup lang="ts">
import { onMounted } from 'vue'
import { useTransactions } from '@/composables/useTransactions'
import SummaryCard from '@/components/transactions/SummaryCard.vue'
import CategoryBreakdownChart from '@/components/charts/CategoryBreakdownChart.vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { exportSummaryToPDF } from '@/utils/export'

const { summary, transactionsByCategory, fetchTransactions } = useTransactions()

onMounted(() => {
    fetchTransactions()
})

function handleExportSummary() {
    const filename = `financial-summary-${new Date().toISOString().split('T')[0]}.pdf`
    exportSummaryToPDF(summary.value, filename)
}
</script>

<template>
    <div class="mx-auto max-w-[430px] space-y-6 px-4 pb-24 pt-8">
        <div class="flex items-center justify-between">
            <div>
                <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
                <p class="text-sm text-slate-500 dark:text-slate-400">Pantau kesehatan keuangan kamu</p>
            </div>
            <BaseButton variant="secondary" size="sm" @click="handleExportSummary">
                <font-awesome-icon :icon="['fas', 'file-pdf']" class="mr-2" />
                Export
            </BaseButton>
        </div>

        <SummaryCard :summary="summary" />

        <BaseCard v-if="transactionsByCategory.length > 0">
            <template #header>
                <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Rincian Kategori</h2>
            </template>
            <CategoryBreakdownChart :transactions-by-category="transactionsByCategory" />
        </BaseCard>

        <BaseCard v-else>
            <div class="py-12 text-center text-slate-500 dark:text-slate-400">
                <p>Belum ada transaksi nih. Tambahkan transaksi dulu untuk lihat rinciannya!</p>
                <router-link to="/transactions/new" class="mt-4 inline-block">
                    <BaseButton>
                        <font-awesome-icon :icon="['fas', 'plus']" class="mr-2" />
                        Tambah Transaksi
                    </BaseButton>
                </router-link>
            </div>
        </BaseCard>
    </div>
</template>
