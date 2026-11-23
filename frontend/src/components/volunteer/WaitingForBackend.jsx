import { Banner } from '../ui/Banner'

/**
 * WaitingForBackend — the honest placeholder for a screen whose contract is
 * fixed in WorkFlow.md §9.1 but whose endpoint has not shipped (§14.1 #11).
 * Development builds name the missing routes; production builds tell staff
 * what to do instead, without exposing internal endpoint names.
 */
export function WaitingForBackend({ endpoints = [], title = 'Waiting for backend', children }) {
  return (
    <Banner tone="warning" title={title}>
      {import.meta.env.DEV ? (
        <>
          This screen is built against the agreed contract. The API is not live yet
          {endpoints.length > 0 && (
            <>
              {': '}
              <span className="font-mono text-[11px]">{endpoints.join(' · ')}</span>
            </>
          )}
          . Nothing has been recorded or issued.
        </>
      ) : (
        <>This action is not enabled in this build. Contact the operations lead before using a fallback.</>
      )}
      {children}
    </Banner>
  )
}

export default WaitingForBackend
