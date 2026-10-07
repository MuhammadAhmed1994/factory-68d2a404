'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createSession } from '../lib/session'

const GENERIC_ERROR = "We couldn't sign you in. Check your credentials and try again."
const FIELD_STYLE = {
  width: '100%',
  minHeight: 44,
  marginTop: 6,
  padding: '10px 12px',
  border: '1px solid var(--sd-border)',
  borderRadius: 'var(--sd-radius-control)',
  background: 'var(--sd-card)',
  color: 'var(--sd-foreground)',
  font: 'inherit',
} as const

export default function SignInForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const errorRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (error) errorRef.current?.focus()
  }, [error])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    setError('')
    if (!email.trim() || !password) {
      setError('Enter your email and password to continue.')
      return
    }

    setPending(true)
    try {
      const response = await createSession({ email: email.trim(), password })
      if (response.user.role === 'admin') {
        router.push('/admin/tickets')
      } else if (response.user.role === 'customer') {
        router.push('/tickets')
      } else {
        setError(GENERIC_ERROR)
      }
    } catch {
      // Never reveal whether an account exists, is active, or has a matching password.
      setError(GENERIC_ERROR)
    } finally {
      setPending(false)
    }
  }

  return (
    <section aria-labelledby="sign-in-title" style={{ width: 'min(100%, 420px)', padding: '36px clamp(24px, 7vw, 40px) 32px', border: '1px solid rgba(207, 217, 224, .92)', borderRadius: 12, background: 'var(--sd-card)', boxShadow: '0 2px 5px rgba(23, 43, 58, .035), 0 14px 36px rgba(23, 43, 58, .075)' }}>
      <div aria-hidden="true" style={{ width: 42, height: 4, marginBottom: 22, borderRadius: 2, background: 'var(--sd-accent)' }} />
      <p style={{ margin: '0 0 8px', color: 'var(--sd-primary)', fontSize: 11, fontWeight: 600, letterSpacing: '.09em', textTransform: 'uppercase' }}>SimpleDesk Support</p>
      <h1 id="sign-in-title" style={{ margin: 0, color: 'var(--sd-foreground)', fontSize: 24, lineHeight: '32px', fontWeight: 600, letterSpacing: '-.45px' }}>Sign in to SimpleDesk</h1>
      <p style={{ margin: '12px 0 24px', color: 'var(--sd-muted-foreground)', fontSize: 14, lineHeight: '22px' }}>Enter your work email and password.</p>
      <form onSubmit={handleSubmit} noValidate>
        <div style={{ marginBottom: 18 }}>
          <label htmlFor="sign-in-email" style={{ display: 'block', fontWeight: 600 }}>Email</label>
          <input id="sign-in-email" name="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} style={FIELD_STYLE} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label htmlFor="sign-in-password" style={{ display: 'block', fontWeight: 600 }}>Password</label>
          <div style={{ position: 'relative' }}>
            <input id="sign-in-password" name="password" type={passwordVisible ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} style={{ ...FIELD_STYLE, paddingRight: 82 }} />
            <button type="button" aria-label={passwordVisible ? 'Hide password' : 'Show password'} aria-pressed={passwordVisible} onClick={() => setPasswordVisible((visible) => !visible)} style={{ position: 'absolute', top: 12, right: 10, minHeight: 30, padding: '3px 6px', border: 0, borderRadius: 4, background: 'transparent', color: 'var(--sd-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{passwordVisible ? 'Hide' : 'Show'}</button>
          </div>
        </div>
        {error ? <p ref={errorRef} tabIndex={-1} role="alert" style={{ margin: '0 0 16px', padding: '10px 12px', border: '1px solid #F0C7C3', borderRadius: 4, background: '#FFF7F6', color: 'var(--sd-destructive)', fontSize: 13 }}>{error}</p> : null}
        <button type="submit" disabled={pending} style={{ width: '100%', minHeight: 46, padding: '11px 16px', border: '1px solid var(--sd-primary)', borderRadius: 4, background: pending ? '#526675' : 'var(--sd-primary)', color: '#FFFFFF', fontSize: 14, fontWeight: 600, cursor: pending ? 'wait' : 'pointer', opacity: pending ? 0.85 : 1 }}>
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <div style={{ height: 1, margin: '24px 0 16px', background: '#E8EDF0' }} />
      <p style={{ margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, color: 'var(--sd-muted-foreground)', fontSize: 12 }}><span aria-hidden="true" style={{ color: 'var(--sd-success)' }}>✓</span>Your sign-in is secure</p>
    </section>
  )
}
