'use client'

import { useId, useState, type ChangeEvent, type FormEvent } from 'react'
import styles from './record-form.module.css'

export type RecordFormField = {
  name: string
  label: string
  type?: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'password' | 'number'
  placeholder?: string
  hint?: string
  required?: boolean
  readOnly?: boolean
  options?: Array<{ label: string; value: string }>
  autoComplete?: string
}

export type RecordFormValues = Record<string, string>
export type RecordFormErrors = Record<string, string>

export type RecordFormProps = {
  fields: RecordFormField[]
  initialValues?: RecordFormValues
  mode?: 'create' | 'edit'
  readOnlyEmail?: boolean
  submitLabel?: string
  submittingLabel?: string
  successMessage?: string
  onSubmit: (values: RecordFormValues) => void | RecordFormErrors | Promise<void | RecordFormErrors>
  className?: string
}

export default function RecordForm({
  fields,
  initialValues = {},
  mode = 'create',
  readOnlyEmail = false,
  submitLabel,
  submittingLabel = 'Saving…',
  successMessage = 'Changes saved successfully.',
  onSubmit,
  className,
}: RecordFormProps) {
  const idPrefix = useId()
  const [values, setValues] = useState<RecordFormValues>(() => ({ ...initialValues }))
  const [errors, setErrors] = useState<RecordFormErrors>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  function updateValue(name: string, value: string) {
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => {
      if (!current[name]) return current
      const next = { ...current }
      delete next[name]
      return next
    })
    setFormError('')
    setSuccess(false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    const nextErrors: RecordFormErrors = {}
    fields.forEach((field) => {
      if (field.required && !values[field.name]?.trim()) nextErrors[field.name] = `${field.label} is required.`
    })
    setErrors(nextErrors)
    setFormError('')
    setSuccess(false)
    if (Object.keys(nextErrors).length) return

    setSubmitting(true)
    try {
      const result = await onSubmit({ ...values })
      if (result && Object.keys(result).length) setErrors(result)
      else setSuccess(true)
    } catch (error) {
      // Keep controlled values intact when the server returns recoverable validation feedback.
      const details = error && typeof error === 'object' && 'details' in error ? error.details : undefined
      const payload = details && typeof details === 'object' ? details : undefined
      const serverErrors = payload && 'errors' in payload && payload.errors && typeof payload.errors === 'object'
        ? payload.errors as RecordFormErrors
        : undefined
      if (serverErrors) setErrors(serverErrors)
      else setFormError(error instanceof Error ? error.message : 'Unable to save. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const buttonLabel = submitLabel ?? (mode === 'edit' ? 'Save changes' : 'Create record')

  return (
    <form className={`${styles.form}${className ? ` ${className}` : ''}`} onSubmit={handleSubmit} noValidate>
      {formError && <div className={styles.formError} role="alert">{formError}</div>}
      {fields.map((field) => {
        const id = `${idPrefix}-record-${field.name}`
        const errorId = `${id}-error`
        const hintId = `${id}-hint`
        const isEmailLocked = readOnlyEmail && field.type === 'email'
        const describedBy = [field.hint || isEmailLocked ? hintId : '', errors[field.name] ? errorId : ''].filter(Boolean).join(' ') || undefined
        const readOnly = Boolean(field.readOnly || isEmailLocked)
        const common = {
          id,
          name: field.name,
          value: values[field.name] ?? '',
          onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => updateValue(field.name, event.target.value),
          required: field.required,
          readOnly: field.type !== 'select' ? readOnly : undefined,
          disabled: submitting || (readOnly && field.type === 'select'),
          'aria-invalid': Boolean(errors[field.name]),
          'aria-describedby': describedBy,
          className: `${styles.control}${errors[field.name] ? ` ${styles.invalid}` : ''}`,
        }
        return (
          <div className={styles.field} key={field.name}>
            <label className={styles.label} htmlFor={id}>{field.label}{field.required && <span aria-hidden="true"> *</span>}</label>
            {field.type === 'textarea' ? (
              <textarea {...common} placeholder={field.placeholder} rows={4} />
            ) : field.type === 'select' ? (
              <select {...common}>
                <option value="">Select {field.label.toLowerCase()}</option>
                {(field.options ?? []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            ) : (
              <input {...common} type={field.type ?? 'text'} placeholder={field.placeholder} autoComplete={field.autoComplete} />
            )}
            {field.hint && <span className={styles.hint} id={hintId}>{field.hint}</span>}
            {isEmailLocked && !field.hint && <span className={styles.hint} id={hintId}>Email cannot be changed after the record is created.</span>}
            {errors[field.name] && <span className={styles.fieldError} id={errorId} role="alert">{errors[field.name]}</span>}
          </div>
        )
      })}
      <div className={styles.actions}>
        <button className={styles.submit} type="submit" disabled={submitting}>{submitting ? submittingLabel : buttonLabel}</button>
        {success && <p className={styles.success} role="status">{successMessage}</p>}
      </div>
    </form>
  )
}
