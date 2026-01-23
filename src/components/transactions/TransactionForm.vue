<script setup lang="ts">
import { computed, ref } from 'vue'
import type { TransactionFormData } from '@/types/transaction'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDatePicker from '@/components/ui/BaseDatePicker.vue'
import CurrencyInput from '@/components/ui/CurrencyInput.vue'
import { getCategoryWithIcon } from '@/utils/categoryIcons'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

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

const typeOptions = computed(() => [
  { value: 'income', label: t('transaction.incomeLabel') },
  { value: 'expense', label: t('transaction.expenseLabel') },
])

const categoryOptions = computed(() => {
  // Use consistent keys for default categories
  const defaultCategoryKeys =
    props.modelValue.type === 'income'
      ? ['categorySalary', 'categoryFreelance', 'categoryInvestment', 'categoryGift', 'categoryOther']
      : ['categoryFood', 'categoryTransport', 'categoryShopping', 'categoryBills', 'categoryEntertainment', 'categoryHealth', 'categoryCoffee', 'categoryOther']

  // Map keys to translated labels
  const defaultCategories = defaultCategoryKeys.map((key) => ({
    key,
    value: t(`transaction.${key}`),
    label: getCategoryWithIcon(t(`transaction.${key}`), props.modelValue.type),
  }))

  // Get translated values for comparison
  const defaultCategoryValues = defaultCategories.map((cat) => cat.value)
  const defaultCategoryKeysLower = defaultCategoryKeys.map((k) => k.toLowerCase())

  // Filter custom categories untuk menghindari duplikasi dan kategori yang tidak sesuai
  const customCategories = props.categories
    .filter((cat) => {
      // Exclude kategori yang sudah ada di default (check both translated and original)
      if (defaultCategoryValues.includes(cat)) return false

      // Check if category matches any default category key (case-insensitive)
      const lowerCat = cat.toLowerCase().trim()
      const catMatchesDefault = defaultCategoryKeysLower.some((key) => {
        const translatedValue = t(`transaction.${key}`).toLowerCase()
        return lowerCat === translatedValue || lowerCat === key.toLowerCase().replace('category', '')
      })
      if (catMatchesDefault) return false

      // Untuk expense, exclude "Gaji" (karena itu kategori income)
      if (props.modelValue.type === 'expense') {
        if (lowerCat === 'gaji' || lowerCat === 'salary' || lowerCat === t('transaction.categorySalary').toLowerCase()) return false

        // Exclude "Other" dan variasi lainnya jika sudah ada "Lainnya"
        if (lowerCat === 'other' || lowerCat === 'lain-lain' || lowerCat === 'lain lain' || lowerCat === t('transaction.categoryOther').toLowerCase()) return false
      }

      // Untuk income, exclude kategori expense yang tidak sesuai
      if (props.modelValue.type === 'income') {
        const expenseCategories = ['categoryFood', 'categoryTransport', 'categoryShopping', 'categoryBills', 'categoryEntertainment', 'categoryHealth', 'categoryCoffee']
        const expenseValues = expenseCategories.map((k) => t(`transaction.${k}`).toLowerCase())
        if (expenseValues.includes(lowerCat)) return false
      }

      return true
    })
    .map((cat) => ({
      value: cat,
      label: getCategoryWithIcon(cat, props.modelValue.type)
    }))

  return [
    ...defaultCategories.map((cat) => ({
      value: cat.value,
      label: cat.label
    })),
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
    errors.value.description = t('transaction.descriptionRequired')
  }

  if (formData.value.amount <= 0) {
    errors.value.amount = t('transaction.amountRequired')
  }

  if (!formData.value.category) {
    errors.value.category = t('transaction.categoryRequired')
  }

  if (!formData.value.date) {
    errors.value.date = t('transaction.dateRequired')
  } else if (isDateInFuture(formData.value.date)) {
    errors.value.date = t('transaction.dateFutureError')
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
    <BaseSelect v-model="formData.type" :label="t('transaction.type')" :options="typeOptions" :error="errors.type" />

    <BaseInput v-model="formData.description" :label="t('transaction.description')" :error="errors.description"
      :placeholder="t('transaction.descriptionPlaceholder')" />

    <CurrencyInput v-model="formData.amount" :label="t('transaction.amount')" :error="errors.amount" />

    <BaseSelect v-model="formData.category" :label="t('transaction.categoryLabel')" :options="categoryOptions"
      :error="errors.category" />

    <BaseDatePicker v-model="formData.date" :label="t('transaction.date')" :error="errors.date"
      :max-date="getTodayDateString()" />

    <div v-if="!hideActions" class="flex justify-end gap-3 pt-4">
      <slot name="actions">
        <BaseButton type="submit" :loading="loading"> {{ t('common.save') }} </BaseButton>
      </slot>
    </div>
  </form>
</template>
