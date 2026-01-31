<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useProfileStore } from '@/stores/profile'
import BottomSheet from '@/components/ui/BottomSheet.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { avatarCategories, type AvatarCategoryId } from '@/data/avatarGallery'
import { useI18n } from 'vue-i18n'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()
const profileStore = useProfileStore()

type Step = 'source' | 'upload' | 'gallery'

const step = ref<Step>('source')
const fileInput = ref<HTMLInputElement | null>(null)
const previewUrl = ref<string>('')
const showResetConfirm = ref(false)
/** Avatar when modal was opened; Cancel/close without Done keeps this. */
const initialAvatar = ref<string>('')

function openUpload() {
  step.value = 'upload'
  fileInput.value?.click()
}

const activeTab = ref<AvatarCategoryId>('female')

function openGallery() {
  step.value = 'gallery'
  previewUrl.value = ''
  activeTab.value = 'female'
}

const currentCategory = computed(() =>
  avatarCategories.find((c) => c.id === activeTab.value),
)

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !file.type.startsWith('image/')) return
  const reader = new FileReader()
  reader.onload = () => {
    previewUrl.value = reader.result as string
  }
  reader.readAsDataURL(file)
  input.value = ''
}

function selectPreset(url: string) {
  previewUrl.value = url
}

/** Save current preview to profile only when user confirms with Done. */
function done() {
  const toSave = previewUrl.value || initialAvatar.value
  profileStore.updateProfile({ avatar: toSave })
  emit('close')
  step.value = 'source'
  previewUrl.value = ''
  showResetConfirm.value = false
}

function back() {
  if (step.value === 'gallery' || step.value === 'upload') {
    step.value = 'source'
    previewUrl.value = ''
  }
}

function requestReset() {
  showResetConfirm.value = true
}

function confirmReset() {
  profileStore.updateProfile({ avatar: '' })
  showResetConfirm.value = false
  emit('close')
  step.value = 'source'
  previewUrl.value = ''
}

function cancelReset() {
  showResetConfirm.value = false
}

function handleSheetClose() {
  if (showResetConfirm.value) {
    cancelReset()
  } else if (step.value !== 'source') {
    back()
  } else {
    emit('close')
  }
}

const sheetTitle = computed(() => {
  if (showResetConfirm.value) return t('profile.avatar.resetTitle')
  if (step.value === 'source') return t('profile.avatar.title')
  if (step.value === 'upload') return t('profile.avatar.upload')
  return t('profile.avatar.gallery')
})

/** Preview in modal: pending selection or avatar from when modal opened. */
const displayPreview = computed(() => previewUrl.value || initialAvatar.value)

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      initialAvatar.value = profileStore.profile.avatar ?? ''
      previewUrl.value = ''
    } else {
      step.value = 'source'
      previewUrl.value = ''
      showResetConfirm.value = false
      activeTab.value = 'female'
    }
  },
)
</script>

