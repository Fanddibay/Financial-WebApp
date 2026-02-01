<script setup lang="ts">

interface Props {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'teritary'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
})

defineSlots<{
  default(): unknown
}>()
</script>

<template>
  <button :disabled="disabled || loading" :class="[
    'inline-flex items-center justify-center  rounded-xl font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
    {
      'bg-brand text-white hover:bg-brand-dark focus-visible:ring-brand/60': variant === 'primary',
      'bg-yellow-400 hover:bg-yellow-500': variant === 'teritary',
      'bg-slate-200 text-slate-900 hover:bg-slate-300 focus-visible:ring-slate-400 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600': variant === 'secondary',
      'bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-400': variant === 'danger',
      'bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-400 dark:text-slate-300 dark:hover:bg-slate-800': variant === 'ghost',
      'px-3 py-1.5 text-sm': size === 'sm',
      'px-4 py-2 text-base': size === 'md',
      'px-6 py-3 text-lg': size === 'lg',
    },
  ]">
    <slot />
  </button>
</template>
