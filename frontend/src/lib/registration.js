/**
 * Registration form validation, field definitions, and submission helpers.
 * Source of truth: React-Registration-Planning.md §2.1–§2.3.
 *
 * Client-side validation mirrors the API contract; the server is authoritative.
 * Every rule here is about UX speed — catching obvious mistakes before a
 * round-trip — not security or data integrity.
 */

// ─── Field definitions ───────────────────────────────────────────────────────

export const CATEGORIES = [
  { value: 'STUDENT', label: 'Student' },
  { value: 'RESEARCHER', label: 'Researcher' },
  { value: 'PROFESSIONAL', label: 'Professional' },
  { value: 'SPEAKER', label: 'Speaker' },
  { value: 'OTHER', label: 'Other' },
]

export const DIETARY_OPTIONS = [
  { value: '', label: 'No preference' },
  { value: 'VEGETARIAN', label: 'Vegetarian' },
  { value: 'VEGAN', label: 'Vegan' },
  { value: 'NON_VEGETARIAN', label: 'Non-vegetarian' },
  { value: 'OTHER', label: 'Other dietary need' },
]

/** Placeholder session interests — replaced by real data from the API once available. */
export const SESSION_INTERESTS = [
  { id: 'nlp', label: 'Natural Language Processing' },
  { id: 'cv', label: 'Computer Vision' },
  { id: 'rl', label: 'Reinforcement Learning' },
  { id: 'ethics', label: 'AI Ethics & Governance' },
  { id: 'healthcare', label: 'AI in Healthcare' },
  { id: 'education', label: 'AI in Education' },
  { id: 'startups', label: 'AI Startups & Industry' },
  { id: 'research', label: 'Research Methodology' },
]

export const CONSENT_VERSION = '2026-11'
export const CONSENT_TEXT =
  'I consent to the collection and processing of my facial photograph for identity verification at the event. ' +
  'The photo and derived data are used only for event check-in and are deleted after the retention period.'

// ─── Initial form state ──────────────────────────────────────────────────────

export function getInitialFormData() {
  return {
    full_name: '',
    email: '',
    phone: '',
    institution: '',
    category: '',
    photo: null,
    consent_biometric: false,
    accessibility_needs: '',
    dietary_preference: '',
    session_interest: [],
  }
}

// ─── Validation ──────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^(\+91[\s-]?)?[6-9]\d{9}$|^\+\d{1,3}\d{4,14}$/

/**
 * Validate a single field. Returns an error string or null.
 * Called on blur and on submit for every required field.
 */
export function validateField(name, value, _formData) {
  switch (name) {
    case 'full_name':
      if (!value?.trim()) return 'Full name is required.'
      if (value.trim().length < 2) return 'Name must be at least 2 characters.'
      if (value.trim().length > 120) return 'Name must be 120 characters or fewer.'
      return null

    case 'email':
      if (!value?.trim()) return 'Email address is required.'
      if (!EMAIL_RE.test(value.trim())) return 'Enter a valid email address.'
      return null

    case 'phone':
      if (!value?.trim()) return 'Phone number is required.'
      if (!PHONE_RE.test(value.trim().replace(/[\s-]/g, '')))
        return 'Enter a valid phone number (e.g. +91 98765 43210).'
      return null

    case 'institution':
      if (!value?.trim()) return 'Institution or organisation is required.'
      if (value.trim().length > 200) return 'Institution must be 200 characters or fewer.'
      return null

    case 'category':
      if (!value) return 'Select a category.'
      return null

    case 'photo':
      if (!value) return 'A photo is required for identity verification.'
      return null

    case 'consent_biometric':
      if (!value) return 'Biometric consent is required to register.'
      return null

    default:
      return null
  }
}

/** Required field names for submit-time validation. */
export const REQUIRED_FIELDS = [
  'full_name',
  'email',
  'phone',
  'institution',
  'category',
  'photo',
  'consent_biometric',
]

/**
 * Validate all fields; returns { errors, firstErrorField }.
 * errors is a Record<string, string> (field → message); empty = valid.
 */
export function validateAll(formData) {
  const errors = {}
  let firstErrorField = null

  for (const field of REQUIRED_FIELDS) {
    const err = validateField(field, formData[field], formData)
    if (err) {
      errors[field] = err
      if (!firstErrorField) firstErrorField = field
    }
  }

  return { errors, firstErrorField }
}

