export type PocketType = 'main' | 'spending' | 'saving' | 'investment'

export interface Pocket {
  id: string
  name: string
  icon: string
  type: PocketType
  balance: number
  createdAt: string
  /** Pocket card color (hex). Optional; default from presets. */
  color?: string
}

export interface CreatePocketData {
  name: string
  icon: string
  type: Exclude<PocketType, 'main'>
  color?: string
}
