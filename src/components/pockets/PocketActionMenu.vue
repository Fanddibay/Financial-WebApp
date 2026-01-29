<script setup lang="ts">
import type { Pocket } from '@/types/pocket'
import { MAIN_POCKET_ID } from '@/services/pocketService'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

interface Props {
  isOpen: boolean
  pocket: Pocket | null
}

defineProps<Props>()

const emit = defineEmits<{
  close: []
  edit: []
  downloadJson: []
  delete: []
}>()

/** Only the user's own Main Pocket (MAIN_POCKET_ID) is non-deletable. Imported main pockets from others have different ids and can be deleted. */
const isOwnMainPocket = (p: Pocket | null) => p?.id === MAIN_POCKET_ID
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex flex-col justify-end bg-black/50"
        @click.self="emit('close')"
      >
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="translate-y-full"
          enter-to-class="translate-y-0"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="translate-y-0"
          leave-to-class="translate-y-full"
        >
          <div
            v-if="isOpen"
            class="rounded-t-2xl bg-white pb-8 pt-1 dark:bg-slate-800"
            @click.stop
          >
            <!-- Header: title + close -->
            <div class="flex items-center justify-between px-5 pt-4 pb-4">
              <h3 class="text-lg font-bold text-slate-900 dark:text-slate-100">
                {{ t('pocket.actionMenuTitle') }}
              </h3>
              <button
                type="button"
                class="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                :aria-label="t('common.close')"
                @click="emit('close')"
              >
                <font-awesome-icon :icon="['fas', 'times']" class="h-5 w-5" />
              </button>
            </div>
            <div class="border-t border-slate-200 dark:border-slate-700" />

            <!-- Action items -->
            <div class="space-y-1 px-4 py-5">
              <button
                type="button"
                class="flex w-full items-center gap-4 rounded-xl px-4 py-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-700/50"
                @click="emit('edit'); emit('close')"
              >
                <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
                  <font-awesome-icon :icon="['fas', 'edit']" class="h-5 w-5 text-slate-500 dark:text-slate-400" />
                </div>
                <div class="min-w-0 flex-1 text-left">
                  <p class="font-semibold text-slate-900 dark:text-slate-100">
                    {{ t('pocket.actionEdit') }}
                  </p>
                  <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                    {{ t('pocket.actionEditSubtitle') }}
                  </p>
                </div>
              </button>

              <button
                type="button"
                class="flex w-full items-center gap-4 rounded-xl px-4 py-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-700/50"
                @click="emit('downloadJson'); emit('close')"
              >
                <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
                  <font-awesome-icon :icon="['fas', 'download']" class="h-5 w-5 text-slate-500 dark:text-slate-400" />
                </div>
                <div class="min-w-0 flex-1 text-left">
                  <p class="font-semibold text-slate-900 dark:text-slate-100">
                    {{ t('pocket.actionDownloadJson') }}
                  </p>
                  <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                    {{ t('pocket.actionDownloadJsonSubtitle') }}
                  </p>
                </div>
              </button>

              <button
                type="button"
                :disabled="isOwnMainPocket(pocket)"
                class="flex w-full items-center gap-4 rounded-xl px-4 py-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent dark:disabled:hover:bg-transparent"
                :class="isOwnMainPocket(pocket) ? 'text-slate-400 dark:text-slate-500' : 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'"
                @click="emit('delete'); emit('close')"
              >
                <div
                  class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                  :class="isOwnMainPocket(pocket) ? 'bg-slate-100 dark:bg-slate-700' : 'bg-red-100 dark:bg-red-900/30'"
                >
                  <font-awesome-icon
                    :icon="['fas', 'trash']"
                    class="h-5 w-5"
                    :class="isOwnMainPocket(pocket) ? 'text-slate-400 dark:text-slate-500' : 'text-red-600 dark:text-red-400'"
                  />
                </div>
                <div class="min-w-0 flex-1 text-left">
                  <p class="font-semibold" :class="isOwnMainPocket(pocket) ? 'text-slate-400 dark:text-slate-500' : 'text-red-600 dark:text-red-400'">
                    {{ t('pocket.actionDelete') }}
                  </p>
                  <p class="mt-0.5 text-sm" :class="isOwnMainPocket(pocket) ? 'text-slate-400 dark:text-slate-500' : 'text-red-500 dark:text-red-400/80'">
                    {{ t('pocket.actionDeleteSubtitle') }}
                  </p>
                </div>
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
