import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import AdminLayout from './components/AdminLayout'
import VolunteerLayout from './components/volunteer/VolunteerLayout'
import PublicLayout from './components/public/PublicLayout'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import RouteFallback from './components/RouteFallback'

// Route-level code splitting (§10.2): public, staff, volunteer and admin
// chunks load separately; html5-qrcode stays out of every other bundle.
const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const VenuePage = lazy(() => import('./pages/Venue'))
const FaqPage = lazy(() => import('./pages/Faq'))
const Privacy = lazy(() => import('./pages/Privacy'))
const AccessibilityPage = lazy(() => import('./pages/Accessibility'))
const CodeOfConduct = lazy(() => import('./pages/CodeOfConduct'))
const RegistrationStatus = lazy(() => import('./pages/RegistrationStatus'))
const Ticket = lazy(() => import('./pages/Ticket'))
const AssistedRegistration = lazy(() => import('./pages/AssistedRegistration'))
const Dashboard = lazy(() => import('./pages/admin/Dashboard'))
const Participants = lazy(() => import('./pages/admin/Participants'))
const ParticipantDetail = lazy(() => import('./pages/admin/ParticipantDetail'))
const Sessions = lazy(() => import('./pages/admin/Sessions'))
const Attendance = lazy(() => import('./pages/admin/Attendance'))
const Export = lazy(() => import('./pages/admin/Export'))
const Volunteers = lazy(() => import('./pages/admin/Volunteers'))
const Imports = lazy(() => import('./pages/admin/Imports'))
const ImportDetail = lazy(() => import('./pages/admin/ImportDetail'))
const LiveOps = lazy(() => import('./pages/admin/LiveOps'))
const Reconciliation = lazy(() => import('./pages/admin/Reconciliation'))
const Audit = lazy(() => import('./pages/admin/Audit'))
const Settings = lazy(() => import('./pages/admin/Settings'))
const VolunteerDashboard = lazy(() => import('./pages/volunteer/VolunteerDashboard'))
const Arrival = lazy(() => import('./pages/volunteer/Arrival'))
const QRScanner = lazy(() => import('./pages/volunteer/QRScanner'))
const ManualLookup = lazy(() => import('./pages/volunteer/ManualLookup'))
const Queue = lazy(() => import('./pages/volunteer/Queue'))
const Help = lazy(() => import('./pages/volunteer/Help'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Forbidden = lazy(() => import('./pages/Forbidden'))
const ServerError = lazy(() => import('./pages/ServerError'))
const Offline = lazy(() => import('./pages/Offline'))
const DesignSystem = lazy(() => import('./pages/DesignSystem'))

export default function App() {
  const location = useLocation()

  return (
    <ErrorBoundary resetKeys={[location.pathname]}>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Public shell (§6.1): top strip, masthead, ink footer */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/venue" element={<VenuePage />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/register" element={<Register />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/accessibility" element={<AccessibilityPage />} />
            <Route path="/code-of-conduct" element={<CodeOfConduct />} />
            <Route path="/registration/status" element={<RegistrationStatus />} />
            {/* Staff-assisted walk-in form (§6.1) — authenticated staff only */}
            <Route
              path="/register/assisted"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'VOLUNTEER']}>
                  <AssistedRegistration />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Participant pass (§7.4) — its own app-bar shell, no public masthead;
              the signed token in the path is the credential (noindex). */}
          <Route path="/ticket/:token" element={<Ticket />} />

          {/* Dev-only token/primitive reference (Phase 0 exit criterion). */}
          {import.meta.env.DEV && <Route path="/design" element={<DesignSystem />} />}

          {/* Staff sign-in — dedicated design-system shell */}
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<Login />} />
          <Route path="/volunteer/login" element={<Login />} />

          {/* Admin routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="participants" element={<Participants />} />
            <Route path="participants/:id" element={<ParticipantDetail />} />
            <Route path="sessions" element={<Sessions />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="volunteers" element={<Volunteers />} />
            <Route path="export" element={<Export />} />
            <Route path="imports" element={<Imports />} />
            <Route path="imports/:id" element={<ImportDetail />} />
            <Route path="live-ops" element={<LiveOps />} />
            <Route path="reconciliation" element={<Reconciliation />} />
            <Route path="audit" element={<Audit />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Volunteer routes — event-day shell (§7.5): ink app bar, desk
              selector, offline pill, five sections. */}
          <Route
            path="/volunteer"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'VOLUNTEER']}>
                <VolunteerLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<VolunteerDashboard />} />
            <Route path="arrival" element={<Arrival />} />
            <Route path="face-checkin" element={<Navigate to="/volunteer/arrival" replace />} />
            <Route path="scan" element={<QRScanner />} />
            <Route path="manual" element={<ManualLookup />} />
            <Route path="queue" element={<Queue />} />
            <Route path="help" element={<Help />} />
          </Route>

          {/* Global states (§7.9) */}
          <Route path="/403" element={<Forbidden />} />
          <Route path="/500" element={<ServerError />} />
          <Route path="/offline" element={<Offline />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}
