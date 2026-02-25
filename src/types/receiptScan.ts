/** Receipt scan & item splitter - session and allocation types */

export type ReceiptSessionStatus = 'draft' | 'completed'

export interface ReceiptItem {
  id: string
  session_id: string
  name: string
  qty: number
  unit_price: number
  created_at: string
}

export interface ReceiptPerson {
  id: string
  session_id: string
  name: string
  created_at: string
}

export interface ReceiptAllocation {
  id: string
  session_id: string
  person_id: string
  item_id: string
  qty: number
  created_at: string
}

export interface ReceiptSession {
  id: string
  user_id?: string
  image_path: string | null
  extracted_raw_json: string | null
  status: ReceiptSessionStatus
  created_at: string
  updated_at: string
  items?: ReceiptItem[]
  people?: ReceiptPerson[]
  allocations?: ReceiptAllocation[]
}

export interface ExtractedItemRow {
  name: string
  qty: number
  unit_price: number
}

export interface OCRResult {
  items: ExtractedItemRow[]
  raw?: unknown
}
