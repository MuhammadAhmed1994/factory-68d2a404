'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { endSession, type AuthenticatedUser, type UserRole } from '../lib/session'
import styles from './app-shell.module.css'

export type AppShellProps = {
  role: UserRole
  user: Pick<AuthenticatedUser, 'name' | 'email'>
  children: React.ReactNode
}

type NavigationItem = { label: string; href: string }

const navigation: Record<UserRole, NavigationItem[]> = {
  admin: [
    { label: 'Tickets', href: '/admin/tickets' },
    { label: 'Customers', href: '/admin/customers' },
  ],
  customer: [
    { label: 'My tickets', href: '/tickets' },
  ],
}

export default function AppShell({ role, user, children }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState('')

  async function signOut() {
    if (signingOut) return
    setSigningOut(true)
    setSignOutError('')
    try {
      await endSession()
      router.replace('/sign-in')
      router.refresh()
    } catch {
      setSignOutError('Unable to sign out. Please try again.')
      setSigningOut(false)
    }
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link className={styles.brand} href={role === 'admin' ? '/admin/tickets' : '/tickets'} aria-label="SimpleDesk home">
          <span className={styles.brandMark} aria-hidden="true">S</span>
          <span>SimpleDesk</span>
        </Link>
        <nav className={styles.navigation} aria-label={`${role === 'admin' ? 'Admin' : 'Customer'} navigation`}>
          {navigation[role].map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navLink}${active ? ` ${styles.active}` : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
        <details className={styles.userMenu}>
          <summary aria-label={`User menu for ${user.name}`}>
            <span className={styles.avatar} aria-hidden="true">{user.name.trim().charAt(0).toUpperCase() || 'U'}</span>
            <span className={styles.userName}>{user.name}</span>
            <span className={styles.chevron} aria-hidden="true">▾</span>
          </summary>
          <div className={styles.menuPanel}>
            <p className={styles.menuName}>{user.name}</p>
            <p className={styles.menuEmail}>{user.email}</p>
            <p className={styles.roleLabel}>{role === 'admin' ? 'Administrator' : 'Customer'}</p>
            {signOutError && <p className={styles.signOutError} role="alert">{signOutError}</p>}
            <button className={styles.signOut} type="button" onClick={signOut} disabled={signingOut}>
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </details>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  )
}
