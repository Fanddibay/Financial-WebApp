<script setup lang="ts">
defineSlots<{
  default(): unknown
  header?(): unknown
  footer?(): unknown
}>()
</script>

<template>
  <div class="card border border-slate-200 dark:border-slate-700 dark:bg-slate-800/70">
    <div v-if="$slots.header" class="mb-4 border-b border-slate-200 pb-4 dark:border-slate-700">
      <slot name="header" />
    </div>
    <slot />
    <div v-if="$slots.footer" class="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
      <slot name="footer" />
    </div>
  </div>
</template>
