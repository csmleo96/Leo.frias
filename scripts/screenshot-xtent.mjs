import { chromium } from 'playwright'
import { mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '../screenshots')
mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

await page.goto('https://www.xtentgroup.com/', { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(2000)
await page.screenshot({ path: join(outDir, 'xtentgroup-site.png'), fullPage: false })
console.log('✓ xtentgroup-site.png')

// Also get fonts and colors from computed styles
const styles = await page.evaluate(() => {
  const body = document.body
  const computed = window.getComputedStyle(body)
  const h1 = document.querySelector('h1')
  const h1computed = h1 ? window.getComputedStyle(h1) : null
  const btn = document.querySelector('button, a.btn, [class*="btn"], [class*="button"]')
  const btnComputed = btn ? window.getComputedStyle(btn) : null

  return {
    bodyFont: computed.fontFamily,
    bodyColor: computed.color,
    bodyBg: computed.backgroundColor,
    h1Font: h1computed?.fontFamily,
    h1Color: h1computed?.color,
    h1Size: h1computed?.fontSize,
    h1Weight: h1computed?.fontWeight,
    btnBg: btnComputed?.backgroundColor,
    btnColor: btnComputed?.color,
    btnRadius: btnComputed?.borderRadius,
    googleFonts: [...document.querySelectorAll('link[href*="fonts.google"]')].map(l => l.href),
    classes: h1?.className,
    navItems: [...document.querySelectorAll('nav a, header a')].slice(0, 10).map(a => a.textContent?.trim()),
  }
})
console.log(JSON.stringify(styles, null, 2))

await browser.close()
