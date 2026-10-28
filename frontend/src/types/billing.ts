export type InvoiceStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'VOID'
  | 'OVERDUE'

export type PaymentMethod =
  | 'CASH'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'BANK_TRANSFER'
  | 'UPI'
  | 'INSURANCE_DIRECT'
  | 'CHEQUE'

export type PaymentStatus = 'COMPLETED' | 'PENDING' | 'FAILED' | 'REVERSED'

export type ClaimStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'PARTIALLY_APPROVED'
  | 'REJECTED'
  | 'SETTLED'

export interface ServiceItem {
  id: number
  hospital: number
  hospital_name?: string
  code: string
  name: string
  description?: string
  category: string
  category_display?: string
  unit: string
  unit_price: string | number
  currency: string
  tax_rate: string | number
  is_active: boolean
}

export interface InvoiceLineItem {
  id: number
  invoice: number
  service_item?: number | null
  service_code: string
  description: string
  quantity: string | number
  unit_price: string | number
  discount: string | number
  tax_rate: string | number
  tax_amount: string | number
  subtotal: string | number
  total_amount: string | number
  source_module?: string
  source_id?: string
  created_at: string
}

export interface InvoiceLineItemInput {
  service_item_id?: number | null
  service_code: string
  description: string
  quantity: number
  unit_price: number
  discount?: number
  tax_rate?: number
  source_module?: string
  source_id?: string
}

export interface PaymentAllocation {
  id: number
  payment: number
  invoice: number
  invoice_number?: string
  amount: string | number
  allocated_at: string
  is_reversed: boolean
  reversed_at?: string | null
  reversed_by?: number | null
  reversed_by_name?: string
  reversal_reason?: string
}

export interface Payment {
  id: number
  payment_reference: string
  patient: number
  patient_mrn: string
  patient_name: string
  hospital: number
  hospital_name: string
  payment_date: string
  amount: string | number
  currency: string
  payment_method: PaymentMethod
  payment_method_display?: string
  status: PaymentStatus
  status_display?: string
  external_transaction_id?: string
  idempotency_key?: string
  received_by?: number
  received_by_name?: string
  notes?: string
  allocations?: PaymentAllocation[]
  allocated_amount?: string | number
  unallocated_amount?: string | number
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: number
  invoice_number: string
  patient: number
  patient_mrn: string
  patient_name: string
  hospital: number
  hospital_name: string
  admission?: number | null
  admission_reference?: string | null
  appointment?: number | null
  appointment_reference?: string | null
  encounter?: number | null
  invoice_date: string
  due_date: string
  currency: string
  status: InvoiceStatus
  status_display?: string
  subtotal: string | number
  total_discount: string | number
  total_tax: string | number
  total_amount: string | number
  paid_amount: string | number
  balance_due: string | number
  created_by?: number
  created_by_name?: string
  issued_by?: number | null
  issued_by_name?: string
  issued_at?: string | null
  notes?: string
  line_items: InvoiceLineItem[]
  allocations?: PaymentAllocation[]
  created_at: string
  updated_at: string
}

export interface InvoiceInput {
  patient: number
  hospital: number
  invoice_date?: string
  due_date: string
  currency?: string
  admission?: number
  appointment?: number
  encounter?: number
  notes?: string
  line_items_input: InvoiceLineItemInput[]
}

export interface PaymentInput {
  patient: number
  hospital: number
  amount: number
  payment_method: PaymentMethod
  currency?: string
  payment_date?: string
  external_transaction_id?: string
  notes?: string
  invoice_id?: number | null
}

export interface ReceiptData {
  invoice_number: string
  invoice_date: string
  status: string
  hospital: {
    name: string
    phone: string
    email: string
    address: string
  }
  patient: {
    mrn: string
    name: string
    phone: string
  }
  currency: string
  subtotal: string
  discount: string
  tax: string
  total_amount: string
  paid_amount: string
  balance_due: string
  line_items: {
    code: string
    description: string
    quantity: string
    unit_price: string
    total: string
  }[]
  payments_applied: {
    payment_reference: string
    payment_date: string
    payment_method: string
    allocated_amount: string
    external_transaction_id?: string
  }[]
}

export interface InsuranceProvider {
  id: number
  name: string
  code: string
  payer_id?: string
  email?: string
  phone?: string
  address?: string
  is_active: boolean
}

export interface PatientInsurancePolicy {
  id: number
  patient: number
  patient_mrn: string
  patient_name: string
  provider: number
  provider_code: string
  provider_name: string
  policy_number: string
  masked_policy_number: string
  plan_name: string
  effective_start_date: string
  effective_end_date: string
  coverage_limit: string | number
  copay_percentage: string | number
  is_verified: boolean
  is_active: boolean
}

export interface InsuranceClaim {
  id: number
  claim_reference: string
  invoice: number
  invoice_number?: string
  patient: number
  patient_mrn: string
  patient_name: string
  policy: number
  policy_number?: string
  provider_name?: string
  claimed_amount: string | number
  approved_amount?: string | number | null
  copay_amount?: string | number | null
  status: ClaimStatus
  status_display?: string
  submission_date: string
  decision_date?: string | null
  decision_notes?: string
  payment_reference?: string
}

export interface FinancialSummaryReport {
  hospital_id?: number
  hospital_name?: string
  total_invoiced: string | number
  total_collected: string | number
  total_outstanding: string | number
  total_discounted: string | number
  collection_rate_percent: number
  generated_at?: string
}

export interface InvoiceFilterParams {
  page?: number
  page_size?: number
  search?: string
  status?: InvoiceStatus
  patient?: number
  hospital?: number
  invoice_date?: string
  due_date?: string
}

export interface PaymentFilterParams {
  page?: number
  page_size?: number
  search?: string
  payment_method?: PaymentMethod
  status?: PaymentStatus
  patient?: number
  hospital?: number
}
