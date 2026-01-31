import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ChatMessage, ChatContext } from '@/types/chat'
import { chatService } from '@/services/chatService'
import i18n from '@/i18n'

const STORAGE_KEY = 'financial_tracker_chat_history'

export const useChatStore = defineStore('chat', () => {
  const t = (key: string, params?: Record<string, string>) => i18n.global.t(key, params)
  const messages = ref<ChatMessage[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const isOpen = ref(false)

  // Load chat history from localStorage
  function loadHistory() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        messages.value = JSON.parse(stored)
      }
    } catch {
      messages.value = []
    }
  }

  // Save chat history to localStorage
  function saveHistory() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.value))
    } catch {
      // Ignore storage errors
    }
  }

  // Add message to chat
  function addMessage(role: 'user' | 'assistant', content: string) {
    const message: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: new Date().toISOString(),
    }
    messages.value.push(message)
    saveHistory()
  }

  // Send message to AI
  async function sendMessage(content: string, context?: ChatContext) {
    if (!content.trim()) {
      return
    }

    // Add user message
    addMessage('user', content)
    loading.value = true
    error.value = null

    try {
      const response = await chatService.sendMessage(content, context as ChatContext)
      addMessage('assistant', response)
    } catch (err) {
      error.value = err instanceof Error ? err.message : t('chat.sendFailed')
      addMessage('assistant', t('chat.errorMessage', { error: error.value }))
      console.error('Chat error:', err)
    } finally {
      loading.value = false
    }
  }

  // Clear chat history
  function clearHistory() {
    messages.value = []
    localStorage.removeItem(STORAGE_KEY)
  }

  // Toggle chat window
  function toggleChat() {
    isOpen.value = !isOpen.value
    if (isOpen.value && messages.value.length === 0) {
      addMessage('assistant', t('chat.welcome'))
    }
  }

  function openChat() {
    isOpen.value = true
    if (messages.value.length === 0) {
      addMessage('assistant', t('chat.welcome'))
    }
  }

  function closeChat() {
    isOpen.value = false
  }

  // Initialize: load history
  loadHistory()

  return {
    messages,
    loading,
    error,
    isOpen,
    sendMessage,
    clearHistory,
    toggleChat,
    openChat,
    closeChat,
  }
})

