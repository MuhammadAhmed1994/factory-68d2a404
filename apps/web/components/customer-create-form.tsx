'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import RecordForm, { type RecordFormErrors, type RecordFormValues } from './record-form'
import { apiRequest, type ApiError } from '../lib/api-client'

interface CreatedCustomer {
  id: string
}

function validationErrors(error: unknown): RecordFormErrors {
  const apiError = error as Partial<ApiError> | null
  const details = apiError?.details
  if (details && typeof details === 'object' && 'errors' in details) {
    const errors = (details as { errors?: unknown }).errors
    if (errors && typeof errors === 'object') return errors as RecordFormErrors
  }

  const messages = details && typeof details === 'object' && 'message' in details
    ? (details as { message?: unknown }).message
    : undefined
  const messageList = Array.isArray(messages) ? messages : [messages ?? apiError?.message]
  const text = messageList.filter((message): message is string => typeof message === 'string').join(' ')
  if (/email/i.test(text)) return { email: text }
  if (/name/i.test(text)) return { name: text }

  // Server failures are recoverable here: make the failure visible beside the editable fields
  // and let the user retry without losing either value.
  const feedback = text || 'Customer couldn’t be created. Review these details and try again.'
  return { name: feedback, email: feedback }
}

export default function CustomerCreateForm() {
  const router = useRouter()

  async function createCustomer(values: RecordFormValues): Promise<void | RecordFormErrors> {
    try {
      const customer = await apiRequest<CreatedCustomer>('/customers', {
        method: 'POST',
        body: JSON.stringify({ name: values.name.trim(), email: values.email.trim() }),
      })
      // Keep the announced success state visible briefly before opening the new record.
      window.setTimeout(() => router.push(`/admin/customers/${encodeURIComponent(customer.id)}`), 700)
    } catch (error) {
      return validationErrors(error)
    }
  }

  return (
    <>
      <RecordForm
        fields={[
          { name: 'name', label: 'Name', type: 'text', required: true, autoComplete: 'name' },
          { name: 'email', label: 'Email', type: 'email', required: true, autoComplete: 'email' },
        ]}
        submitLabel="Create customer"
        submittingLabel="Creating customer…"
        successMessage="Customer created."
        onSubmit={createCustomer}
      />
      <p><Link href="/admin/customers">Cancel</Link></p>
    </>
  )
}
