<script setup lang="ts">
import { computed, ref } from 'vue'
import type { TransactionFormData } from '@/types/transaction'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDatePicker from '@/components/ui/BaseDatePicker.vue'
import CurrencyInput from '@/components/ui/CurrencyInput.vue'

interface Props {
  modelValue: TransactionFormData
  categories?: string[]
  loading?: boolean
  hideActions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  categories: () => [],
  loading: false,
  hideActions: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: TransactionFormData]
  submit: []
  'add-another': []
}>()

const formData = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const errors = ref<Partial<Record<keyof TransactionFormData, string>>>({})

const typeOptions = [
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
]

const categoryOptions = computed(() => {
  const defaultCategories =
    props.modelValue.type === 'income'
      ? ['Gaji', 'Freelance', 'Investasi', 'Hadiah', 'Lainnya']
      : ['Makanan', 'Transportasi', 'Belanja', 'Tagihan', 'Hiburan', 'Kesehatan', 'Lainnya']

  const customCategories = props.categories
    .filter((cat) => !defaultCategories.includes(cat))
    .map((cat) => ({ value: cat, label: cat }))

  return [
    ...defaultCategories.map((cat) => ({ value: cat, label: cat })),
    ...customCategories,
  ]
})

// Helper function to get today's date string
function getTodayDateString(): string {
  const dateStr = new Date().toISOString().split('T')[0]
  return dateStr || new Date().toLocaleDateString('en-CA') // Fallback to YYYY-MM-DD format
}

// Helper function to validate date is not in the future
function isDateInFuture(dateString: string): boolean {
  if (!dateString) return false
  const date = new Date(dateString)
  const today = new Date()
  today.setHours(23, 59, 59, 999) // End of today
  return date > today
}

function validate(): boolean {
  errors.value = {}

  if (!formData.value.description.trim()) {
    errors.value.description = 'Deskripsi wajib diisi'
  }

  if (formData.value.amount <= 0) {
    errors.value.amount = 'Jumlah harus lebih dari 0'
  }

  if (!formData.value.category) {
    errors.value.category = 'Kategori wajib dipilih'
  }

  if (!formData.value.date) {
    errors.value.date = 'Tanggal wajib diisi'
  } else if (isDateInFuture(formData.value.date)) {
    errors.value.date = 'Tanggal tidak boleh di masa depan. Silakan pilih tanggal hari ini atau sebelumnya.'
  }

  return Object.keys(errors.value).length === 0
}

function handleSubmit() {
  if (validate()) {
    emit('submit')
  }
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="handleSubmit">
    <BaseSelect v-model="formData.type" label="Tipe" :options="typeOptions" :error="errors.type" />

    <BaseInput v-model="formData.description" label="Deskripsi" :error="errors.description"
      placeholder="Contoh: Beli makan siang" />

    <CurrencyInput type="tel" v-model="formData.amount" label="Jumlah" :error="errors.amount" />

    <BaseSelect v-model="formData.category" label="Kategori" :options="categoryOptions" :error="errors.category" />

    <BaseDatePicker v-model="formData.date" label="Tanggal" :error="errors.date" :max-date="getTodayDateString()" />

    <div v-if="!hideActions" class="flex justify-end gap-3 pt-4">
      <slot name="actions">
        <BaseButton type="submit" :loading="loading"> Simpan </BaseButton>
      </slot>
    </div>
  </form>
</template>
