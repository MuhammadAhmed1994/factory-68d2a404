import { Suspense } from 'react'
import Link from 'next/link'
import { headers } from 'next/headers'
import { ApiError, apiRequest } from '../../../../lib/api-client'
import CustomerDetail, { type CustomerRecord } from '../../../../components/customer-detail'
import styles from '../../../../components/customer-detail.module.css'

type PageProps = { params: Promise<{ customerId: string }> }

async function CustomerRecordPage({ customerId }: { customerId: string }) {
  try {
    const requestHeaders = await headers()
    const cookie = requestHeaders.get('cookie')
    const customer = await apiRequest<CustomerRecord>(`/customers/${encodeURIComponent(customerId)}`, {
      headers: cookie ? { Cookie: cookie } : undefined,
    })
    return <CustomerDetail customer={customer} />
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <main className={styles.state}>
          <p className={styles.eyebrow}>Customer management</p>
          <h1>Customer record not found.</h1>
          <Link href="/admin/customers">Back to customers</Link>
        </main>
      )
    }
    return (
      <main className={styles.state} role="alert">
        <p className={styles.eyebrow}>Customer management</p>
        <h1>Customer couldn’t be loaded. Try again.</h1>
        <Link href="/admin/customers">Back to customers</Link>
      </main>
    )
  }
}

function LoadingCustomer() {
  return (
    <main className={styles.state} aria-live="polite" aria-busy="true">
      <p className={styles.eyebrow}>Customer management</p>
      <h1>Loading customer…</h1>
      <div className={styles.loadingBar} aria-hidden="true" />
    </main>
  )
}

export default async function CustomerPage({ params }: PageProps) {
  const { customerId } = await params
  return (
    <Suspense fallback={<LoadingCustomer />}>
      <CustomerRecordPage customerId={customerId} />
    </Suspense>
  )
}
