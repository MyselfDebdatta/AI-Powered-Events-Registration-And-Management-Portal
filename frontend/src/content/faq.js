/**
 * FAQ content — answers describe only what the platform and the plan state
 * as fact (FrontendPlanning.md §4.2 voice, §7.1 content rules). Anything the
 * host office has not confirmed is written as "to be announced".
 */

export const faqs = [
  {
    id: 'platform',
    question: 'Which organisation runs this portal?',
    answer:
      'This registration portal is built and operated by the GeekAI Developer Team. It currently handles registration for the Odisha AI Symposium 2026. It is not the symposium’s official website.',
  },
  {
    id: 'register',
    question: 'How do I register?',
    answer:
      'Registration is completed on this site. Enter your details, a recent photo and your consent, and the team reviews your submission.',
  },
  {
    id: 'pass',
    question: 'How do I get my pass?',
    answer:
      'Your pass is issued at the arrival desk when you arrive. You do not need to print anything, and no QR code is sent by email before the event. Registration and status are handled by the GeekAI portal; the pass itself is issued by the event team on site.',
  },
  {
    id: 'bring',
    question: 'What should I bring?',
    answer:
      'Bring a photo ID and the email address you registered with. We check the details and the photo you submitted at the desk.',
  },
  {
    id: 'accessibility',
    question: 'Is the venue accessible?',
    answer:
      'Accessibility notes, arrival support and contact details will be published before the event. If you need support now, contact the event team.',
  },
  {
    id: 'when-where',
    question: 'When and where is the event?',
    answer:
      'The date is still to be announced. The symposium is in person at SOA University in Bhubaneswar, Odisha.',
  },
  {
    id: 'registration-required',
    question: 'Do I need to register?',
    answer: 'Yes. Registration is required to attend, and entry is in person only.',
  },
  {
    id: 'contact',
    question: 'Who can I contact?',
    answer:
      'The event team can help with registration, accessibility and attendance. Contact details to be announced.',
  },
]

/** Landing shows the first four; the FAQ page shows all of them. */
export const featuredFaqs = faqs.slice(0, 4)

export const faqStatus = {
  heading: 'Good to know.',
  body: 'Still unsure? These answers explain how the GeekAI registration portal works and what happens on event day.',
}

export default faqs
