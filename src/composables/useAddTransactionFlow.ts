import { nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useToastStore } from '@/stores/toast'
import { usePocketStore } from '@/stores/pocket'
import { useI18n } from 'vue-i18n'
import { formatIDR } from '@/utils/currency'

export type AddTransactionPayload =
  | { pocketId: string; amount: number; type: 'income' | 'expense' }
  | { multi: true; count: number }

/**
 * Shared logic for Add Transaction flow: success feedback + redirect to origin.
 * Use for manual form, scan receipt, and text-generated input.
 */
export function useAddTransactionFlow() {
  const router = useRouter()
  const toast = useToastStore()
  const pocketStore = usePocketStore()
  const { t } = useI18n()

  async function successThenRedirect(origin: string, payload?: AddTransactionPayload) {
    if (payload && 'multi' in payload) {
      toast.success(t('transaction.addedMulti', { count: payload.count }))
    } else if (payload && 'pocketId' in payload) {
      const pocket = pocketStore.getPocketById(payload.pocketId)
      const pocketName = pocket?.name ?? t('pocket.title')
      const amount = formatIDR(payload.amount)
      const message = t('transaction.addedToPocket', { pocket: pocketName, amount })
      const action = {
        label: t('transaction.viewTransaction'),
        path: `/pockets/${payload.pocketId}`,
      }
      toast.transactionAdded(message, payload.type, 5000, action)
    } else {
      toast.success(t('transaction.addSuccess'))
    }
    await nextTick()
    router.push(origin)
  }

  return { successThenRedirect }
}
