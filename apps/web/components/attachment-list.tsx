'use client'

import { ChangeEvent, useId, useRef, useState } from 'react'
import styles from './attachment-list.module.css'

export interface Attachment {
  id: string
  fileName: string
  sizeBytes: number
  uploader: string
  downloadUrl?: string
}

export interface AttachmentListProps {
  attachments?: Attachment[]
  /** Called whenever the local selection changes, so a parent form can submit it. */
  onFilesChange?: (files: File[]) => void
  /** Upload one file. Report byte-independent progress as a percentage from 0 to 100. */
  onUpload?: (
    file: File,
    onProgress: (percentage: number) => void,
  ) => Promise<Attachment>
  /** Optional download action for attachments without a downloadUrl. */
  onDownloadAttachment?: (attachment: Attachment) => void | Promise<void>
  uploadErrorMessage?: string
  emptyMessage?: string
  label?: string
  uploaderName?: string
}

interface SelectedFile {
  key: number
  file: File
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} ${bytes === 1 ? 'byte' : 'bytes'}`
  const units = ['KB', 'MB', 'GB', 'TB']
  let size = bytes / 1024
  let unit = 0
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024
    unit += 1
  }
  return `${size < 10 ? size.toFixed(1) : Math.round(size)} ${units[unit]}`
}

export default function AttachmentList({
  attachments = [],
  onFilesChange,
  onUpload,
  onDownloadAttachment,
  uploadErrorMessage = 'We could not upload this file. Please try again.',
  emptyMessage = 'No attachments yet.',
  label = 'Attachments',
  uploaderName = 'You',
}: AttachmentListProps) {
  const inputId = useId()
  const nextKey = useRef(0)
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<Attachment[]>([])
  const [progressByKey, setProgressByKey] = useState<Record<number, number>>({})
  const [errorsByKey, setErrorsByKey] = useState<Record<number, string>>({})
  const [isUploading, setIsUploading] = useState(false)

  const shownAttachments = [...attachments, ...uploadedFiles].filter(
    (attachment, index, all) => all.findIndex((item) => item.id === attachment.id) === index,
  )
  const hasContent = shownAttachments.length > 0 || selectedFiles.length > 0

  function updateSelection(next: SelectedFile[]) {
    setSelectedFiles(next)
    onFilesChange?.(next.map(({ file }) => file))
  }

  function handleFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const newlySelected = Array.from(event.currentTarget.files ?? []).map((file) => ({
      key: nextKey.current++,
      file,
    }))
    if (newlySelected.length) updateSelection([...selectedFiles, ...newlySelected])
    // Allow selecting the same file again after removing it.
    event.currentTarget.value = ''
  }

  function removeSelected(key: number) {
    updateSelection(selectedFiles.filter((item) => item.key !== key))
    setProgressByKey((current) => {
      const next = { ...current }
      delete next[key]
      return next
    })
    setErrorsByKey((current) => {
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  async function uploadSelected() {
    if (!onUpload || isUploading || selectedFiles.length === 0) return
    setIsUploading(true)
    let remainingFiles = selectedFiles

    // Upload in order to make progress and recoverable errors clear for keyboard and screen-reader users.
    for (const selected of selectedFiles) {
      setErrorsByKey((current) => {
        const next = { ...current }
        delete next[selected.key]
        return next
      })
      setProgressByKey((current) => ({ ...current, [selected.key]: 0 }))
      try {
        const result = await onUpload(selected.file, (percentage) => {
          const bounded = Math.max(0, Math.min(100, percentage))
          setProgressByKey((current) => ({ ...current, [selected.key]: bounded }))
        })
        setUploadedFiles((current) => [...current, result])
        remainingFiles = remainingFiles.filter((item) => item.key !== selected.key)
        setSelectedFiles(remainingFiles)
        onFilesChange?.(remainingFiles.map(({ file }) => file))
        setProgressByKey((current) => {
          const next = { ...current }
          delete next[selected.key]
          return next
        })
      } catch (error) {
        setErrorsByKey((current) => ({
          ...current,
          [selected.key]: error instanceof Error && error.message ? error.message : uploadErrorMessage,
        }))
      }
    }
    setIsUploading(false)
  }

  return (
    <section className={styles.attachmentSection} aria-labelledby={`${inputId}-heading`}>
      <div className={styles.headingRow}>
        <h2 className={styles.heading} id={`${inputId}-heading`}>{label}</h2>
        <span className={styles.count}>
          {shownAttachments.length + selectedFiles.length} {shownAttachments.length + selectedFiles.length === 1 ? 'file' : 'files'}
        </span>
      </div>

      <div className={styles.pickerArea}>
        <input
          className={styles.fileInput}
          id={inputId}
          type="file"
          multiple
          onChange={handleFileSelection}
          aria-describedby={`${inputId}-hint`}
          disabled={isUploading}
        />
        <label className={styles.pickButton} htmlFor={inputId}>Choose files</label>
        <span className={styles.pickerHint} id={`${inputId}-hint`}>
          Select one or more files. No file type or size restrictions are applied here.
        </span>
      </div>

      {!hasContent ? (
        <p className={styles.emptyState}>{emptyMessage}</p>
      ) : (
        <ul className={styles.fileList} aria-label={label}>
          {shownAttachments.map((attachment) => (
            <li className={styles.fileRow} key={`uploaded-${attachment.id}`}>
              <div className={styles.fileDetails}>
                <span className={styles.fileName}>{attachment.fileName}</span>
                <span className={styles.metadata}>
                  {formatFileSize(attachment.sizeBytes)} <span aria-hidden="true">·</span> Uploaded by {attachment.uploader}
                </span>
              </div>
              {attachment.downloadUrl ? (
                <a className={styles.downloadAction} href={attachment.downloadUrl} download>
                  Download <span className={styles.visuallyHidden}>{attachment.fileName}</span>
                </a>
              ) : onDownloadAttachment ? (
                <button
                  className={styles.downloadAction}
                  type="button"
                  onClick={() => void onDownloadAttachment(attachment)}
                >
                  Download <span className={styles.visuallyHidden}>{attachment.fileName}</span>
                </button>
              ) : null}
            </li>
          ))}

          {selectedFiles.map(({ key, file }) => {
            const progress = progressByKey[key]
            const error = errorsByKey[key]
            return (
              <li className={styles.fileRow} key={`selected-${key}`}>
                <div className={styles.fileDetails}>
                  <span className={styles.fileName}>{file.name}</span>
                  <span className={styles.metadata}>
                    {formatFileSize(file.size)} <span aria-hidden="true">·</span> {uploaderName} · Not uploaded
                  </span>
                  {progress !== undefined && (
                    <div className={styles.progressGroup}>
                      <progress
                        className={styles.progress}
                        value={progress}
                        max={100}
                        aria-label={`Uploading ${file.name}`}
                      />
                      <span className={styles.progressText} aria-live="polite">{progress}% uploaded</span>
                    </div>
                  )}
                  {error && <p className={styles.error} role="alert">{error}</p>}
                </div>
                <button
                  className={styles.removeAction}
                  type="button"
                  onClick={() => removeSelected(key)}
                  disabled={isUploading}
                  aria-label={`Remove ${file.name}`}
                >
                  Remove
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {onUpload && selectedFiles.length > 0 && (
        <div className={styles.uploadActions}>
          <button
            className={styles.uploadButton}
            type="button"
            onClick={() => void uploadSelected()}
            disabled={isUploading}
          >
            {isUploading ? 'Uploading…' : 'Upload files'}
          </button>
          {isUploading && <span className={styles.srOnly} role="status">Uploading selected files</span>}
        </div>
      )}
    </section>
  )
}
