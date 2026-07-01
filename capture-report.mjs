import { chromium } from 'playwright'
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
page.setDefaultTimeout(20000)
await page.goto('http://localhost:3000/reports/executive-daily', { waitUntil: 'networkidle' })
await page.waitForTimeout(5000)
await page.screenshot({ path: 'screenshots/executive-daily-fixed.png', fullPage: true })
await browser.close()
console.log('Screenshot salvo')
