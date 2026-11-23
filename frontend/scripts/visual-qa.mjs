/**
 * Visual QA — Stage 2 exit criteria: "360px and 1440px pass".
 *
 *   node scripts/visual-qa.mjs [baseUrl]        (default http://localhost:4173)
 *
 * For every public route at 360px and 1440px it checks:
 *   - no horizontal page scroll (scrollWidth <= viewport width)
 *   - no elements overflowing the viewport to the right
 *   - no console errors / uncaught exceptions
 * Screenshots of the landing page at both widths go to ../.qa/ (git-ignored).
 * Exits non-zero if any check fails.
 */
import { launch } from 'puppeteer-core'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const base = process.argv[2] || 'http://localhost:4173'

const chromeCandidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean)
const executablePath = chromeCandidates.find((p) => fs.existsSync(p))
if (!executablePath) {
  console.error('No Chrome/Chromium found. Set CHROME_PATH and re-run.')
  process.exit(1)
}

const routes = [
  '/',
  '/venue',
  '/faq',
  '/register',
  '/registration/status',
  // Phase 2 participant screens — demo tokens render without the API (§7.3/§7.4)
  '/registration/status?token=demo',
  '/registration/status?token=demo-pass',
  '/ticket/demo',
  '/ticket/demo-pass',
  '/privacy',
  '/accessibility',
  '/code-of-conduct',
  // Stage 3 volunteer desk (§7.5/§7.6) — needs a seeded session, no API.
  '/volunteer/dashboard',
  '/volunteer/arrival',
  '/volunteer/scan',
  '/volunteer/manual?mode=entry',
  '/volunteer/queue',
  '/volunteer/help',
  // Stage 4 admin shell (§Phase 4, mockup 07) — ADMIN only, seeded session.
  '/admin/dashboard',
  '/admin/imports',
  '/admin/live-ops',
  '/admin/participants',
  '/admin/sessions',
  '/admin/attendance',
  '/admin/volunteers',
  '/admin/reconciliation',
  '/admin/audit',
  '/admin/settings',
  '/admin/export',
]
// Stage 5 device matrix (§12.4): full route set at the two reference widths,
// a representative set at every required width, plus landscape desk checks.
const widths = [320, 360, 390, 768, 1024, 1366, 1440, 1920, 2560]
const fullWidths = new Set([360, 1440])
const matrixRoutes = [
  '/',
  '/registration/status?token=demo',
  '/ticket/demo-pass',
  '/volunteer/arrival',
  '/volunteer/scan',
  '/admin/dashboard',
  '/admin/participants',
  '/login',
]
const landscape = [
  { width: 667, height: 375, route: '/volunteer/arrival' },
  { width: 667, height: 375, route: '/volunteer/scan' },
  { width: 844, height: 390, route: '/volunteer/arrival' },
  { width: 844, height: 390, route: '/volunteer/scan' },
]

const isVolunteerRoute = (route) => route.startsWith('/volunteer')
const isAdminRoute = (route) => route.startsWith('/admin')

