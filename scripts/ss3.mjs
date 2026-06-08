import { chromium } from 'playwright'
import { mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '../screenshots')
mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
for (const [path, name] of [['/', 'dash2'], ['/relatorios', 'rel2'], ['/outlook', 'out2'], ['/whatsapp', 'wa2']]) {
  await page.goto('http://localhost:3000' + path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)
  await page.screenshot({ path: join(outDir, name + '.png') })
  console.log('done: ' + name)
}
await browser.close()
