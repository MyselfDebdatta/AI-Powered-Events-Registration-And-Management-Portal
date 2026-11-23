/**
 * Generate public/og.png (1200×630) from design/og-source.html (§10: the OG
 * image is a static PNG, not generated per request).
 *
 *   node scripts/generate-og.mjs
 *
 * Requires Google Chrome (puppeteer-core launches the system browser).
 */
import { launch } from 'puppeteer-core'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

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

const browser = await launch({ executablePath, headless: 'new' })
const page = await browser.newPage()
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 })

const source = 'file://' + path.join(root, 'design', 'og-source.html').replace(/\\/g, '/')
await page.goto(source, { waitUntil: 'networkidle0' })
await page.evaluate(() => document.fonts.ready)

const out = path.join(root, 'public', 'og.png')
await page.screenshot({ path: out, type: 'png', clip: { x: 0, y: 0, width: 1200, height: 630 } })
await browser.close()

console.log(`Wrote ${out} (1200x630)`)
