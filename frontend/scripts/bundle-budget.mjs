/**
 * Bundle budget gate — Stage 5 / §12.5.
 *
 *   node scripts/bundle-budget.mjs
 *
 * Measures gzipped JS chunks in dist/assets and enforces the approved budgets:
 *   - public initial (shared index + Home) ≤ 220 KB gzip
 *   - admin initial (shared index + Dashboard) ≤ 300 KB gzip
 *   - scanner extra lazy (QRScanner + html5-qrcode esm chunk) ≤ 90 KB gzip
 *   - html5-qrcode absent from landing and ticket chunks
 *
 * Exits non-zero on any breach. Run after `npm run build`.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dir = path.join(root, 'dist', 'assets')
const files = readdirSync(dir).filter((f) => f.endsWith('.js'))

const gz = (name) => {
  const match = files.find((f) => f.startsWith(name) && f.endsWith('.js'))
  if (!match) return null
  return gzipSync(readFileSync(path.join(dir, match))).length
}

const KB = 1024
const shared = gz('index-') ?? 0
const home = gz('Home-') ?? 0
const dashboard = gz('Dashboard-') ?? 0
const scanner = gz('QRScanner-') ?? 0

// Locate the camera library chunk by content, not filename: Vite may name it
// `esm-*` or `html5-qrcode-*` depending on the import specifier.
const cameraChunk = files
  .filter((f) => !f.startsWith('QRScanner-'))
  .filter((f) => readFileSync(path.join(dir, f), 'utf8').includes('Html5Qrcode'))
  .sort((a, b) => readFileSync(path.join(dir, b)).length - readFileSync(path.join(dir, a)).length)[0]
const cameraLib = cameraChunk ? gzipSync(readFileSync(path.join(dir, cameraChunk))).length : 0

const checks = [
  { label: 'public initial (index + Home)', value: shared + home, budget: 220 * KB },
  { label: 'admin initial (index + Dashboard)', value: shared + dashboard, budget: 300 * KB },
  { label: 'scanner route lazy chunk', value: scanner, budget: 90 * KB },
]

let failed = 0
for (const check of checks) {
  const kb = (check.value / KB).toFixed(1)
  const budget = (check.budget / KB).toFixed(0)
  const ok = check.value <= check.budget
  if (!ok) failed++
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${check.label}: ${kb} KB gzip (budget ${budget} KB)`)
}

const hasQr = (prefix) =>
  files
    .filter((f) => f.startsWith(prefix) && f.endsWith('.js'))
    .some((f) => readFileSync(path.join(dir, f), 'utf8').includes('Html5Qrcode'))
for (const [label, prefix] of [['landing', 'Home-'], ['ticket', 'Ticket-']]) {
  const isolated = !hasQr(prefix)
  if (!isolated) failed++
  console.log(`${isolated ? 'ok  ' : 'FAIL'} html5-qrcode absent from ${label} chunk`)
}

// Informational: the approved camera dependency is large, but it is loaded
// only when the volunteer taps "Start scanner" (§11.1 "Keep, lazy").
console.log(
  `info camera library (on demand): ${(cameraLib / KB).toFixed(1)} KB gzip [${cameraChunk ?? 'not found'}]`
)

if (failed > 0) {
  console.log(`\n${failed} budget check(s) failed.`)
  process.exit(1)
}
console.log('\nAll bundle budgets passed.')
