import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import client from '../../api/client'
import { getErrorMessage } from '../../lib/registration'
import RegistrationForm from './RegistrationForm'

vi.mock('../../api/client', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    default: { ...actual.default, post: vi.fn() },
  }
})

const FORBIDDEN = [
  /your (qr )?(code|pass) (has been |was )(emailed|sent)/i,
  /qr (code|pass)?\s*(was|has been)\s*(emailed|sent)/i,
  /sent to your (email|inbox)/i,
  /check your inbox/i,
  /qr[^.]{0,40}emailed/i,
]

function renderForm(props = {}) {
  return render(
    <MemoryRouter>
      <RegistrationForm {...props} />
    </MemoryRouter>
  )
}

function expectNoFalseClaim() {
  const text = document.body.textContent ?? ''
  for (const pattern of FORBIDDEN) expect(text).not.toMatch(pattern)
}

async function fillRequired(user) {
  await user.type(screen.getByRole('textbox', { name: /Full name/i }), 'Asha Mohanty')
  await user.type(screen.getByRole('textbox', { name: /Email/i }), 'asha@example.com')
  await user.type(screen.getByRole('textbox', { name: /Phone/i }), '+91 98765 43210')
  await user.type(screen.getByRole('textbox', { name: /Institution/i }), 'IIT Bhubaneswar')
  await user.selectOptions(screen.getByRole('combobox', { name: /Category/i }), 'STUDENT')
  const photo = new File(['fake-photo-bytes'], 'photo.jpg', { type: 'image/jpeg' })
  await user.upload(screen.getByLabelText('Upload photo'), photo)
  await user.click(screen.getByRole('checkbox', { name: /consent to the collection/i }))
}

beforeEach(() => {
  localStorage.clear()
  client.post.mockReset()
})

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('RegistrationForm — in-site intake (§7.2)', () => {
  it('validates on blur with a field-level error', async () => {
    const user = userEvent.setup()
    renderForm()

    const email = screen.getByRole('textbox', { name: /Email/i })
    await user.type(email, 'not-an-email')
    await user.tab()

    expect((await screen.findAllByText(/Enter a valid email address/i)).length).toBeGreaterThan(0)
    expect(email.getAttribute('aria-invalid')).toBe('true')
    expectNoFalseClaim()
  })

  it('submits successfully with a submission ID, status link and truthful pass copy', async () => {
    const user = userEvent.setup()
    client.post.mockResolvedValueOnce({
      data: {
        submission_id: 'c1f0e6d2-7b3a-4f19-9c05-2ae8d41b6f30',
        status: 'RECEIVED',
        status_token: 'signed-token',
      },
    })
    renderForm()

    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: /Submit registration/i }))

    expect(
      await screen.findByRole('heading', { name: /Registration received/i })
    ).toBeTruthy()
    expect(screen.getByText(/c1f0e6d2-7b3a-4f19-9c05-2ae8d41b6f30/)).toBeTruthy()
    expect(screen.getByRole('link', { name: /Check status/i }).getAttribute('href')).toBe(
      '/registration/status?token=signed-token'
    )
    expect(document.body.textContent).toMatch(/pass is issued at the arrival desk/i)
    expect(document.body.textContent).toMatch(/no qr code is sent by email/i)
    expectNoFalseClaim()
    expect(client.post.mock.calls[0][0]).toBe('/register')
    expect(client.post.mock.calls[0][1].get('source')).toBe('SITE_FORM')
  })

  it('shows the duplicate state with a one-click status path', async () => {
    const user = userEvent.setup()
    client.post.mockRejectedValueOnce({
      response: { status: 409, data: { code: 'DUPLICATE_EMAIL' } },
    })
    renderForm()

    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: /Submit registration/i }))

    expect(await screen.findByRole('heading', { name: /Already registered/i })).toBeTruthy()
    const link = screen.getByRole('link', { name: /Check your registration status/i })
    expect(link.getAttribute('href')).toBe('/registration/status')
    expectNoFalseClaim()
  })

  it('rejects a bad photo while preserving the other field values', async () => {
    const user = userEvent.setup()
    client.post.mockRejectedValueOnce({
      response: { status: 422, data: { code: 'NO_FACE' } },
    })
    renderForm()

    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: /Submit registration/i }))

    expect((await screen.findAllByText(/No face was detected/i)).length).toBeGreaterThan(0)
    expect(screen.getByRole('textbox', { name: /Full name/i }).value).toBe('Asha Mohanty')
    expect(screen.getByRole('textbox', { name: /Email/i }).value).toBe('asha@example.com')
    expectNoFalseClaim()
  })

  it('marks staff-assisted submissions with the WALK_IN source', async () => {
    const user = userEvent.setup()
    client.post.mockResolvedValueOnce({
      data: { submission_id: 'walk-in-1', status: 'RECEIVED' },
    })
    renderForm({ assisted: true })

    expect(screen.getByText(/Staff-assisted registration/i)).toBeTruthy()
    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: /Submit registration/i }))

    expect(await screen.findByRole('heading', { name: /Registration received/i })).toBeTruthy()
    expect(client.post.mock.calls[0][1].get('source')).toBe('WALK_IN')
    expectNoFalseClaim()
  })

  it('never claims a QR or pass was emailed in any state', async () => {
    renderForm()
    expectNoFalseClaim()
  })

  it('maps every documented API error code to an actionable message (§5)', () => {
    const CODES = [
      'BAD_PAYLOAD', 'MISSING_FIELD', 'BAD_EMAIL', 'BAD_PHONE',
      'DUPLICATE_EMAIL', 'DUPLICATE_SUBMISSION', 'NO_CONSENT', 'MISSING_PHOTO',
      'UPLOAD_TOO_LARGE', 'UPLOAD_FAILED', 'NO_FACE', 'MULTIPLE_FACES',
      'LOW_RESOLUTION', 'BLURRY', 'DARK', 'EMBEDDING_FAILED', 'MODEL_MISMATCH',
      'RATE_LIMITED', 'SPAM_REJECTED',
    ]
    for (const code of CODES) {
      expect(getErrorMessage(code)).toBeTruthy()
      expect(getErrorMessage(code)).not.toMatch(/something went wrong/i)
    }
  })
})
