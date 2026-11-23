import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react'
import Banner from '../ui/Banner'
import Button from '../ui/Button'
import Checkbox from '../ui/Checkbox'
import ErrorState from '../ui/ErrorState'
import Field from '../ui/Field'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Skeleton from '../ui/Skeleton'
import Textarea from '../ui/Textarea'
import { event } from '../../content/event'
import { cn } from '../../lib/cn'
import {
  CATEGORIES,
  CONSENT_TEXT,
  CONSENT_VERSION,
  DIETARY_OPTIONS,
  SESSION_INTERESTS,
} from '../../lib/registration'
import useRegistrationForm from '../../hooks/useRegistrationForm'
import PhotoUpload from './PhotoUpload'

/** Truthful arrival-pass copy — never "your QR was emailed". */
export const SUCCESS_COPY =
  'Your pass is issued at the arrival desk after identity verification. No QR code is sent by email before the event.'

const STATUS_STEPS = [
  { n: '1', title: 'Submit', body: 'We receive your details, photo and consent.' },
  { n: '2', title: 'Review', body: 'The team checks your photo and registration.' },
  { n: '3', title: 'Pass issued at arrival', body: 'Identity is verified in person at the desk.' },
]

function StatusSteps() {
  return (
    <ol className="mt-5 border-t border-border">
      {STATUS_STEPS.map((step) => (
        <li key={step.n} className="grid grid-cols-[30px_1fr] gap-3 border-b border-border py-3">
          <span className="font-mono text-xs font-semibold text-gold-700">{step.n}</span>
          <div>
            <p className="text-sm font-semibold text-ink-900">{step.title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-700">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

function PrivacyStrip() {
  return (
    <section className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-paper px-4 py-3">
      <p className="text-xs leading-relaxed text-slate-700">
        Your photo is used for event verification only. It is not published.
      </p>
      <Link
        to={event.links.privacy}
        className="text-xs font-medium text-ink-900 underline underline-offset-4"
      >
        Read the privacy notice
      </Link>
    </section>
  )
}

function statusHref(token) {
  return token
    ? `${event.links.status}?token=${encodeURIComponent(token)}`
    : event.links.status
}

/**
 * RegistrationForm — the in-site intake (FrontendPlanning.md §7.2).
 * One component for public and staff-assisted registration; the page owns
 * framing, offline detection and the registration-closed state.
 */
export default function RegistrationForm({
  assisted = false,
  online = true,
  className,
}) {
  const {
    formData,
    errors,
    submitting,
    submitted,
    submissionResult,
    submitError,
    draftRestored,
    handleChange,
    handleBlur,
    setPhoto,
    toggleSessionInterest,
    handleSubmit,
    reset,
    registerRef,
    dismissDraftBanner,
  } = useRegistrationForm({ assisted })

  const errorEntries = Object.entries(errors)
  const statusLink = statusHref(submissionResult?.statusToken)

  // ─── Success state ───────────────────────────────────────────────────
  if (submitted && submissionResult && !submissionResult.duplicate) {
    return (
      <section
        role="status"
        aria-labelledby="registration-success-heading"
        className={cn('rounded-lg border border-teal-500/30 bg-teal-50 p-6 md:p-8', className)}
      >
        <CheckCircle2 className="h-9 w-9 text-teal-600" aria-hidden="true" />
        <h2
          id="registration-success-heading"
          className="mt-4 text-h3 font-semibold text-ink-900"
        >
          Registration received
        </h2>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-slate-700">
          {SUCCESS_COPY}
        </p>

        <div className="mt-5 rounded-md border border-border bg-paper px-4 py-3">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            Submission ID
          </p>
          <p className="mt-1 break-all font-mono text-sm text-ink-900">
            {submissionResult.submissionId}
          </p>
        </div>

        <StatusSteps />

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            to={statusLink}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-sm bg-ink-900 px-4 text-sm font-medium text-ivory-50 hover:bg-ink-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-900"
          >
            Check status
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Button variant="secondary" onClick={reset}>
            Register another participant
          </Button>
        </div>

        <PrivacyStrip />
      </section>
    )
  }

  // ─── Duplicate state ─────────────────────────────────────────────────
  if (submitted && submissionResult?.duplicate) {
    return (
      <section
        role="alert"
        aria-labelledby="registration-duplicate-heading"
        className={cn('rounded-lg border border-border bg-paper p-6 md:p-8', className)}
      >
        <h2 id="registration-duplicate-heading" className="text-h3 font-semibold text-ink-900">
          Already registered
        </h2>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-slate-700">
          This email address is already registered for the symposium. No duplicate record was
          created. Your pass is issued at the arrival desk after identity verification.
        </p>
        <div className="mt-6">
          <Link
            to={statusHref(submissionResult.statusToken)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-sm bg-ink-900 px-4 text-sm font-medium text-ivory-50 hover:bg-ink-800"
          >
            Check your registration status
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <PrivacyStrip />
      </section>
    )
  }

  // ─── Form states ───────────────────────────────────Child───────────────
  return (
    <div className={cn('reg-form w-full max-w-[820px]', className)}>
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-ink-900 px-5 py-3 text-ivory-50">
        <ShieldCheck className="h-4 w-4 text-gold-500" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.01em]">Delegate registration</p>
          <p className="text-[10px] text-ivory-100/60">{event.shortName} · AIS 2026</p>
        </div>
        <div className="ml-auto flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.1em] text-ivory-100/60">
          <span className="h-1.5 w-1.5 rounded-full bg-teal-500" aria-hidden="true" />
          In-site form
        </div>
      </div>

      <div className="reg-form-notices px-4 pt-4 sm:px-6 sm:pt-5">
      {draftRestored && (
        <Banner
          tone="info"
          title="Draft restored"
          className="mb-4"
          action={
            <Button variant="link" size="sm" onClick={dismissDraftBanner}>
              Dismiss
            </Button>
          }
        >
          We restored the details you entered before. Your photo needs to be selected again.
        </Banner>
      )}

      {!online && (
        <Banner tone="offline" title="You're offline" className="mb-4">
          Your details are saved on this device. You can keep filling the form, but submitting
          needs a connection.
        </Banner>
      )}

      {assisted && (
        <Banner tone="info" title="Staff-assisted registration" className="mb-4">
          This submission is recorded as a walk-in. The participant's pass is issued at the
          arrival desk.
        </Banner>
      )}

      {errorEntries.length > 0 && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-4 rounded-md border border-red-600/30 bg-red-50 px-4 py-3"
        >
          <p className="text-sm font-semibold text-red-700">
            Please check {errorEntries.length}{' '}
            {errorEntries.length === 1 ? 'field' : 'fields'} before submitting:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-700">
            {errorEntries.map(([field, message]) => (
              <li key={field}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      {submitError && (
        <ErrorState
          className="mb-4"
          title="We couldn't submit your registration"
          body={submitError.message}
          requestId={submitError.requestId}
          retry={handleSubmit}
          retryLabel="Try submitting again"
        />
      )}
      </div>

      <form onSubmit={handleSubmit} noValidate aria-busy={submitting}>
        <section aria-labelledby="reg-details-heading" className="reg-section reg-section--details">
          <div className="reg-section-title">
            <span className="reg-section-num" aria-hidden="true">01</span>
            <h2 id="reg-details-heading" className="text-h4 font-semibold text-ink-900">
              Your details
            </h2>
            <span className="reg-section-rule" aria-hidden="true" />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Full name" required error={errors.full_name} helper="As on your ID">
              <Input
                ref={(el) => registerRef('full_name', el)}
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="name"
                placeholder="Debdatta Panda"
                disabled={submitting}
              />
            </Field>

            <Field label="Email" required error={errors.email} helper="Use an email you can access on event day">
              <Input
                ref={(el) => registerRef('email', el)}
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="email"
                placeholder="deb11@gmail.com"
                disabled={submitting}
              />
            </Field>

            <Field label="Phone" required error={errors.phone} helper="10 digits, or +91 followed by 10 digits">
              <Input
                ref={(el) => registerRef('phone', el)}
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="tel"
                placeholder="+91 XXXXX XXXXX"
                disabled={submitting}
              />
            </Field>

            <Field label="Institution" required error={errors.institution} helper="School, college or organisation">
              <Input
                ref={(el) => registerRef('institution', el)}
                id="institution"
                name="institution"
                value={formData.institution}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="organization"
                placeholder="ITER, SOA University"
                disabled={submitting}
              />
            </Field>

            <Field label="Category" required error={errors.category} className="sm:col-span-2 sm:max-w-xs">
              <Select
                ref={(el) => registerRef('category', el)}
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                onBlur={handleBlur}
                options={CATEGORIES}
                placeholder="Select a category"
                disabled={submitting}
              />
            </Field>
          </div>
        </section>

        <section aria-labelledby="reg-photo-heading" className="reg-section reg-section--photo">
          <div className="reg-section-title">
            <span className="reg-section-num" aria-hidden="true">02</span>
            <h2 id="reg-photo-heading" className="text-h4 font-semibold text-ink-900">
              Your photo
            </h2>
            <span className="reg-section-rule" aria-hidden="true" />
          </div>
          <p className="mt-1 text-sm text-slate-700">
            A recent photo helps the arrival desk verify your identity.
          </p>
          <div className="mt-4">
            <PhotoUpload
              id="photo"
              value={formData.photo}
              onChange={setPhoto}
              error={errors.photo}
              disabled={submitting}
            />
          </div>
        </section>

        <section aria-labelledby="reg-consent-heading" className="reg-section reg-section--consent">
          <div className="reg-section-title">
            <span className="reg-section-num" aria-hidden="true">03</span>
            <h2 id="reg-consent-heading" className="text-h4 font-semibold text-ink-900">
              Consent and access
            </h2>
            <span className="reg-section-rule" aria-hidden="true" />
          </div>

          <div className="mt-4">
            <Checkbox
              id="consent_biometric"
              name="consent_biometric"
              checked={formData.consent_biometric}
              onChange={handleChange}
              disabled={submitting}
              error={errors.consent_biometric}
              label={
                <span>
                  {CONSENT_TEXT}{' '}
                  <Link
                    to={event.links.privacy}
                    className="font-medium underline underline-offset-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Read the privacy notice
                  </Link>{' '}
                  <span className="text-muted">(version {CONSENT_VERSION})</span>
                </span>
              }
            />
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Textarea
              id="accessibility_needs"
              name="accessibility_needs"
              label="Accessibility needs (optional)"
              helper="Anything the team should know before you arrive."
              rows={3}
              maxLength={500}
              value={formData.accessibility_needs}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={submitting}
              className="sm:col-span-2"
            />

            <Select
              id="dietary_preference"
              name="dietary_preference"
              label="Dietary preference (optional)"
              options={DIETARY_OPTIONS}
              value={formData.dietary_preference}
              onChange={handleChange}
              disabled={submitting}
            />
          </div>

          <fieldset className="mt-5">
            <legend className="mb-2 text-sm font-medium text-text">
              Session interests (optional)
            </legend>
            <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
              {SESSION_INTERESTS.map((item) => (
                <Checkbox
                  key={item.id}
                  id={`session-${item.id}`}
                  name="session_interest"
                  value={item.id}
                  checked={formData.session_interest.includes(item.id)}
                  onChange={() => toggleSessionInterest(item.id)}
                  disabled={submitting}
                  label={item.label}
                />
              ))}
            </div>
          </fieldset>
        </section>

        <div className="sticky bottom-0 z-20 mt-10 border-t border-ink-900/10 bg-paper/97 px-4 pb-[env(safe-area-inset-bottom)] pt-4 sm:static sm:border-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-2">
          {submitting && (
            <div role="status" aria-live="polite" className="mb-4 flex items-center gap-3">
              <Skeleton lines={2} className="w-48" />
              <span className="text-sm text-slate-700">Submitting your registration…</span>
            </div>
          )}
          <Button
            type="submit"
            size="lg"
            loading={submitting}
            disabled={!online}
            className="w-full sm:w-auto"
          >
            {submitting ? 'Submitting…' : 'Submit registration'}
          </Button>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Your pass is issued at the arrival desk after identity verification. No QR code is
            sent by email before the event.
          </p>
        </div>
      </form>

      <div className="reg-form-footer border-t border-border bg-ivory-50/60 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <Link
            to={event.links.status}
            className="font-medium text-ink-900 underline underline-offset-4"
          >
            Already registered? Check status
          </Link>
          <Link to="/register/assisted" className="text-muted underline underline-offset-4">
            Need help? Use assisted registration
          </Link>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-md border border-sand-200 bg-paper px-3 py-2.5">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold-700" aria-hidden="true" />
          <p className="text-xs leading-relaxed text-slate-700">
            Your photo is used for identity verification on the day only.{' '}
            <Link to={event.links.privacy} className="underline underline-offset-2">
              Privacy notice
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
