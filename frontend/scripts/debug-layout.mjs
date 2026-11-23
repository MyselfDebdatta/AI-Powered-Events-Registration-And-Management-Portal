import { launch } from 'puppeteer-core'
import fs from 'node:fs'

const exe = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
].find((p) => p && fs.existsSync(p))

const routes = ['/faq', '/register', '/speakers', '/accessibility', '/']
const browser = await launch({ executablePath: exe, headless: 'new' })
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })

for (const route of routes) {
  await page.goto('http://localhost:4173' + route, { waitUntil: 'networkidle0' })
  const info = await page.evaluate(() => {
    const rect = (sel) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      return {
        left: Math.round(r.left),
        width: Math.round(r.width),
        cls: (el.className || '').toString().slice(0, 70),
        maxW: cs.maxWidth, marginL: cs.marginLeft, padL: cs.paddingLeft, w: cs.width,
      }
    }
    return {
      vw: window.innerWidth,
      scrollW: document.documentElement.scrollWidth,
      breadcrumb: rect('nav[aria-label="Breadcrumb"]'),
      h1: rect('h1'),
      heroWrap: rect('header > div'),
      mainWrap: rect('main > * > div, main section > div'),
    }
  })
  console.log('== ' + route + ' == vw=' + info.vw + ' scrollW=' + info.scrollW)
  for (const k of ['breadcrumb', 'h1', 'heroWrap']) {
    const v = info[k]
    if (v) console.log(`  ${k}: left=${v.left} w=${v.width} maxW=${v.maxW} marginL=${v.marginL} padL=${v.padL} cls=${v.cls}`)
  }
}
await browser.close()
