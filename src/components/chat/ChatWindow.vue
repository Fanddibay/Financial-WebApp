<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useTransactionStore } from '@/stores/transaction'
import { useThemeStore } from '@/stores/theme'
import { analyzeFinancialData } from '@/services/financialAI'
import BaseButton from '@/components/ui/BaseButton.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const chatStore = useChatStore()
const transactionStore = useTransactionStore()
const themeStore = useThemeStore()

const inputMessage = ref('')
const messagesEnd = ref<HTMLElement | null>(null)

const hasMessages = computed(() => chatStore.messages.length > 0)
const isDark = computed(() => themeStore.theme === 'dark')

function scrollToBottom() {
    nextTick(() => {
        if (messagesEnd.value) {
            messagesEnd.value.scrollIntoView({ behavior: 'smooth' })
        }
    })
}

onMounted(() => {
    scrollToBottom()
})

// Auto-scroll when new messages arrive
watch(() => chatStore.messages.length, () => {
    scrollToBottom()
})

async function handleSend() {
    if (!inputMessage.value.trim() || chatStore.loading) {
        return
    }

    const message = inputMessage.value.trim()
    inputMessage.value = ''

    // Get comprehensive financial context using financial analysis
    const analysis = analyzeFinancialData(transactionStore.transactions)
    
    const context = {
        transactions: {
            totalIncome: analysis.totalIncome,
            totalExpenses: analysis.totalExpenses,
            balance: analysis.balance,
            incomeCount: analysis.incomeCount,
            expenseCount: analysis.expenseCount,
            categoryBreakdown: analysis.categoryBreakdown,
            topSpendingCategories: analysis.topSpendingCategories,
            overspendingCategories: analysis.overspendingCategories,
            averageDailyExpense: analysis.averageDailyExpense,
            savingsRate: analysis.savingsRate,
            monthlyTrends: analysis.monthlyTrends,
            weeklyTrends: analysis.weeklyTrends,
        },
    }

    await chatStore.sendMessage(message, context)
    scrollToBottom()
}

function handleKeyPress(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
    }
}

function handleClear() {
    if (confirm('Yakin ingin menghapus riwayat chat?')) {
        chatStore.clearHistory()
    }
}
</script>

<template>
    <div v-if="chatStore.isOpen"
        class="fixed bottom-20 right-0 left-0 sm:left-auto sm:right-4 z-50 flex h-[calc(100vh-5rem)] sm:h-[600px] w-full sm:w-full sm:max-w-md flex-col rounded-t-2xl sm:rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-brand px-4 py-3 rounded-t-2xl sm:rounded-t-2xl">
            <div class="flex items-center gap-2">
                <div class="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white">
                    <font-awesome-icon :icon="['fas', 'wallet']" />
                </div>
                <div>
                    <h3 class="font-semibold text-white">Asisten Keuangan</h3>
                    <p class="text-xs text-white/80">AI Financial Assistant</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <BaseButton variant="ghost" size="sm" @click="handleClear" class="text-white hover:bg-white/20">
                    <font-awesome-icon :icon="['fas', 'trash']" />
                </BaseButton>
                <BaseButton variant="ghost" size="sm" @click="chatStore.closeChat" class="text-white hover:bg-white/20">
                    <font-awesome-icon :icon="['fas', 'times']" />
                </BaseButton>
            </div>
        </div>

        <!-- Messages -->
        <div class="flex-1 space-y-4 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-800">
            <div v-if="!hasMessages" class="flex h-full items-center justify-center text-center px-4">
                <div class="space-y-3">
                    <div class="flex justify-center">
                        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 dark:bg-brand/20">
                            <font-awesome-icon :icon="['fas', 'comments']" class="text-brand text-xl" />
                        </div>
                    </div>
                    <p class="text-slate-600 dark:text-slate-300 font-medium">Mulai percakapan dengan asisten keuangan Anda!</p>
                    <p class="text-sm text-slate-500 dark:text-slate-400">Coba tanyakan: "Apakah pengeluaran saya sehat?" atau "Dimana saya bisa hemat?"</p>
                </div>
            </div>

            <div v-for="message in chatStore.messages" :key="message.id" :class="[
                'flex',
                message.role === 'user' ? 'justify-end' : 'justify-start',
            ]">
                <div :class="[
                    'max-w-[85%] sm:max-w-[80%] rounded-2xl px-4 py-3',
                    message.role === 'user'
                        ? 'bg-brand text-white rounded-br-sm'
                        : 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-bl-sm shadow-sm',
                ]">
                    <p class="text-sm whitespace-pre-wrap leading-relaxed">{{ message.content }}</p>
                    <p :class="[
                        'mt-1.5 text-xs',
                        message.role === 'user' ? 'text-white/70' : 'text-slate-500 dark:text-slate-400',
                    ]">
                        {{ new Date(message.timestamp).toLocaleTimeString('id-ID', {
                            hour: '2-digit', minute: '2-digit'
                        }) }}
                    </p>
                </div>
            </div>

            <div v-if="chatStore.loading" class="flex justify-start">
                <div class="rounded-2xl rounded-bl-sm bg-white dark:bg-slate-700 px-4 py-3 shadow-sm">
                    <div class="flex gap-1.5">
                        <span class="h-2 w-2 animate-bounce rounded-full bg-slate-400 dark:bg-slate-300"
                            style="animation-delay: 0ms"></span>
                        <span class="h-2 w-2 animate-bounce rounded-full bg-slate-400 dark:bg-slate-300"
                            style="animation-delay: 150ms"></span>
                        <span class="h-2 w-2 animate-bounce rounded-full bg-slate-400 dark:bg-slate-300"
                            style="animation-delay: 300ms"></span>
                    </div>
                </div>
            </div>

            <div ref="messagesEnd"></div>
        </div>

        <!-- Input -->
        <div class="border-t border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-900 rounded-b-2xl sm:rounded-b-2xl">
            <div class="flex gap-2">
                <input 
                    v-model="inputMessage" 
                    type="text" 
                    placeholder="Tanyakan tentang keuangan Anda..."
                    class="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    :disabled="chatStore.loading" 
                    @keypress="handleKeyPress" />
                <BaseButton 
                    :disabled="!inputMessage.trim() || chatStore.loading" 
                    @click="handleSend"
                    class="shrink-0">
                    <font-awesome-icon :icon="['fas', 'paper-plane']" />
                </BaseButton>
            </div>
            <p v-if="chatStore.error" class="mt-2 text-xs text-red-600 dark:text-red-400">
                {{ chatStore.error }}
            </p>
            <!-- AI Disclaimer -->
            <p class="mt-2 text-xs text-slate-500 dark:text-slate-400 text-center">
                <font-awesome-icon :icon="['fas', 'info-circle']" class="mr-1" />
                Saran ini bersifat umum dan bukan nasihat keuangan profesional
            </p>
        </div>
    </div>
</template>
