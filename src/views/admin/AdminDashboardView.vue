<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminAuth } from '@/composables/useAdminAuth'
import { useAdminLicenses } from '@/composables/useAdminLicenses'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import ConfirmModal from '@/components/ui/ConfirmModal.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useToastStore } from '@/stores/toast'

const router = useRouter()
const toastStore = useToastStore()
const { user, isAdmin, loading: authLoading } = useAdminAuth()
const {
  licenses,
  loading,
  error,
  filters,
  filteredLicenses,
  paginatedLicenses,
  paginationInfo,
  rowsPerPage,
  stats,
  fetchLicenses,
  activateLicense,
  deactivateLicense,
  copyTokenToClipboard,
  goToPage,
  nextPage,
  prevPage,
  setRowsPerPage,
} = useAdminLicenses()

const showActivateConfirm = ref(false)
const showDeactivateConfirm = ref(false)
const selectedLicense = ref<string | null>(null)

// Rows per page selector - sync with composable
const rowsPerPageSelect = computed({
  get: () => String(rowsPerPage.value),
  set: (val: string) => {
    setRowsPerPage(Number(val) as 5 | 10 | 15)
  },
})

// Redirect if not admin (handled by route guard, but double-check)
onMounted(async () => {
  if (!authLoading.value && !isAdmin.value) {
    router.replace('/admin/access-denied')
    return
  }
  await fetchLicenses()
})

// Status options for filter
const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'disabled', label: 'Disabled' },
]

// Rows per page options
const rowsPerPageOptions = [
  { value: '5', label: '5 rows' },
  { value: '10', label: '10 rows' },
  { value: '15', label: '15 rows' },
]

// Handle copy token
async function handleCopyToken(token: string) {
  const result = await copyTokenToClipboard(token)
  if (result.success) {
    toastStore.success('Token copied to clipboard!')
  } else {
    toastStore.error('Failed to copy token')
  }
}

// Handle activate action
function handleActivateClick(token: string) {
  selectedLicense.value = token
  showActivateConfirm.value = true
}

// Handle deactivate action
function handleDeactivateClick(token: string) {
  selectedLicense.value = token
  showDeactivateConfirm.value = true
}

// Confirm activate
async function confirmActivate() {
  if (!selectedLicense.value) return

  const result = await activateLicense(selectedLicense.value)
  if (result.success) {
    toastStore.success('License activated successfully')
  } else {
    toastStore.error(result.error || 'Failed to activate license')
  }
  showActivateConfirm.value = false
  selectedLicense.value = null
}

// Confirm deactivate
async function confirmDeactivate() {
  if (!selectedLicense.value) return

  const result = await deactivateLicense(selectedLicense.value)
  if (result.success) {
    toastStore.success('License deactivated successfully')
  } else {
    toastStore.error(result.error || 'Failed to deactivate license')
  }
  showDeactivateConfirm.value = false
  selectedLicense.value = null
}

// Get status badge color
function getStatusColor(status: string) {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
    case 'inactive':
      return 'bg-slate-100 text-slate-800 dark:bg-slate-700/50 dark:text-slate-300'
    case 'disabled':
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    default:
      return 'bg-slate-100 text-slate-800 dark:bg-slate-700/50 dark:text-slate-300'
  }
}

