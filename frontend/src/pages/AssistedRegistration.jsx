import { PageHero, PlaceholderBadge } from '../components/public/PageHero'
import RegistrationForm from '../components/registration/RegistrationForm'
import Banner from '../components/ui/Banner'

/**
 * AssistedRegistration — `/register/assisted` (§6.1): the same in-site form
 * component in staff mode, behind staff auth in App.jsx. No second intake
 * path, no second table — only the source is marked as a walk-in.
 */
export default function AssistedRegistration() {
  return (
    <>
      <PageHero
        eyebrow="Staff · walk-in registration"
        title="Assisted registration"
        lead="Complete this form with a participant who is registering at the desk. Their pass is issued after arrival verification, not by email."
        crumbs={[
          { to: '/', label: 'Home' },
          { to: '/register', label: 'Register' },
          { label: 'Assisted' },
        ]}
        className="mb-6"
      />

      <div className="container-prose pb-16">
        <Banner tone="info" title="For event staff" className="mb-6">
          Use the participant's own email if they can access it on event day. The photo and
          details you submit here are checked at the arrival desk.
        </Banner>

        <RegistrationForm assisted />

        <div className="mt-6">
          <PlaceholderBadge>Walk-in flow — confirm copy with the event team</PlaceholderBadge>
        </div>
      </div>
    </>
  )
}
