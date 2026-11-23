/**
 * Feature flags for the phased rollout (FrontendPlanning.md §11.2).
 *
 * Safe-state rule: in production a flag is OFF unless explicitly enabled
 * with VITE_FLAG_<NAME>=true, so a deploy never exposes an unrehearsed flow.
 * In development flags default ON so new screens are visible while building.
 */

const env = import.meta.env

function flag(name, devDefault = true) {
  const raw = env[`VITE_FLAG_${name}`]
  if (raw === 'true') return true
  if (raw === 'false') return false
  return env.PROD ? false : devDefault
}

export const flags = {
  /** `/registration/status` and `/ticket/:token` participant screens. */
  ticketPage: flag('TICKET_PAGE', true),
  /**
   * Volunteer arrival desk writes. ON only when the hub actually serves
   * `POST /api/arrivals` and `POST /api/qr/issue` (WorkFlow.md §9.1). The
   * screen stays available either way and shows "Waiting for backend" in
   * development instead of calling a missing endpoint.
   */
  arrivalV2: flag('ARRIVAL_V2', false),
  /**
   * Signed-pass verification. ON only when `POST /api/qr/verify` is live.
   * The scanner never falls back to the legacy unsigned validate-qr call.
   */
  scanV2: flag('SCAN_V2', false),
  /** Admin live-ops screen (requires backend endpoint). */
  liveOps: flag('LIVE_OPS', false),
  /** Admin reconciliation screen (requires backend endpoint). */
  reconciliation: flag('RECONCILIATION', false),
  /** Admin imports screen (requires backend endpoint). */
  importsV2: flag('IMPORTS_V2', false),
  /** Admin analytics screen (requires backend endpoint). */
  analyticsV2: flag('ANALYTICS_V2', false),
  /** Admin settings screen (requires backend endpoint). */
  settingsV2: flag('SETTINGS_V2', false),
  /** Admin audit log screen (requires backend endpoint). */
  auditV2: flag('AUDIT_V2', false),
  /**
   * Void an attendance record. ON only when the hub serves
   * POST /api/attendance/{id}/void with a reason. The dialog is always shown
   * so the consequence is explicit; without the endpoint it says
   * "Waiting for backend" and performs no write.
   */
  voidAttendance: flag('VOID_ATTENDANCE', false),
}

export default flags
