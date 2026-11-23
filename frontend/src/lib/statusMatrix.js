/**
 * statusMatrix — the §7.3 state matrix as data: every state has a designed
 * screen (heading, pill, stepper phases, primary action), not a toast.
 *
 * Copy is taken from FrontendPlanning.md §7.3; nothing here invents a date,
 * contact or process. `steps` phases: done | current | next | error |
 * stopped | upcoming.
 */

export const STEPS = [
  { label: 'Form received' },
  { label: 'Verification' },
  { label: 'QR pass' },
]

/** Shared "what happens next" rows (mockup 04). */
export const NEXT_ROWS = [
  {
    title: 'The team verifies your registration',
    body: 'We check the details you submitted and the photo you provided.',
  },
  {
    title: 'You receive a confirmation email',
    body: 'The email will confirm your place and explain what to bring.',
  },
  {
    title: 'Your QR pass is issued at the arrival desk',
    body: 'A volunteer verifies your identity, then your one-time entry pass is issued on site.',
  },
]

export const STATUS_MATRIX = {
  RECEIVED: {
    pill: { label: 'Received', tone: 'ink' },
    heading: "We've got your form.",
    sub: "We've received your form. The team will verify your details and confirm your place by email. Nothing else is needed from you right now.",
    steps: ['done', 'upcoming', 'upcoming'],
    stepStates: ['Done', 'Upcoming', 'Issued at arrival'],
    primary: 'check',
    showNext: true,
  },
  IN_REVIEW: {
    pill: { label: 'In review', tone: 'amber' },
    heading: "You're in the queue.",
    sub: "We've received your form. The team is checking the details and the photo you submitted. You'll hear from the host office once your place is confirmed.",
    steps: ['done', 'current', 'upcoming'],
    stepStates: ['Done', 'In review', 'Issued at arrival'],
    primary: 'check',
    showNext: true,
  },
  CONFIRMED: {
    pill: { label: 'Confirmed', tone: 'teal' },
    heading: "You're confirmed.",
    sub: 'Your place at the symposium is confirmed. Bring a photo ID and the email you registered with — your QR pass is issued at the arrival desk. You do not need to print anything.',
    steps: ['done', 'done', 'next'],
    stepStates: ['Done', 'Done', 'Issued at arrival'],
    primary: 'details',
    showNext: true,
  },
  WAITLISTED: {
    pill: { label: 'Waitlisted', tone: 'amber' },
    heading: "You're on the waitlist.",
    sub: 'Your registration is in line for a place. If a spot opens, the host office confirms it by email — no action is needed from you until then.',
    steps: ['done', 'current', 'upcoming'],
    stepStates: ['Done', 'In review', 'Issued at arrival'],
    primary: 'support',
    showNext: true,
  },
  NEEDS_INFO: {
    pill: { label: 'Action needed', tone: 'amber' },
    heading: 'We need one more detail.',
    sub: 'Something in your submission needs another look. Open the form to review what you sent, or email the team and we will help directly.',
    steps: ['error', 'upcoming', 'upcoming'],
    stepStates: ['Check your form', 'Upcoming', 'Issued at arrival'],
    primary: 'form',
    secondary: 'support',
    showNext: false,
  },
  REJECTED: {
    pill: { label: 'Not confirmed', tone: 'red' },
    heading: "We couldn't confirm this registration.",
    sub: 'After review, this registration could not be confirmed for this event. If you believe this is wrong, contact the host office with the email you registered with.',
    steps: ['done', 'stopped', 'upcoming'],
    stepStates: ['Done', 'Stopped', 'Not issued'],
    primary: 'support',
    showNext: false,
  },
  CANCELLED: {
    pill: { label: 'Cancelled', tone: 'grey' },
    heading: 'This registration was cancelled.',
    sub: 'This registration was withdrawn and no pass will be issued for it. You are welcome to register again if plans have changed.',
    steps: ['stopped', 'stopped', 'stopped'],
    stepStates: ['Cancelled', 'Cancelled', 'Not issued'],
    primary: 'register',
    showNext: false,
  },
  NOT_FOUND: {
    pill: null,
    heading: "We couldn't find that registration.",
    sub: 'The link may have been mistyped or the registration is no longer on file. Try again, or contact the host office with the email you registered with.',
    steps: null, // hidden per §7.3
    primary: 'retry',
    secondary: 'support',
    showNext: false,
  },
  EXPIRED: {
    pill: null,
    heading: 'This link has expired.',
    sub: 'Signed links stop working after a while for your privacy. Email and reference lookup opens in a later release — until then the host office can confirm your registration directly.',
    steps: null, // hidden per §7.3
    primary: 'lookup', // §7.3 matrix: rendered disabled until the fallback exists (§14.1 #4)
    secondary: 'support',
    showNext: false,
  },
  UNSUPPORTED: {
    pill: null,
    heading: "We can't show this status yet.",
    sub: 'This registration returned a status this page does not know how to display. Nothing is wrong with your link — contact the host office and they will confirm your place.',
    steps: null,
    primary: 'support',
    secondary: 'retry',
    showNext: false,
  },
}

/** Resolve a normalized payload to its matrix entry (never invents one). */
export function resolveStatus(registrationStatus) {
  return STATUS_MATRIX[registrationStatus] ?? STATUS_MATRIX.UNSUPPORTED
}

export default STATUS_MATRIX
