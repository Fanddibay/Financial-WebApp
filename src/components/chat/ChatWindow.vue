<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useChatStore } from '@/stores/chat'
import { useTransactionStore } from '@/stores/transaction'

import { useTokenStore } from '@/stores/token'
import { analyzeFinancialData } from '@/services/financialAI'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const { t, locale } = useI18n()
const showClearChatConfirm = ref(false)
const router = useRouter()
const chatStore = useChatStore()
const transactionStore = useTransactionStore()

const tokenStore = useTokenStore()

const inputMessage = ref('')
const messagesEnd = ref<HTMLElement | null>(null)
const limitError = ref<string | null>(null)
const showLimitInfo = ref(false)
const showInsights = ref(true)
const showSuggestionsModal = ref(false)

const insightQuestions = computed(() => [
  t('chat.suggestions.question1'),
  t('chat.suggestions.question2'),
  t('chat.suggestions.question3'),
  t('chat.suggestions.question4'),
  t('chat.suggestions.question5'),
])

const hasMessages = computed(() => chatStore.messages.length > 0)

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

  // Check license/usage limit
  if (!tokenStore.canUseChat()) {
    limitError.value = `Chat limit reached (${tokenStore.MAX_BASIC_USAGE} messages per day). Activate a license to unlock unlimited chat.`
    setTimeout(() => {
      limitError.value = null
    }, 5000)
    return
  }

  limitError.value = null
  const message = inputMessage.value.trim()
  inputMessage.value = ''

  // Get comprehensive financial context using financial analysis
  const analysis = analyzeFinancialData(transactionStore.transactions)

  const context = {
    locale: (locale.value === 'en' ? 'en' : 'id') as 'id' | 'en',
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
  // Record usage after successful send
  tokenStore.recordChatMessage()
  scrollToBottom()
}

function handleKeyPress(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}



// Confirm reset action
function handleResetConfirm() {
  chatStore.clearHistory()
  showInsights.value = true
  showClearChatConfirm.value = false
}
function handleQuestionClick(question: string) {
  inputMessage.value = question
  handleSend()
}

function handleReset() {
  showClearChatConfirm.value = true
}
// Navigate to profile and close everything
function navigateToProfile() {
  showLimitInfo.value = false
  chatStore.closeChat()
  router.push('/profile')
}

function handleSuggestionClick(question: string) {
  handleQuestionClick(question)
  showSuggestionsModal.value = false
}
</script>

