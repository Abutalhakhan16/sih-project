import { api } from './client'

export interface PaymentRecord {
  id: number
  booking_id: number
  amount: number
  payment_method: string
  transaction_reference: string
  status: string
  paid_at?: string
}

export async function createPayment(payload: {
  booking_id: number
  amount?: number
  payment_method?: string
}): Promise<{ id: number; status: string; transaction_reference: string }> {
  return api<{ id: number; status: string; transaction_reference: string }>('/payments/create', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function verifyPayment(payload: {
  booking_id: number
  transaction_reference: string
}): Promise<{ id: number; status: string; transaction_reference: string }> {
  return api<{ id: number; status: string; transaction_reference: string }>('/payments/verify', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getPayment(id: number): Promise<PaymentRecord> {
  return api<PaymentRecord>(`/payments/${id}`)
}
