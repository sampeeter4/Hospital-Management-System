import { apiClient } from './client'
import {
  Invoice,
  InvoiceInput,
  ReceiptData,
  Payment,
  PaymentInput,
  ServiceItem,
  InsuranceProvider,
  PatientInsurancePolicy,
  InsuranceClaim,
  FinancialSummaryReport,
  InvoiceFilterParams,
  PaymentFilterParams,
} from '../../types/billing'
import { PaginatedResponse } from '../../types'

export const billingApi = {
  // Invoices
  getInvoices: async (params?: InvoiceFilterParams): Promise<PaginatedResponse<Invoice>> => {
    const res = await apiClient.get<PaginatedResponse<Invoice>>('/billing/invoices/', { params })
    return res.data
  },

  getInvoice: async (id: number): Promise<Invoice> => {
    const res = await apiClient.get<Invoice>(`/billing/invoices/${id}/`)
    return res.data
  },

  createInvoice: async (data: InvoiceInput): Promise<Invoice> => {
    const res = await apiClient.post<Invoice>('/billing/invoices/', data)
    return res.data
  },

  issueInvoice: async (id: number): Promise<Invoice> => {
    const res = await apiClient.post<Invoice>(`/billing/invoices/${id}/issue/`, {})
    return res.data
  },

  voidInvoice: async (id: number, reason: string): Promise<Invoice> => {
    const res = await apiClient.post<Invoice>(`/billing/invoices/${id}/void/`, { reason })
    return res.data
  },

  getInvoiceReceipt: async (id: number): Promise<ReceiptData> => {
    const res = await apiClient.get<ReceiptData>(`/billing/invoices/${id}/receipt/`)
    return res.data
  },

  // Payments
  getPayments: async (params?: PaymentFilterParams): Promise<PaginatedResponse<Payment>> => {
    const res = await apiClient.get<PaginatedResponse<Payment>>('/billing/payments/', { params })
    return res.data
  },

  getPayment: async (id: number): Promise<Payment> => {
    const res = await apiClient.get<Payment>(`/billing/payments/${id}/`)
    return res.data
  },

  recordPayment: async (data: PaymentInput): Promise<Payment> => {
    const res = await apiClient.post<Payment>('/billing/payments/', data)
    return res.data
  },

  // Service Catalogue
  getServiceItems: async (params?: {
    hospital?: number
    category?: string
    is_active?: boolean
    search?: string
    page?: number
    page_size?: number
  }): Promise<PaginatedResponse<ServiceItem>> => {
    const res = await apiClient.get<PaginatedResponse<ServiceItem>>('/billing/services/', {
      params,
    })
    return res.data
  },

  // Insurance
  getInsuranceProviders: async (): Promise<PaginatedResponse<InsuranceProvider>> => {
    const res = await apiClient.get<PaginatedResponse<InsuranceProvider>>(
      '/billing/insurance-providers/'
    )
    return res.data
  },

  getInsurancePolicies: async (params?: {
    patient?: number
    is_active?: boolean
  }): Promise<PaginatedResponse<PatientInsurancePolicy>> => {
    const res = await apiClient.get<PaginatedResponse<PatientInsurancePolicy>>(
      '/billing/policies/',
      { params }
    )
    return res.data
  },

  getInsuranceClaims: async (params?: {
    patient?: number
    invoice?: number
    status?: string
    page?: number
    page_size?: number
  }): Promise<PaginatedResponse<InsuranceClaim>> => {
    const res = await apiClient.get<PaginatedResponse<InsuranceClaim>>('/billing/claims/', {
      params,
    })
    return res.data
  },

  // Financial Summary
  getFinancialSummary: async (hospitalId?: number): Promise<FinancialSummaryReport> => {
    const res = await apiClient.get<FinancialSummaryReport>('/billing/reports/summary/', {
      params: hospitalId ? { hospital: hospitalId } : undefined,
    })
    return res.data
  },
}

