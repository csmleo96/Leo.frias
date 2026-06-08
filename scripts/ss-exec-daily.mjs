import { chromium } from 'playwright'
import { mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '../screenshots')
mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch()
const pg = await browser.newPage({ viewport: { width: 1440, height: 1800 } })
await pg.goto('http://localhost:3000/reports/executive-daily', { waitUntil: 'networkidle' })
await pg.waitForTimeout(4000)
await pg.screenshot({ path: join(outDir, 'executive-daily-report.png') })
console.log('done')
await browser.close()
