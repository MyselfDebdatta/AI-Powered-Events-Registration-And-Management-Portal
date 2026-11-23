import { useState, useCallback, useRef, useEffect } from 'react'
import client, { normalizeError } from '../api/client'
import {
  getInitialFormData,
  validateField,
  validateAll,
  buildSubmissionPayload,
  getErrorMessage,
  saveDraft,
  loadDraft,
  clearDraft,
} from '../lib/registration'

/**
 * useRegistrationForm — form state, validation, submission, draft persistence.
 *
 * Returns everything the RegistrationForm component needs; the component is
 * pure presentation. Offline detection lives in the calling page.
 */
export function useRegistrationForm({ assisted = false } = {}) {
  const [formData, setFormData] = useState(getInitialFormData)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submissionResult, setSubmissionResult] = useState(null)
  const [submitError, setSubmitError] = useState(null)
  const [draftRestored, setDraftRestored] = useState(false)
  const submitGuard = useRef(false)
  const fieldRefs = useRef({})

  // ─── Draft restore on mount ──────────────────────────────────────────
  useEffect(() => {
    const draft = loadDraft()
    if (draft) {
      setFormData((prev) => ({ ...prev, ...draft }))
      setDraftRestored(true)
    }
  }, [])

  // ─── Auto-save draft on change (debounced) ───────────────────────────
  const draftTimer = useRef(null)
  useEffect(() => {
    if (submitted) return
    clearTimeout(draftTimer.current)
    draftTimer.current = setTimeout(() => saveDraft(formData), 800)
    return () => clearTimeout(draftTimer.current)
  }, [formData, submitted])

  // ─── Field helpers ───────────────────────────────────────────────────

  const setField = useCallback((name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear field error when user corrects the value
    setErrors((prev) => {
      if (!prev[name]) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
    setSubmitError(null)
  }, [])

  const handleChange = useCallback(
    (e) => {
      const { name, value, type, checked } = e.target
      setField(name, type === 'checkbox' ? checked : value)
    },
    [setField]
  )

  const handleBlur = useCallback(
    (e) => {
      const { name } = e.target
      setTouched((prev) => ({ ...prev, [name]: true }))
      const err = validateField(name, formData[name], formData)
      setErrors((prev) => {
        if (err) return { ...prev, [name]: err }
        const next = { ...prev }
        delete next[name]
        return next
      })
    },
    [formData]
  )

  const setPhoto = useCallback(
    (file) => {
      setField('photo', file)
      setTouched((prev) => ({ ...prev, photo: true }))
      if (file) {
        setErrors((prev) => {
          const next = { ...prev }
          delete next.photo
          return next
        })
      }
    },
    [setField]
  )

  const toggleSessionInterest = useCallback((id) => {
    setFormData((prev) => ({
      ...prev,
      session_interest: prev.session_interest.includes(id)
        ? prev.session_interest.filter((s) => s !== id)
        : [...prev.session_interest, id],
    }))
  }, [])

  const registerRef = useCallback((name, el) => {
    if (el) fieldRefs.current[name] = el
  }, [])

  // ─── Focus first error ──────────────────────────────────────────────

  const focusFirstError = useCallback((firstField) => {
    if (!firstField) return
    // Refs are preferred; the id fallback covers primitives that do not forward refs.
    const el = fieldRefs.current[firstField] || document.getElementById(firstField)
    if (el) {
      el.focus?.()
      el.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
    }
  }, [])

  // ─── Submit ─────────────────────────────────────────────────────────

  const handleSubmit = useCallback(
    async (e) => {
      e?.preventDefault()

      // Prevent double submit
      if (submitGuard.current || submitting) return
      submitGuard.current = true

      setSubmitError(null)

      // Validate everything
      const { errors: allErrors, firstErrorField } = validateAll(formData)
      if (Object.keys(allErrors).length > 0) {
        setErrors(allErrors)
        setTouched(
          Object.fromEntries(Object.keys(allErrors).map((k) => [k, true]))
        )
        focusFirstError(firstErrorField)
        submitGuard.current = false
        return
      }

      setSubmitting(true)

      try {
        const { payload, submissionId } = buildSubmissionPayload(formData, { assisted })

        const response = await client.post('/register', payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })

        const result = {
          submissionId: response.data?.submission_id || submissionId,
          status: response.data?.status || 'RECEIVED',
          statusToken: response.data?.status_token || null,
          photoStatus: response.data?.photo_status || null,
          email: formData.email.trim().toLowerCase(),
        }

        setSubmissionResult(result)
        setSubmitted(true)
        clearDraft()
      } catch (err) {
        const normalised = normalizeError(err)
        const code = err.response?.data?.code
        const isDuplicate = code === 'DUPLICATE_EMAIL' || code === 'DUPLICATE_SUBMISSION'

        if (isDuplicate) {
          // Show duplicate state instead of error
          setSubmissionResult({
            duplicate: true,
            email: formData.email.trim().toLowerCase(),
            statusToken: err.response?.data?.status_token || null,
          })
          setSubmitted(true)
          clearDraft()
        } else {
          // Map server field errors to our error state
          if (normalised.fields && Object.keys(normalised.fields).length > 0) {
            setErrors(normalised.fields)
            const firstField = Object.keys(normalised.fields)[0]
            focusFirstError(firstField)
          }

          // Photo-specific errors
          const photoErrors = ['NO_FACE', 'MULTIPLE_FACES', 'LOW_RESOLUTION', 'BLURRY', 'DARK', 'UPLOAD_TOO_LARGE', 'UPLOAD_FAILED', 'MISSING_PHOTO']
          if (photoErrors.includes(code)) {
            setErrors((prev) => ({ ...prev, photo: getErrorMessage(code) }))
            focusFirstError('photo')
          }

          setSubmitError({
            message: getErrorMessage(code, normalised.message),
            code,
            requestId: normalised.requestId,
            isNetwork: normalised.isNetwork,
          })
        }
      } finally {
        setSubmitting(false)
        submitGuard.current = false
      }
    },
    [formData, submitting, assisted, focusFirstError]
  )

  // ─── Reset ──────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setFormData(getInitialFormData())
    setErrors({})
    setTouched({})
    setSubmitting(false)
    setSubmitted(false)
    setSubmissionResult(null)
    setSubmitError(null)
    setDraftRestored(false)
    clearDraft()
  }, [])

  const dismissDraftBanner = useCallback(() => {
    setDraftRestored(false)
  }, [])

  return {
    formData,
    errors,
    touched,
    submitting,
    submitted,
    submissionResult,
    submitError,
    draftRestored,
    // Actions
    setField,
    handleChange,
    handleBlur,
    setPhoto,
    toggleSessionInterest,
    handleSubmit,
    reset,
    registerRef,
    dismissDraftBanner,
  }
}

export default useRegistrationForm
