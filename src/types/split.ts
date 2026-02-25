export interface SplitItem {
  name: string
  /** qty x unit_price = price */
  qty?: number
  unit_price?: number
  price: number
  participant_name: string
}

export interface SplitParticipant {
  name: string
  amount: number
  isMe?: boolean
  /** Itemized: subtotal from assigned items */
  subtotal?: number
  /** Itemized: tax share */
  tax_share?: number
  /** Itemized: service share */
  service_share?: number
  /** Itemized: total share (same as amount) */
  total_share?: number
}

export interface Split {
  id: string
  place_name: string
  /** Legacy: direct total. Itemized: computed from items */
  total_bill: number
  /** Itemized: sum of items */
  subtotal?: number
  tax_percent: number
  service_percent: number
  exclude_service_for_me: boolean
  /** When true, tax and service are split equally among participants */
  split_tax_service_equally?: boolean
  participants: SplitParticipant[]
  /** Itemized: line items */
  items?: SplitItem[]
  my_portion: number
  /** Itemized: subtotal + tax + service */
  final_total?: number
  expense_id: string | null
  pocket_id: string
  created_at: string
  updated_at: string
}

export interface SplitFormData {
  place_name: string
  total_bill?: number
  tax_percent: number
  service_percent: number
  exclude_service_for_me: boolean
  participants: SplitParticipant[]
  pocket_id: string
  items?: SplitItem[]
}
