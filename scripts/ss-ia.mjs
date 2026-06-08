import { chromium } from 'playwright'
import { mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '../screenshots')
mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch()
const pg = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await pg.goto('http://localhost:3000/ia', { waitUntil: 'networkidle' })
await pg.waitForTimeout(5000)
await pg.screenshot({ path: join(outDir, 'ia-analysis.png') })
await pg.click('button[data-tab="predictions"]').catch(() => {})
// Click second tab
const tabs = await pg.$$('button')
for (const tab of tabs) {
  const text = await tab.textContent()
  if (text && text.includes('Previsões')) { await tab.click(); break; }
}
await pg.waitForTimeout(2000)
await pg.screenshot({ path: join(outDir, 'ia-predictions.png') })
console.log('done')
await browser.close()