<template>
  <BottomSheet :is-open="isOpen" :title="sheetTitle" max-height="85" @close="handleSheetClose">
    <div v-if="showResetConfirm" class="space-y-4 py-2">
      <p class="text-sm text-slate-600 dark:text-slate-400">
        {{ t('profile.avatar.resetDesc') }}
      </p>
      <div class="flex gap-3">
        <BaseButton variant="secondary" class="flex-1" @click="cancelReset">
          {{ t('common.cancel') }}
        </BaseButton>
        <BaseButton class="flex-1" @click="confirmReset">
          {{ t('profile.avatar.reset') }}
        </BaseButton>
      </div>
    </div>

    <template v-else>
      <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFileChange" />
      <!-- Step: Choose source -->
      <div v-if="step === 'source'" class="space-y-6">
        <p class="text-sm text-slate-600 dark:text-slate-400">
          {{ t('profile.avatar.storedLocally') }}
        </p>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button type="button"
            class="flex items-center gap-4 rounded-xl border-2 border-slate-200 bg-white p-4 text-left transition hover:border-brand/50 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand/50 dark:hover:bg-slate-700/50"
            @click="openUpload">
            <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
              <font-awesome-icon :icon="['fas', 'upload']" class="text-2xl" />
            </div>
            <div>
              <span class="font-medium text-slate-900 dark:text-slate-100">
                {{ t('profile.avatar.upload') }}
              </span>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                {{ t('profile.avatar.uploadDesc') }}
              </p>
            </div>
          </button>
          <button type="button"
            class="flex items-center gap-4 rounded-xl border-2 border-slate-200 bg-white p-4 text-left transition hover:border-brand/50 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand/50 dark:hover:bg-slate-700/50"
            @click="openGallery">
            <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
              <font-awesome-icon :icon="['fas', 'camera']" class="text-2xl" />
            </div>
            <div>
              <span class="font-medium text-slate-900 dark:text-slate-100">
                {{ t('profile.avatar.gallery') }}
              </span>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                {{ t('profile.avatar.galleryDesc') }}
              </p>
            </div>
          </button>
        </div>
        <div class="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
          <p class="text-xs text-slate-500 dark:text-slate-400">
            {{ t('profile.avatar.localOnly') }}
          </p>
        </div>
        <BaseButton v-if="displayPreview" variant="secondary" class="w-full" @click="requestReset">
          <font-awesome-icon :icon="['fas', 'trash']" class="mr-2" />
          {{ t('profile.avatar.removeAvatar') }}
        </BaseButton>
      </div>

      <!-- Step: Upload (after file chosen) or Gallery -->
      <div v-else class="space-y-6">
        <div class="flex flex-col items-center gap-4">
          <div
            class="flex h-28 w-28 shrink-0 overflow-hidden rounded-full border-2 border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
            <img v-if="displayPreview" :src="displayPreview" alt="Preview" class="h-full w-full object-cover" />
            <div v-else class="flex h-full w-full items-center justify-center text-4xl text-slate-400">
              <font-awesome-icon :icon="['fas', 'user']" />
            </div>
          </div>
          <p class="text-center text-sm text-slate-600 dark:text-slate-400">
            {{ t('profile.avatar.preview') }}
          </p>
        </div>

        <div v-if="step === 'upload'" class="space-y-3">
          <button type="button"
            class="w-full rounded-xl border-2 border-dashed border-slate-300 py-6 text-slate-500 transition hover:border-brand/50 hover:bg-slate-50 dark:border-slate-600 dark:hover:border-brand/50 dark:hover:bg-slate-800/50"
            @click="fileInput?.click()">
            <font-awesome-icon :icon="['fas', 'upload']" class="mr-2" />
            {{ t('profile.avatar.chooseFile') }}
          </button>
          <button type="button" class="text-sm text-slate-500 underline hover:text-slate-700 dark:hover:text-slate-300"
            @click="back">
            {{ t('nav.back') }}
          </button>
        </div>

        <div v-if="step === 'gallery'" class="space-y-4">
          <!-- Tabs: Female, Male, Kids, Adult, Accessories, etc. -->
          <div class="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
            <button v-for="category in avatarCategories" :key="category.id" type="button" :class="[
              'shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition',
              activeTab === category.id
                ? 'bg-brand text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600',
            ]" @click="activeTab = category.id">
              {{ t(category.labelKey) }}
            </button>
          </div>
          <!-- Grid for selected tab only -->
          <div v-if="currentCategory" class="min-h-[180px]">
            <div class="grid grid-cols-4 gap-3 sm:grid-cols-5">
              <button v-for="avatar in currentCategory.avatars" :key="avatar.id" type="button" :class="[
                'flex aspect-square items-center justify-center overflow-hidden rounded-full border-2 transition',
                displayPreview === avatar.url
                  ? 'border-brand ring-2 ring-brand/30'
                  : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600',
              ]" @click="selectPreset(avatar.url)">
                <img :src="avatar.url" :alt="avatar.id" class="h-full w-full object-cover" />
              </button>
            </div>
          </div>
        </div>

        <div class="flex gap-3">
          <button v-if="step === 'gallery'" type="button"
            class="text-sm text-slate-500 underline hover:text-slate-700 dark:hover:text-slate-300" @click="back">
            {{ t('nav.back') }}
          </button>
          <BaseButton class="flex-1" @click="done">
            {{ t('profile.avatar.done') }}
          </BaseButton>
        </div>
      </div>
    </template>
  </BottomSheet>
</template>
