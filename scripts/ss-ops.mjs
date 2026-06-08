import { chromium } from 'playwright'
import { mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '../screenshots')
mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:3000/operacoes', { waitUntil: 'networkidle' })
await page.waitForTimeout(6000)
await page.screenshot({ path: join(outDir, 'torre-ops.png'), fullPage: false })
console.log('done')
await browser.close()
