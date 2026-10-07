import Link from 'next/link'
import CustomerCreateForm from '../../../../components/customer-create-form'

export default function NewCustomerPage() {
  return (
    <section aria-labelledby="page-title">
      <nav aria-label="Breadcrumb">
        <Link href="/admin/customers">Customers</Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">Add customer</span>
      </nav>
      <header>
        <h1 id="page-title">Add customer</h1>
        <p>Enter the customer’s contact details. Customer email can’t be changed after creation.</p>
      </header>
      <CustomerCreateForm />
    </section>
  )
}
