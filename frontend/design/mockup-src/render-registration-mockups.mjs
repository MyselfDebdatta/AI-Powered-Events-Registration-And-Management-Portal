/* Deterministic render of the three registration mockups via headless Chrome.
   Run: node frontend/design/mockup-src/render-registration-mockups.mjs
   Viewports are chosen so the 2x PNGs land in the requested width ranges:
   desktop 780px CSS -> 1560px PNG, mobile 400px CSS -> 800px PNG. */

import puppeteer from 'puppeteer-core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, '..', 'mockups');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const jobs = [
  { src: '09-registration-form-desktop.html', out: '09-registration-form-desktop.png', width: 780, height: 1550 },
  { src: '10-registration-form-mobile.html', out: '10-registration-form-mobile.png', width: 400, height: 1000 },
  { src: '11-registration-success.html', out: '11-registration-success.png', width: 780, height: 900 },
];

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ['--allow-file-access-from-files', '--font-render-hinting=none', '--hide-scrollbars'],
});

try {
  for (const job of jobs) {
    const page = await browser.newPage();
    await page.setViewport({ width: job.width, height: job.height, deviceScaleFactor: 2 });
    const url = 'file:///' + path.join(here, job.src).replace(/\\/g, '/');
    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(outDir, job.out), captureBeyondViewport: false });
    console.log(`${job.out} <- ${job.src} (viewport ${job.width}x${job.height} @2x)`);
    await page.close();
  }
} finally {
  await browser.close();
}