<template>
  <div v-if="chatStore.isOpen"
    class="fixed bottom-0 right-0 left-0 sm:left-auto sm:right-4 z-50 flex h-[calc(88vh-5rem)] sm:h-[600px] w-full sm:w-full sm:max-w-md flex-col rounded-t-2xl sm:rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl">
    <!-- Header -->
    <div
      class="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-brand px-4 py-3 rounded-t-2xl sm:rounded-t-2xl">
      <div class="flex items-center gap-2">
        <div class="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white">
          <font-awesome-icon :icon="['fas', 'wallet']" />
        </div>
        <div>
          <h3 class="font-semibold text-white">Asisten Keuangan</h3>
          <p class="text-xs text-white/80">Chatbot Financial Assistant</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <!-- Usage Limit Info Icon (Header) -->
        <button v-if="!tokenStore.isLicenseActive" @click="showLimitInfo = true"
          class="flex h-8 w-8 items-center justify-center rounded-full text-white/80 hover:bg-white/20 hover:text-white transition-colors">
          <font-awesome-icon :icon="['fas', 'circle-info']" />
        </button>

        <!-- Restored Delete Icon -->
        <BaseButton variant="ghost" size="sm" @click="handleReset" class="text-white hover:bg-white/20"
          title="Clear Chat">
          <font-awesome-icon :icon="['fas', 'trash']" />
        </BaseButton>

        <BaseButton variant="ghost" size="sm" @click="chatStore.closeChat" class="text-white hover:bg-white/20">
          <font-awesome-icon :icon="['fas', 'times']" />
        </BaseButton>
      </div>
    </div>

    <!-- Messages -->
    <div class="flex-1 space-y-4 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-800">
      <div v-if="!hasMessages" class="flex h-full flex-col items-center justify-center text-center px-4 py-8">
        <div class="space-y-4 w-full max-w-xs">
          <div class="flex justify-center">
            <div
              class="flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 dark:bg-brand/20 shadow-sm animate-pulse-slow">
              <font-awesome-icon :icon="['fas', 'comments']" class="text-brand text-2xl" />
            </div>
          </div>

          <div>
            <p class="text-slate-800 dark:text-slate-200 font-semibold text-lg">Halo! Ada yang bisa saya
              bantu?</p>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Saya siap menganalisis keuangan Anda.
            </p>
          </div>

          <!-- Insights Section -->
          <div class="pt-4 border-t border-slate-200 dark:border-slate-700">
            <button @click="showInsights = !showInsights"
              class="flex items-center justify-center gap-2 text-xs font-medium text-slate-400 hover:text-brand transition-colors mx-auto mb-3">
              <span>Saran Pertanyaan</span>
              <font-awesome-icon :icon="['fas', showInsights ? 'chevron-up' : 'chevron-down']" />
            </button>

            <Transition enter-active-class="transition-all duration-300 ease-out"
              enter-from-class="opacity-0 -translate-y-2" enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition-all duration-200 ease-in" leave-from-class="opacity-100 translate-y-0"
              leave-to-class="opacity-0 -translate-y-2">
              <div v-if="showInsights" class="flex flex-wrap justify-center gap-2">
                <button v-for="(question, index) in insightQuestions" :key="index"
                  @click="handleQuestionClick(question)"
                  class="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full text-xs text-slate-600 dark:text-slate-300 hover:border-brand hover:text-brand dark:hover:text-brand hover:bg-brand/5 transition-all shadow-sm">
                  {{ question }}
                </button>
              </div>
            </Transition>
          </div>
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
    <div
      class="border-t border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-900 rounded-b-2xl sm:rounded-b-2xl">
      <!-- Usage Limit Warning (Removed - Moved to Header) -->

      <div class="flex items-end gap-2">
        <div class="relative flex-1">
          <textarea v-model="inputMessage" rows="1" :placeholder="t('chat.inputPlaceholder')" class=" block w-full resize-none rounded-xl border border-slate-300 dark:border-slate-600 bg-white
            dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-2.5 text-sm focus:border-brand
            focus:outline-none placeholder:text-xs placeholder:pt-1 focus:ring-2 focus:ring-brand/20 placeholder:text-slate-400
            dark:placeholder:text-slate-500 max-h-32 overflow-y-auto" :disabled="chatStore.loading"
            @keydown.enter.prevent="handleKeyPress" @input="(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = target.scrollHeight + 'px';
            }"></textarea>
        </div>

        <!-- Suggestions Button -->
        <BaseButton @click="showSuggestionsModal = true"
          class="shrink-0 h-10 w-10 flex items-center justify-center rounded-full !bg-amber-500 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800">
          <font-awesome-icon :icon="['fas', 'lightbulb']" />
        </BaseButton>

        <BaseButton :disabled="!inputMessage.trim() || chatStore.loading" @click="handleSend"
          class="shrink-0 h-10 w-10 flex items-center justify-center rounded-full">
          <font-awesome-icon :icon="['fas', 'paper-plane']" />
        </BaseButton>
      </div>
      <p v-if="chatStore.error" class="mt-2 text-xs text-red-600 dark:text-red-400">
        {{ chatStore.error }}
      </p>
      <p v-if="limitError" class="mt-2 text-xs text-red-600 dark:text-red-400">
        {{ limitError }}
      </p>
      <!-- AI Disclaimer -->
      <p class="mt-2 text-xs text-slate-500 dark:text-slate-400 text-start">
        <font-awesome-icon :icon="['fas', 'info-circle']" class="mr-1" />
        Saran ini bersifat umum dan bukan nasihat keuangan profesional
      </p>
    </div>
  </div>

  <!-- Clear chat history confirmation (Modified text for Reset) -->
  <ConfirmModal :is-open="showClearChatConfirm" :title="t('chat.clearHistoryTitle')"
    :message="t('chat.clearHistoryMessage')" :confirm-text="t('chat.clearHistoryConfirm')"
    :cancel-text="t('common.cancel')" variant="danger" :icon="['fas', 'trash']" @confirm="handleResetConfirm"
    @close="showClearChatConfirm = false" />

  <!-- Limit Info Modal -->
  <BottomSheet :is-open="showLimitInfo" title="Basic Account Limit" @close="showLimitInfo = false" maxHeight="60">
    <div class="space-y-4">
      <div class="flex flex-col items-center justify-center  text-center">
        <!-- Grayscale Crown Icon -->
        <div class="mb-4 rounded-full bg-slate-100 p-3 dark:bg-slate-800">
          <font-awesome-icon :icon="['fas', 'crown']" class="h-6 w-6 text-slate-400" />
        </div>
        <h3 class="mb-2 text-lg font-bold text-slate-900 dark:text-slate-100">
          Basic Account Limit
        </h3>
        <p class="text-sm text-slate-600 dark:text-slate-400 max-w-xs mx-auto">
          Anda memiliki {{ tokenStore.getRemainingUsage('chat') }} dari {{ tokenStore.MAX_BASIC_USAGE }} pesan
          tersisa hari ini.
        </p>
      </div>

      <!-- <div class="rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
        <div class="flex gap-3">
          <font-awesome-icon :icon="['fas', 'check-circle']"
            class="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div class="cursor-pointer" @click="navigateToProfile">
            <h4 class="font-medium text-amber-900 dark:text-amber-200 underline">Activate License for
              Unlimited</h4>
            <p class="mt-1 text-sm text-amber-800 dark:text-amber-300">
              Dapatkan akses chat tanpa batas dan analisis lebih mendalam dengan akun premium.
            </p>
          </div>
        </div>
      </div> -->

      <div class="pt-2">
        <BaseButton class="w-full justify-center" size="lg" @click="navigateToProfile">
          <font-awesome-icon :icon="['fas', 'crown']" class="mr-2" />
          Activate License
        </BaseButton>
      </div>
    </div>
  </BottomSheet>

  <!-- Suggestions Modal -->
  <BottomSheet :is-open="showSuggestionsModal" :title="t('chat.suggestionsTitle')"
    @close="showSuggestionsModal = false">
    <div class="flex flex-col gap-2 py-2">
      <button v-for="(question, index) in insightQuestions" :key="index" @click="handleSuggestionClick(question)"
        class="w-full text-left px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-200 hover:border-brand hover:bg-brand/5 dark:hover:bg-slate-700 transition-all shadow-sm">
        {{ question }}
      </button>
    </div>
  </BottomSheet>
</template>
