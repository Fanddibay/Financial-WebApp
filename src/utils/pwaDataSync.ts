/**
 * PWA Data Sync: localStorage <-> Cache Storage
 *
 * On iOS, localStorage is NOT shared between Safari and the installed PWA (standalone).
 * Cache Storage IS shared. So we:
 * - In browser (Safari): periodically write localStorage → Cache
 * - In standalone (PWA): on load, read Cache → localStorage (so data + license "move" with install)
 */

const CACHE_NAME = 'fanplanner-data-sync'
const SYNC_URL = '/__fanplanner_sync__'
const SYNC_META_KEY = '__fanplanner_sync_ts__'

/** Keys we sync (data + license + preferences). Include known keys and prefixes for dynamic ones. */
const SYNC_KEY_PREFIXES = ['financial_tracker_', 'fanplanner_', 'financial-insight-']
const SYNC_KEYS_EXACT = [
  'financial_tracker_transactions',
  'financial_tracker_pockets',
  'financial_tracker_goals',
  'financial_tracker_profile',
  'financial_tracker_theme',
  'financial_tracker_tokens',
  'financial_tracker_usage',
  'financial_tracker_device_uuid',
  'financial_tracker_chat_history',
  'financial_tracker_avatar',
  'financial_tracker_goal_investment_activity',
  'fanplanner_language',
  'fanplanner_notification_read_ids',
  'fanplanner_notification_deleted_ids',
  'fanplanner_notification_pending_period',
  'financial-insight-dismissed',
]
// Dynamic keys: fanplanner_last_notified_* (we'll copy by prefix)
const OPENAI_KEY = 'openai_api_key'

function getAllSyncableEntries(): Record<string, string> {
  const out: Record<string, string> = {}
  try {
    const exactSet = new Set(SYNC_KEYS_EXACT)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key) continue
      if (exactSet.has(key)) {
        const v = localStorage.getItem(key)
        if (v != null) out[key] = v
        continue
      }
      if (SYNC_KEY_PREFIXES.some((p) => key.startsWith(p))) {
        const v = localStorage.getItem(key)
        if (v != null) out[key] = v
      }
      if (key === OPENAI_KEY) {
        const v = localStorage.getItem(key)
        if (v != null) out[key] = v
      }
    }
  } catch {
    // ignore
  }
  return out
}

function applyToLocalStorage(entries: Record<string, string>): void {
  try {
    for (const [key, value] of Object.entries(entries)) {
      localStorage.setItem(key, value)
    }
  } catch {
    // ignore
  }
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  if ((window.navigator as { standalone?: boolean }).standalone === true) return true
  return false
}

/**
 * Write current localStorage (syncable keys) to Cache Storage.
 * Call from browser context so that when user later opens PWA, we can restore.
 */
export async function syncLocalStorageToCache(): Promise<void> {
  if (typeof caches === 'undefined') return
  try {
    const entries = getAllSyncableEntries()
    const payload = {
      ...entries,
      [SYNC_META_KEY]: String(Date.now()),
    }
    const cache = await caches.open(CACHE_NAME)
    await cache.put(
      new Request(SYNC_URL, { method: 'GET' }),
      new Response(JSON.stringify(payload), {
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  } catch {
    // ignore
  }
}

export type SyncResult = { applied: boolean; fullRestore: boolean }

/**
 * Read from Cache Storage and write into localStorage (only if we're in standalone
 * and either localStorage is empty for critical keys, or cache has license we don't).
 * Call BEFORE creating Pinia/stores so they see the restored data.
 * fullRestore: true = we wrote all cache data and caller should reload so stores re-read.
 */
export async function syncCacheToLocalStorage(): Promise<SyncResult> {
  if (typeof caches === 'undefined') return { applied: false, fullRestore: false }
  try {
    const cache = await caches.open(CACHE_NAME)
    const res = await cache.match(new Request(SYNC_URL, { method: 'GET' }))
    if (!res) return { applied: false, fullRestore: false }
    const payload = (await res.json()) as Record<string, string>
    delete payload[SYNC_META_KEY]

    const hasCriticalLocal =
      localStorage.getItem('financial_tracker_transactions') != null ||
      localStorage.getItem('financial_tracker_tokens') != null
    const hasCriticalCache =
      payload['financial_tracker_transactions'] != null || payload['financial_tracker_tokens'] != null

    if (!isStandalone()) return { applied: false, fullRestore: false }

    // Standalone: restore from cache when we have no/minimal local data
    if (!hasCriticalLocal && hasCriticalCache) {
      applyToLocalStorage(payload)
      return { applied: true, fullRestore: true }
    }
    const localToken = localStorage.getItem('financial_tracker_tokens')
    const cacheToken = payload['financial_tracker_tokens']
    if (!localToken && cacheToken) {
      applyToLocalStorage(payload)
      return { applied: true, fullRestore: true }
    }
    // Merge license only so PWA has same license as Safari
    if (cacheToken != null) {
      localStorage.setItem('financial_tracker_tokens', cacheToken)
      const deviceId = payload['financial_tracker_device_uuid']
      if (deviceId != null) localStorage.setItem('financial_tracker_device_uuid', deviceId)
      return { applied: true, fullRestore: false }
    }
    return { applied: false, fullRestore: false }
  } catch {
    return { applied: false, fullRestore: false }
  }
}

/**
 * Request persistent storage so the browser is less likely to evict our data.
 */
export async function requestPersistentStorage(): Promise<void> {
  try {
    if (navigator.storage?.persist) {
      await navigator.storage.persist()
    }
  } catch {
    // ignore
  }
}

let syncToCacheScheduled: ReturnType<typeof setTimeout> | null = null

function scheduleSyncToCache(): void {
  if (syncToCacheScheduled) return
  syncToCacheScheduled = setTimeout(() => {
    syncToCacheScheduled = null
    syncLocalStorageToCache()
  }, 500)
}

/**
 * Start syncing localStorage → Cache when in browser (so installed PWA can restore).
 * Call once after app mount. Skips when in standalone.
 */
export function startPwaSyncToCache(): void {
  if (typeof window === 'undefined' || isStandalone()) return
  syncLocalStorageToCache()
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') scheduleSyncToCache()
  })
  window.addEventListener('beforeunload', () => syncLocalStorageToCache())
  // pagehide fires on mobile when switching tab or adding to home; keeps cache fresh
  window.addEventListener('pagehide', () => syncLocalStorageToCache())
  // Periodic backup so cache is fresh when user installs/add-to-home from any browser
  setInterval(scheduleSyncToCache, 30 * 1000)
}
