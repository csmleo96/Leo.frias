import { chromium } from 'playwright'
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
page.setDefaultTimeout(20000)
await page.goto('http://localhost:3000/zabbix', { waitUntil: 'networkidle' })
await page.waitForTimeout(5000)
await page.screenshot({ path: 'screenshots/zabbix-live.png', fullPage: true })
await browser.close()
