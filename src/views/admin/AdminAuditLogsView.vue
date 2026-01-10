<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminAuth } from '@/composables/useAdminAuth'
import { useAdminAuditLogs } from '@/composables/useAdminAuditLogs'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const router = useRouter()
const { isAdmin, loading: authLoading } = useAdminAuth()
const {
  logs,
  loading,
  error,
  filters,
  filteredLogs,
  fetchAuditLogs,
  formatTimestamp,
  formatFullTimestamp,
  shortenToken,
} = useAdminAuditLogs()

// Quick fix SQL for copy button
const quickFixSQL = `CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action VARCHAR(50) NOT NULL CHECK (action IN ('activate', 'deactivate', 'refund', 'create', 'update', 'system')),
  license_token TEXT,
  performed_by TEXT,
  source VARCHAR(50) NOT NULL DEFAULT 'system' CHECK (source IN ('admin_panel', 'webhook', 'system')),
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow SELECT on audit_logs for authenticated" ON audit_logs;
DROP POLICY IF EXISTS "Allow INSERT on audit_logs for authenticated" ON audit_logs;

CREATE POLICY "Allow SELECT on audit_logs for authenticated"
ON audit_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow INSERT on audit_logs for authenticated"
ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);`

// Copy SQL to clipboard
async function copySQLToClipboard() {
  try {
    await navigator.clipboard.writeText(quickFixSQL)
    alert('SQL copied to clipboard! Paste it into Supabase SQL Editor and run it.')
  } catch (err) {
    console.error('Failed to copy SQL:', err)
    alert('Failed to copy SQL. Please manually copy from the code block above.')
  }
}

// Redirect if not admin
onMounted(async () => {
  if (!authLoading.value && !isAdmin.value) {
    router.replace('/admin/access-denied')
    return
  }
  await fetchAuditLogs()
})

// Action options for filter
const actionOptions = [
  { value: 'all', label: 'All Actions' },
  { value: 'activate', label: 'Activate' },
  { value: 'deactivate', label: 'Deactivate' },
  { value: 'refund', label: 'Refund' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'system', label: 'System' },
]

// Get action icon
function getActionIcon(action: string): string[] {
  switch (action) {
    case 'activate':
      return ['fas', 'check-circle']
    case 'deactivate':
      return ['fas', 'xmark-circle']
    case 'refund':
      return ['fas', 'money-bill-wave']
    case 'create':
      return ['fas', 'plus-circle']
    case 'update':
      return ['fas', 'pencil']
    case 'system':
      return ['fas', 'gear']
    default:
      return ['fas', 'circle-info']
  }
}

// Get action color
function getActionColor(action: string): string {
  switch (action) {
    case 'activate':
      return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20'
    case 'deactivate':
      return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20'
    case 'refund':
      return 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/20'
    case 'create':
      return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20'
    case 'update':
      return 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/20'
    case 'system':
      return 'text-slate-600 bg-slate-50 dark:text-slate-400 dark:bg-slate-700/50'
    default:
      return 'text-slate-600 bg-slate-50 dark:text-slate-400 dark:bg-slate-700/50'
  }
}

