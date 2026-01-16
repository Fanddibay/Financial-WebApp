<script setup lang="ts">
import { computed } from 'vue'
import type { Transaction } from '@/types/transaction'
import BaseButton from '@/components/ui/BaseButton.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { formatIDR } from '@/utils/currency'
import { getCategoryIcon } from '@/utils/categoryIcons'

interface Props {
    transaction: Transaction
}

const props = defineProps<Props>()

const emit = defineEmits<{
    edit: [id: string]
    delete: [id: string]
}>()

const formattedAmount = computed(() => {
    return formatIDR(props.transaction.amount)
})

const formattedDate = computed(() => {
    return new Date(props.transaction.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })
})

const categoryIcon = computed(() => {
    return getCategoryIcon(props.transaction.category, props.transaction.type)
})
</script>

<template>
    <div :class="[
        'flex items-center justify-between rounded-xl border p-2.5 transition hover:shadow-md',
        transaction.type === 'income'
            ? 'border-green-200 bg-green-50/50'
            : 'border-red-200 bg-red-50/50',
    ]">
        <div class="flex-1">
            <div class="flex items-center gap-3">
                <div :class="[
                    'flex h-8 w-8 items-center justify-center rounded-lg text-lg',
                    transaction.type === 'income' ? 'bg-green-100' : 'bg-red-100',
                ]">
                    {{ categoryIcon }}
                </div>
                <div class="flex-1">
                    <h3 class="font-semibold text-slate-900">{{ transaction.description }}</h3>
                    <p class="text-sm text-slate-600">{{ categoryIcon }} {{ transaction.category }}</p>
                    <p class="text-xs text-slate-500">{{ formattedDate }}</p>
                </div>
            </div>
        </div>
        <div class="ml-4 flex items-center gap-2">
            <span :class="[
                'text-sn font-bold',
                transaction.type === 'income' ? 'text-green-700' : 'text-red-700',
            ]">
                {{ transaction.type === 'income' ? '+' : '-' }}{{ formattedAmount }}
            </span>
            <div class="grid gap-1">
                <BaseButton variant="ghost" size="sm" @click="emit('edit', transaction.id)">
                    <font-awesome-icon :icon="['fas', 'edit']" />
                </BaseButton>
                <BaseButton variant="ghost" size="sm" @click="emit('delete', transaction.id)">
                    <font-awesome-icon :icon="['fas', 'trash']" />
                </BaseButton>
            </div>
        </div>
    </div>
</template>