// ─── Submission payload ──────────────────────────────────────────────────────

/**
 * Build a FormData payload matching POST /api/register (§2.3).
 * The API accepts multipart/form-data with the photo as a file field.
 */
export function buildSubmissionPayload(formData, { assisted = false } = {}) {
  // jsdom and older browsers may not expose randomUUID; the API is authoritative
  // for the final submission id, this only correlates the client request.
  const submissionId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `sub-${Date.now()}-${Math.random().toString(16).slice(2)}`
  const now = new Date().toISOString()

  const payload = new FormData()
  // Staff-assisted walk-ins use the same pipeline and table, with a distinct source.
  payload.append('source', assisted ? 'WALK_IN' : 'SITE_FORM')
  payload.append('submission_id', submissionId)
  payload.append('client_event_id', submissionId)
  payload.append('submitted_at', now)
  payload.append('full_name', formData.full_name.trim())
  payload.append('email', formData.email.trim().toLowerCase())
  payload.append('phone', formData.phone.trim().replace(/[\s-]/g, ''))
  payload.append('institution', formData.institution.trim())
  payload.append('category', formData.category)

  if (formData.photo) {
    payload.append('photo', formData.photo)
  }

  payload.append(
    'consent',
    JSON.stringify({
      biometric: true,
      version: CONSENT_VERSION,
      accepted_at: now,
    })
  )

  if (formData.accessibility_needs?.trim()) {
    payload.append('accessibility_needs', formData.accessibility_needs.trim())
  }
  if (formData.dietary_preference) {
    payload.append('dietary_preference', formData.dietary_preference)
  }
  if (formData.session_interest?.length > 0) {
    payload.append('session_interest', JSON.stringify(formData.session_interest))
  }

  return { payload, submissionId }
}

// ─── Error-code mapping (§5) ─────────────────────────────────────────────────

const ERROR_MESSAGES = {
  BAD_PAYLOAD: 'The submission could not be processed. Please check your details and try again.',
  MISSING_FIELD: 'One or more required fields are missing.',
  BAD_EMAIL: 'The email address is not valid.',
  BAD_PHONE: 'The phone number is not valid.',
  DUPLICATE_EMAIL: 'This email address is already registered.',
  DUPLICATE_SUBMISSION: 'This registration has already been submitted.',
  NO_CONSENT: 'Biometric consent is required to register.',
  MISSING_PHOTO: 'A photo is required.',
  UPLOAD_TOO_LARGE: 'The photo is too large. Please use an image under 10 MB.',
  UPLOAD_FAILED: 'The photo could not be uploaded. Please try again.',
  NO_FACE: 'No face was detected in the photo. Please use a clear, front-facing photo.',
  MULTIPLE_FACES: 'Multiple faces were detected. Please use a photo with only your face.',
  LOW_RESOLUTION: 'The photo resolution is too low. Please use an image at least 640×640 pixels.',
  BLURRY: 'The photo appears blurry. Please use a sharper image.',
  DARK: 'The photo appears too dark. Please use a well-lit image.',
  EMBEDDING_FAILED: 'We could not process your photo for matching. The team will review it at the desk.',
  MODEL_MISMATCH: 'Your photo could not be processed automatically. The team will check it at the desk.',
  RATE_LIMITED: 'Too many submissions. Please wait a moment and try again.',
  SPAM_REJECTED: 'This submission was flagged as spam. If this is an error, please contact the host office.',
}

/**
 * Map an API error code to a user-friendly message.
 * Falls back to the raw message if the code is unknown.
 */
export function getErrorMessage(code, fallback) {
  return ERROR_MESSAGES[code] || fallback || 'Something went wrong. Please try again.'
}

// ─── Draft persistence ───────────────────────────────────────────────────────

const DRAFT_KEY = 'geek-ai-registration-draft'

export function saveDraft(formData) {
  try {
    // Don't persist the photo File — it's not serialisable
    const { photo: _photo, ...serialisable } = formData
    localStorage.setItem(DRAFT_KEY, JSON.stringify(serialisable))
  } catch {
    // quota exceeded or private mode — silently skip
  }
}

export function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    // ignore
  }
}
