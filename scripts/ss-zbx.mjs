import { chromium } from 'playwright'
import { mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '../screenshots')
mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch()
const pg = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await pg.goto('http://localhost:3000', { waitUntil: 'networkidle' })
await pg.waitForTimeout(5000)
await pg.screenshot({ path: join(outDir, 'dash-zbx.png') })
await pg.goto('http://localhost:3000/zabbix', { waitUntil: 'networkidle' })
await pg.waitForTimeout(3000)
await pg.screenshot({ path: join(outDir, 'zabbix-page.png') })
console.log('done')
await browser.close()