// Get source badge color
function getSourceColor(source: string): string {
  switch (source) {
    case 'admin_panel':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
    case 'webhook':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
    case 'system':
      return 'bg-slate-100 text-slate-800 dark:bg-slate-700/50 dark:text-slate-300'
    default:
      return 'bg-slate-100 text-slate-800 dark:bg-slate-700/50 dark:text-slate-300'
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
            Audit Logs
          </h1>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
            System and admin action history
          </p>
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
              placeholder="Search logs..."
              class="w-full pl-9" />
          </div>

          <BaseSelect
            v-model="filters.action"
            :options="actionOptions"
            label="Action Filter" />
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="mx-auto max-w-[430px] px-4 py-4">
      <!-- Loading State -->
      <div v-if="loading && logs.length === 0" class="py-12 text-center">
        <FontAwesomeIcon :icon="['fas', 'spinner']" class="mb-4 text-3xl animate-spin text-slate-400" />
        <p class="text-sm text-slate-600 dark:text-slate-400">Loading audit logs...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
        <div class="mb-3 flex items-start gap-3">
          <FontAwesomeIcon :icon="['fas', 'circle-exclamation']" class="mt-0.5 text-red-600 dark:text-red-400" />
          <div class="flex-1">
            <p class="mb-2 text-sm font-medium text-red-800 dark:text-red-400">Error loading audit logs</p>
            <p class="text-xs text-red-700 dark:text-red-300 leading-relaxed">{{ error }}</p>
          </div>
        </div>
        <!-- Retry Button -->
        <div class="mt-3">
          <BaseButton
            variant="primary"
            size="sm"
            :loading="loading"
            :disabled="loading"
            @click="fetchAuditLogs"
            class="w-full">
            <FontAwesomeIcon :icon="['fas', 'arrow-rotate-right']" />
            <span>Retry</span>
          </BaseButton>
        </div>
        <div v-if="error && (error.includes('does not exist') || error.includes('RLS') || error.includes('Permission denied') || error.includes('permission') || error.includes('Database error'))" class="mt-3 rounded border border-red-300 bg-red-100 p-3 dark:border-red-700 dark:bg-red-900/30">
          <p class="mb-2 text-xs font-medium text-red-900 dark:text-red-200">📋 Quick Fix Instructions:</p>
          <ol class="ml-4 list-decimal space-y-1.5 text-xs text-red-800 dark:text-red-300 mb-3">
            <li>Open <strong>Supabase Dashboard</strong> → <strong>SQL Editor</strong></li>
            <li>Copy the SQL from: <code class="rounded bg-red-200 px-1.5 py-0.5 dark:bg-red-800 font-mono text-xs">supabase/create-audit-logs-simple.sql</code></li>
            <li>Paste it into SQL Editor and click <strong>"Run"</strong></li>
            <li>Come back here and click <strong>"Retry"</strong> button below</li>
          </ol>
          <div class="mt-3 rounded border border-blue-300 bg-blue-50 p-3 dark:border-blue-700 dark:bg-blue-900/30">
            <p class="text-xs font-medium text-blue-900 dark:text-blue-100 mb-2">💡 Or copy this SQL directly:</p>
            <button
              @click="copySQLToClipboard"
              class="mb-2 rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-blue-700">
              <FontAwesomeIcon :icon="['fas', 'copy']" class="mr-1" />
              Copy SQL to Clipboard
            </button>
            <details class="text-xs">
              <summary class="cursor-pointer text-blue-800 dark:text-blue-200 font-medium mb-1">Click to view SQL</summary>
              <pre class="text-xs text-blue-900 dark:text-blue-100 overflow-x-auto whitespace-pre-wrap break-all bg-blue-100 p-2 rounded dark:bg-blue-900/50 font-mono mt-2">{{ quickFixSQL }}</pre>
            </details>
          </div>
        </div>
      </div>

      <!-- Empty State (no error, but no logs) -->
      <div v-else-if="!loading && !error && filteredLogs.length === 0" class="py-12 text-center">
        <FontAwesomeIcon :icon="['fas', 'clock-rotate-left']" class="mb-4 text-4xl text-slate-400 dark:text-slate-500" />
        <p class="text-sm font-medium text-slate-900 dark:text-slate-100">No audit logs found</p>
        <p class="mt-1 text-xs text-slate-600 dark:text-slate-400">
          {{ filters.search || filters.action !== 'all' ? 'Try adjusting your filters' : 'No audit logs recorded yet' }}
        </p>
        <p v-if="logs.length === 0" class="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Audit logs will appear here after you perform actions like creating or activating licenses.
        </p>
      </div>

      <!-- Table with horizontal scroll on mobile -->
      <div v-else class="overflow-x-auto -mx-4 px-4">
        <table class="w-full min-w-[800px] border-collapse">
          <thead class="bg-slate-100 dark:bg-slate-800">
            <tr>
              <th class="border-b border-slate-200 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700 dark:border-slate-700 dark:text-slate-300">
                Action
              </th>
              <th class="border-b border-slate-200 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700 dark:border-slate-700 dark:text-slate-300">
                Token
              </th>
              <th class="border-b border-slate-200 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700 dark:border-slate-700 dark:text-slate-300">
                Performed By
              </th>
              <th class="border-b border-slate-200 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700 dark:border-slate-700 dark:text-slate-300">
                Source
              </th>
              <th class="border-b border-slate-200 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700 dark:border-slate-700 dark:text-slate-300">
                Time
              </th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-slate-800">
            <tr
              v-for="log in filteredLogs"
              :key="log.id || log.created_at"
              class="border-b border-slate-200 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50">
              <!-- Action -->
              <td class="px-3 py-4">
                <div class="flex items-center gap-2">
                  <div
                    :class="[
                      'flex h-6 w-6 items-center justify-center rounded-full',
                      getActionColor(log.action),
                    ]">
                    <FontAwesomeIcon :icon="getActionIcon(log.action)" class="text-xs" />
                  </div>
                  <span class="text-xs font-medium capitalize text-slate-900 dark:text-slate-100">
                    {{ log.action }}
                  </span>
                </div>
              </td>

              <!-- Token -->
              <td class="px-3 py-4">
                <code v-if="log.license_token" class="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-900 dark:bg-slate-700 dark:text-slate-100">
                  {{ shortenToken(log.license_token) }}
                </code>
                <span v-else class="text-xs text-slate-400">—</span>
              </td>

              <!-- Performed By -->
              <td class="px-3 py-4">
                <span class="text-xs text-slate-600 dark:text-slate-400">
                  {{ log.performed_by || 'System' }}
                </span>
              </td>

              <!-- Source -->
              <td class="px-3 py-4">
                <span
                  :class="[
                    'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                    getSourceColor(log.source),
                  ]">
                  {{ log.source.replace('_', ' ') }}
                </span>
              </td>

              <!-- Time -->
              <td class="px-3 py-4">
                <div class="flex flex-col">
                  <span class="text-xs text-slate-900 dark:text-slate-100">
                    {{ formatTimestamp(log.created_at) }}
                  </span>
                  <span class="text-xs text-slate-500 dark:text-slate-400">
                    {{ formatFullTimestamp(log.created_at) }}
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