// Format date
function formatDate(dateString: string | null): string {
  if (!dateString) return 'Never'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateString
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 pb-20 dark:bg-slate-900">
    <!-- Header -->
    <div class="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
      <div class="mx-auto max-w-[430px] px-4 py-4">
        <div class="mb-4">
          <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">
            License Management
          </h1>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
            View and manage all license tokens
          </p>
        </div>

        <!-- Stats Cards -->
        <div class="mb-4 grid grid-cols-2 gap-3">
          <div class="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
            <p class="text-xs text-slate-600 dark:text-slate-400">Total</p>
            <p class="text-xl font-bold text-slate-900 dark:text-slate-100">{{ stats.total }}</p>
          </div>
          <div class="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900/20 dark:bg-green-900/10">
            <p class="text-xs text-green-700 dark:text-green-400">Active</p>
            <p class="text-xl font-bold text-green-900 dark:text-green-100">{{ stats.active }}</p>
          </div>
        </div>

        <!-- Filters -->
        <div class="space-y-3">
          <div class="relative">
            <FontAwesomeIcon
              :icon="['fas', 'magnifying-glass']"
              class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400" />
            <BaseInput
              v-model="filters.search"
              type="text"
              placeholder="Search by token..."
              class="w-full pl-9" />
          </div>

          <BaseSelect
            v-model="filters.status"
            :options="statusOptions"
            label="Status Filter" />
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="mx-auto max-w-[430px] px-4 py-4">
      <!-- Loading State -->
      <div v-if="loading && licenses.length === 0" class="py-12 text-center">
        <FontAwesomeIcon :icon="['fas', 'spinner']" class="mb-4 text-3xl animate-spin text-slate-400" />
        <p class="text-sm text-slate-600 dark:text-slate-400">Loading licenses...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
        <p class="text-sm text-red-800 dark:text-red-400">{{ error }}</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredLicenses.length === 0" class="py-12 text-center">
        <FontAwesomeIcon :icon="['fas', 'key']" class="mb-4 text-4xl text-slate-400 dark:text-slate-500" />
        <p class="text-sm font-medium text-slate-900 dark:text-slate-100">No licenses found</p>
        <p class="mt-1 text-xs text-slate-600 dark:text-slate-400">
          {{ filters.search || filters.status !== 'all' ? 'Try adjusting your filters' : 'No licenses in the system yet' }}
        </p>
      </div>

      <!-- Table with Pagination -->
      <div v-else>
        <!-- Rows Per Page Selector (above table) -->
        <div class="mb-4 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
          <div class="flex items-center gap-2">
            <span class="text-xs font-medium text-slate-600 dark:text-slate-400">Show:</span>
            <div class="w-32">
              <BaseSelect
                v-model="rowsPerPageSelect"
                :options="rowsPerPageOptions"
                label="" />
            </div>
          </div>
          <div class="text-xs text-slate-600 dark:text-slate-400">
            Showing {{ paginationInfo.start }}-{{ paginationInfo.end }} of {{ paginationInfo.total }}
          </div>
        </div>

        <!-- Table with horizontal scroll on mobile -->
        <div class="overflow-x-auto -mx-4 px-4">
          <table class="w-full min-w-[640px] border-collapse">
            <thead class="bg-slate-100 dark:bg-slate-800">
              <tr>
                <th class="border-b border-slate-200 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700 dark:border-slate-700 dark:text-slate-300">
                  License Token
                </th>
                <th class="border-b border-slate-200 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700 dark:border-slate-700 dark:text-slate-300">
                  Status
                </th>
                <th class="border-b border-slate-200 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700 dark:border-slate-700 dark:text-slate-300">
                  Device ID
                </th>
                <th class="border-b border-slate-200 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700 dark:border-slate-700 dark:text-slate-300">
                  Activated At
                </th>
                <th class="border-b border-slate-200 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700 dark:border-slate-700 dark:text-slate-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="bg-white dark:bg-slate-800">
              <tr
                v-for="license in paginatedLicenses"
                :key="license.token"
                class="border-b border-slate-200 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50">
              <!-- License Token -->
              <td class="px-3 py-4">
                <div class="flex items-center gap-2">
                  <code class="rounded bg-slate-100 px-2 py-1 text-xs font-mono text-slate-900 dark:bg-slate-700 dark:text-slate-100">
                    {{ license.token }}
                  </code>
                  <button
                    @click="handleCopyToken(license.token)"
                    class="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-600 dark:hover:text-slate-300"
                    title="Copy token">
                    <FontAwesomeIcon :icon="['fas', 'copy']" class="text-sm" />
                  </button>
                </div>
              </td>

              <!-- Status -->
              <td class="px-3 py-4">
                <span
                  :class="[
                    'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                    getStatusColor(license.status),
                  ]">
                  {{ license.status }}
                </span>
              </td>

              <!-- Device ID -->
              <td class="px-3 py-4">
                <span class="text-xs text-slate-600 dark:text-slate-400">
                  {{ license.device_id || '—' }}
                </span>
              </td>

              <!-- Activated At -->
              <td class="px-3 py-4">
                <span class="text-xs text-slate-600 dark:text-slate-400">
                  {{ formatDate(license.activated_at) }}
                </span>
              </td>

              <!-- Actions -->
              <td class="px-3 py-4">
                <div class="flex items-center gap-2">
                  <BaseButton
                    v-if="license.status !== 'active'"
                    variant="primary"
                    size="sm"
                    @click="handleActivateClick(license.token)">
                    <FontAwesomeIcon :icon="['fas', 'check']" class="text-xs" />
                    <span class="text-xs">Activate</span>
                  </BaseButton>
                  <BaseButton
                    v-if="license.status === 'active'"
                    variant="secondary"
                    size="sm"
                    @click="handleDeactivateClick(license.token)">
                    <FontAwesomeIcon :icon="['fas', 'xmark']" class="text-xs" />
                    <span class="text-xs">Deactivate</span>
                  </BaseButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        </div>

        <!-- Pagination Controls (below table) -->
        <div v-if="paginationInfo.totalPages > 1" class="mt-4 flex flex-col items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800 sm:flex-row">
          <!-- Page Info -->
          <div class="text-xs text-slate-600 dark:text-slate-400">
            Page {{ paginationInfo.currentPage }} of {{ paginationInfo.totalPages }}
          </div>

          <!-- Pagination Buttons -->
          <div class="flex items-center gap-2">
            <!-- Previous Button -->
            <BaseButton
              variant="secondary"
              size="sm"
              :disabled="!paginationInfo.hasPrevPage"
              @click="prevPage">
              <FontAwesomeIcon :icon="['fas', 'chevron-left']" />
              <span>Prev</span>
            </BaseButton>

            <!-- Page Numbers (show max 5 pages on mobile) -->
            <div class="flex items-center gap-1">
              <template v-if="paginationInfo.totalPages <= 5">
                <!-- Show all pages if 5 or fewer -->
                <button
                  v-for="page in paginationInfo.totalPages"
                  :key="page"
                  :class="[
                    'min-w-[36px] rounded-lg px-2 py-1.5 text-xs font-medium transition',
                    page === paginationInfo.currentPage
                      ? 'bg-brand text-white dark:bg-brand'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600',
                  ]"
                  @click="goToPage(page)">
                  {{ page }}
                </button>
              </template>
              <template v-else>
                <!-- Show first page, current page area, and last page -->
                <button
                  :class="[
                    'min-w-[36px] rounded-lg px-2 py-1.5 text-xs font-medium transition',
                    1 === paginationInfo.currentPage
                      ? 'bg-brand text-white dark:bg-brand'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600',
                  ]"
                  @click="goToPage(1)">
                  1
                </button>

                <span v-if="paginationInfo.currentPage > 2" class="px-1 text-xs text-slate-400">...</span>

                <template v-if="paginationInfo.currentPage > 1 && paginationInfo.currentPage < paginationInfo.totalPages">
                  <button
                    :class="[
                      'min-w-[36px] rounded-lg px-2 py-1.5 text-xs font-medium transition bg-brand text-white dark:bg-brand',
                    ]">
                    {{ paginationInfo.currentPage }}
                  </button>
                </template>

                <span v-if="paginationInfo.currentPage < paginationInfo.totalPages - 1" class="px-1 text-xs text-slate-400">...</span>

                <button
                  :class="[
                    'min-w-[36px] rounded-lg px-2 py-1.5 text-xs font-medium transition',
                    paginationInfo.totalPages === paginationInfo.currentPage
                      ? 'bg-brand text-white dark:bg-brand'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600',
                  ]"
                  @click="goToPage(paginationInfo.totalPages)">
                  {{ paginationInfo.totalPages }}
                </button>
              </template>
            </div>

            <!-- Next Button -->
            <BaseButton
              variant="secondary"
              size="sm"
              :disabled="!paginationInfo.hasNextPage"
              @click="nextPage">
              <span>Next</span>
              <FontAwesomeIcon :icon="['fas', 'chevron-right']" />
            </BaseButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirm Modals -->
    <ConfirmModal
      :is-open="showActivateConfirm"
      title="Activate License"
      message="Are you sure you want to activate this license?"
      confirm-text="Activate"
      cancel-text="Cancel"
      variant="info"
      :icon="['fas', 'check-circle']"
      @confirm="confirmActivate"
      @close="showActivateConfirm = false" />

    <ConfirmModal
      :is-open="showDeactivateConfirm"
      title="Deactivate License"
      message="Are you sure you want to deactivate this license? The user will lose access."
      confirm-text="Deactivate"
      cancel-text="Cancel"
      variant="warning"
      :icon="['fas', 'exclamation-triangle']"
      @confirm="confirmDeactivate"
      @close="showDeactivateConfirm = false" />
  </div>
</template>
