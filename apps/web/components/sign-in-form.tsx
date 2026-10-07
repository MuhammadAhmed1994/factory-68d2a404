'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createSession } from '../lib/session'
import styles from './record-form.module.css'

const GENERIC_ERROR = "We couldn't sign you in. Check your credentials and try again."
const EMPTY_MESSAGE = 'Enter your email and password to continue.'

export default function SignInForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)
  const [empty, setEmpty] = useState(true)
  const [success, setSuccess] = useState(false)
  const errorRef = useRef<HTMLDivElement>(null)
  const pendingRef = useRef(false)

  useEffect(() => {
    if (error) errorRef.current?.focus()
  }, [error])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pendingRef.current) return
    if (!email.trim() || !password) {
      setEmpty(true)
      setError(false)
      return
    }

    setEmpty(false)
    setError(false)
    setSuccess(false)
    pendingRef.current = true
    setPending(true)
    try {
      const { user } = await createSession({ email: email.trim(), password })
      if (user.role === 'admin') {
        setSuccess(true)
        router.push('/admin/tickets')
      } else if (user.role === 'customer') {
        setSuccess(true)
        router.push('/tickets')
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      pendingRef.current = false
      setPending(false)
    }
  }

  return (
    <section aria-labelledby="sign-in-title" style={{ width: 'min(100%, 456px)', padding: '40px 40px 32px', border: '1px solid rgba(207, 217, 224, .92)', borderRadius: 14, background: 'var(--sd-card)', boxShadow: '0 2px 5px rgba(23, 43, 58, .035), 0 14px 36px rgba(23, 43, 58, .075)' }}>
      <p style={{ margin: '0 0 8px', color: 'var(--sd-primary)', fontSize: 11, fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase' }}>Secure sign-in</p>
      <h1 id="sign-in-title" style={{ margin: 0, fontSize: 24, lineHeight: '32px', fontWeight: 600, letterSpacing: '-.55px' }}>Sign in to SimpleDesk</h1>
      <p style={{ margin: '12px 0 28px', color: 'var(--sd-muted-foreground)', lineHeight: '22px' }}>Enter your work email and password.</p>

      <form className={styles.form} onSubmit={submit} noValidate>
        {error && <div ref={errorRef} className={styles.formError} role="alert" tabIndex={-1}>{GENERIC_ERROR}</div>}
        {empty && <p role="status" style={{ margin: 0, color: 'var(--sd-muted-foreground)' }}>{EMPTY_MESSAGE}</p>}
        {success && <p role="status" style={{ margin: 0, color: 'var(--sd-success)', fontWeight: 600 }}>Signed in successfully.</p>}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="sign-in-email">Email</label>
          <input
            className={styles.control}
            id="sign-in-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="sign-in-password">Password</label>
          <div style={{ position: 'relative' }}>
            <input
              className={styles.control}
              style={{ paddingRight: 82 }}
              id="sign-in-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((visible) => !visible)}
              style={{ position: 'absolute', top: '50%', right: 8, transform: 'translateY(-50%)', minHeight: 32, padding: '0 8px', border: 0, borderRadius: 4, background: 'transparent', color: 'var(--sd-primary)', fontWeight: 600, cursor: 'pointer' }}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        <button className={styles.submit} type="submit" disabled={pending} style={{ width: '100%' }}>
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p style={{ margin: '24px 0 0', paddingTop: 18, borderTop: '1px solid #E8EDF0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 7, color: 'var(--sd-muted-foreground)', fontSize: 12 }}>
        <span aria-hidden="true" style={{ color: 'var(--sd-success)' }}>✓</span>
        Your sign-in is secure
      </p>
    </section>
  )
}
