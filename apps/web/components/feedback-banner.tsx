'use client'

import { useState } from 'react'
import styles from './feedback-banner.module.css'

export type FeedbackVariant = 'success' | 'validation' | 'authentication' | 'notFound'

export type FeedbackBannerProps = {
  variant: FeedbackVariant
  message?: string
  title?: string
  dismissible?: boolean
  className?: string
}

const defaultContent: Record<FeedbackVariant, { title: string; message: string }> = {
  success: { title: 'Success', message: 'Your changes have been saved.' },
  validation: { title: 'Check your information', message: 'Some information needs your attention. Review the fields and try again.' },
  authentication: { title: 'Sign-in unsuccessful', message: 'We couldn’t sign you in with those details. Check your email and password and try again.' },
  notFound: { title: 'Not found', message: 'We couldn’t find the requested item. It may have been moved or is no longer available.' },
}

/** Dismissible, announced feedback. Authentication copy is deliberately generic and not caller-overridable. */
export default function FeedbackBanner({ variant, message, title, dismissible = true, className }: FeedbackBannerProps) {
  const [visible, setVisible] = useState(true)
  if (!visible) return null

  const content = defaultContent[variant]
  const displayedMessage = variant === 'authentication' ? content.message : (message ?? content.message)
  const displayedTitle = title ?? content.title
  const isSuccess = variant === 'success'

  return (
    <section
      className={`${styles.banner} ${styles[variant]}${className ? ` ${className}` : ''}`}
      role={isSuccess ? 'status' : 'alert'}
      aria-live={isSuccess ? 'polite' : 'assertive'}
    >
      <span className={styles.symbol} aria-hidden="true">{isSuccess ? '✓' : '!'}</span>
      <div className={styles.copy}>
        <h2 className={styles.title}>{displayedTitle}</h2>
        <p className={styles.message}>{displayedMessage}</p>
      </div>
      {dismissible && (
        <button className={styles.dismiss} type="button" onClick={() => setVisible(false)} aria-label="Dismiss message">
          <span aria-hidden="true">×</span>
        </button>
      )}
    </section>
  )
}