/** Staff pages are behind ProtectedRoute; seed/clear the stored session. */
async function setSession(page, role) {
  await page.evaluate((r) => {
    if (r) {
      localStorage.setItem('token', 'visual-qa')
      localStorage.setItem(
        'user',
        JSON.stringify({ id: 1, name: 'QA Staff', role: r })
      )
    } else {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
  }, role)
}

/** Routes that also get a full-page screenshot for the review record. */
const shotRoutes = new Set([
  '/',
  '/register',
  '/registration/status?token=demo',
  '/registration/status?token=demo-pass',
  '/ticket/demo-pass',
  '/admin/dashboard',
  '/admin/participants',
  '/admin/attendance',
  '/admin/volunteers',
  '/volunteer/dashboard',
  '/volunteer/arrival',
  '/volunteer/scan',
  '/volunteer/manual?mode=entry',
  '/volunteer/queue',
  '/volunteer/help',
])

const shotDir = path.join(root, '..', '.qa')
fs.mkdirSync(shotDir, { recursive: true })

const browser = await launch({ executablePath, headless: 'new' })
let failures = 0

for (const width of widths) {
  const page = await browser.newPage()
  await page.setViewport({ width, height: width === 360 ? 800 : 900, deviceScaleFactor: 1 })

  const consoleErrors = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err) => consoleErrors.push(String(err)))

  // The desk is designed to work without a hub; answer API calls with empty
  // shapes so the layout check measures the screens, not the network.
  await page.setRequestInterception(true)
  page.on('request', (request) => {
    const { pathname } = new URL(request.url())
    if (!pathname.startsWith('/api/')) {
      request.continue()
      return
    }
    const body =
      pathname === '/api/attendance/event' ||
      pathname === '/api/sessions/' ||
      pathname === '/api/admin/volunteers'
        ? '[]'
        : pathname === '/api/admin/dashboard'
          ? '{"total_participants":0,"total_sessions":0,"total_attendance_records":0,"event_checkins":0,"participants_by_category":{},"recent_registrations":[]}'
          : '{"items":[],"total":0}'
    request.respond({ status: 200, contentType: 'application/json', body })
  })

  await page.goto(base + '/', { waitUntil: 'domcontentloaded', timeout: 30000 })

  const routesForWidth = fullWidths.has(width) ? routes : matrixRoutes
  for (const route of routesForWidth) {
    consoleErrors.length = 0
    await setSession(page, isAdminRoute(route) ? 'ADMIN' : isVolunteerRoute(route) ? 'VOLUNTEER' : null)
    await page.goto(base + route, { waitUntil: 'networkidle0', timeout: 30000 })
    // let lazy routes + fonts settle
    await page.evaluate(() => document.fonts?.ready)

    const result = await page.evaluate(() => {
      const doc = document.scrollingElement
      const vw = window.innerWidth
      const isClipped = (el) => {
        // Skip elements visually clipped by an overflow-hidden ancestor —
        // their layout rect extends past the viewport but is never painted.
        let node = el.parentElement
        while (node && node !== document.body) {
          const style = getComputedStyle(node)
          if (
            ['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowX) ||
            ['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowY)
          ) {
            return true
          }
          node = node.parentElement
        }
        return false
      }
      const offenders = []
      for (const el of document.querySelectorAll('body *')) {
        const rect = el.getBoundingClientRect()
        if (rect.width === 0 || rect.height === 0) continue
        // right-edge overflow (allow 1px rounding)
        if (rect.right > vw + 1) {
          const style = getComputedStyle(el)
          if (style.position === 'fixed') continue
          if (isClipped(el)) continue
          offenders.push(
            `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').slice(0, 3).join('.') : ''} right=${Math.round(rect.right)}`
          )
        }
        if (offenders.length >= 6) break
      }
      return { scrollWidth: doc.scrollWidth, vw, offenders }
    })

    const overflow = result.scrollWidth > result.vw + 1
    const errs = consoleErrors.filter((e) => !e.includes('favicon'))
    const ok = !overflow && result.offenders.length === 0 && errs.length === 0

    if (!ok) {
      failures++
      console.log(`FAIL ${width}px ${route}`)
      if (overflow) console.log(`  page scrollWidth=${result.scrollWidth} > viewport ${result.vw}`)
      for (const o of result.offenders) console.log(`  overflow: ${o}`)
      for (const e of errs) console.log(`  console: ${e}`)
    } else {
      console.log(`ok   ${width}px ${route}`)
    }

    if (shotRoutes.has(route)) {
      const name =
        route === '/'
          ? 'home'
          : route.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '')
      await page.screenshot({
        path: path.join(shotDir, `${name}-${width}.png`),
        fullPage: true,
      })
    }
  }

  await page.close()
}

// Landscape checks for the camera-first screens (§12.4).
for (const check of landscape) {
  const page = await browser.newPage()
  await page.setViewport({ width: check.width, height: check.height, deviceScaleFactor: 1 })
  const consoleErrors = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', (err) => consoleErrors.push(String(err)))

  await page.setRequestInterception(true)
  page.on('request', (request) => {
    const { pathname } = new URL(request.url())
    if (!pathname.startsWith('/api/')) {
      request.continue()
      return
    }
    request.respond({ status: 200, contentType: 'application/json', body: '[]' })
  })

  await page.goto(base + '/', { waitUntil: 'domcontentloaded', timeout: 30000 })
  await setSession(page, 'VOLUNTEER')
  await page.goto(base + check.route, { waitUntil: 'networkidle0', timeout: 30000 })

  const result = await page.evaluate(() => ({
    scrollWidth: document.scrollingElement.scrollWidth,
    vw: window.innerWidth,
    scrollHeight: document.scrollingElement.scrollHeight,
    vh: window.innerHeight,
  }))
  const overflow = result.scrollWidth > result.vw + 1
  const errs = consoleErrors.filter((e) => !e.includes('favicon'))
  const ok = !overflow && errs.length === 0
  if (!ok) {
    failures++
    console.log(`FAIL ${check.width}x${check.height} ${check.route}`)
    if (overflow) console.log(`  horizontal scroll: ${result.scrollWidth} > ${result.vw}`)
    for (const e of errs) console.log(`  console: ${e}`)
  } else {
    console.log(`ok   ${check.width}x${check.height} ${check.route}`)
  }
  await page.close()
}

await browser.close()

if (failures > 0) {
  console.log(`\n${failures} failing check(s).`)
  process.exit(1)
}
console.log('\nAll responsive checks passed.')
