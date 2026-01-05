import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ChatMessage, ChatContext } from '@/types/chat'
import { chatService } from '@/services/chatService'

const STORAGE_KEY = 'financial_tracker_chat_history'

export const useChatStore = defineStore('chat', () => {
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
      error.value = err instanceof Error ? err.message : 'Gagal mengirim pesan'
      addMessage('assistant', `Maaf, ada error: ${error.value}. Cek konfigurasi API kamu ya.`)
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
      // Add welcome message on first open (Indonesian)
      addMessage('assistant', 'Halo! 👋 Saya asisten keuangan AI Anda. Saya bisa membantu Anda:\n\n' +
        '📊 **Analisis & Insight:**\n' +
        '• Analisis kesehatan finansial\n' +
        '• Cek saldo dan insight\n' +
        '• Saran penghematan\n' +
        '• Analisis kategori pengeluaran\n\n' +
        '📅 **Ringkasan:**\n' +
        '• Ringkasan bulanan/mingguan\n' +
        '• Deteksi pengeluaran berlebihan\n\n' +
        '💡 **Saran:**\n' +
        '• Tips keuangan umum\n' +
        '• Potensi tabungan\n\n' +
        'Coba tanyakan: "Apakah pengeluaran saya sehat?" atau "Dimana saya bisa hemat?" 😊')
    }
  }

  function openChat() {
    isOpen.value = true
    if (messages.value.length === 0) {
      addMessage('assistant', 'Halo! 👋 Saya asisten keuangan AI Anda. Saya bisa membantu Anda:\n\n' +
        '📊 **Analisis & Insight:**\n' +
        '• Analisis kesehatan finansial\n' +
        '• Cek saldo dan insight\n' +
        '• Saran penghematan\n' +
        '• Analisis kategori pengeluaran\n\n' +
        '📅 **Ringkasan:**\n' +
        '• Ringkasan bulanan/mingguan\n' +
        '• Deteksi pengeluaran berlebihan\n\n' +
        '💡 **Saran:**\n' +
        '• Tips keuangan umum\n' +
        '• Potensi tabungan\n\n' +
        'Coba tanyakan: "Apakah pengeluaran saya sehat?" atau "Dimana saya bisa hemat?" 😊')
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

