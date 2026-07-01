import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
page.setDefaultTimeout(15000)

const errors = []
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
page.on('pageerror', err => errors.push(err.message))

await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' })
await page.waitForTimeout(4000)

await page.screenshot({ path: 'screenshots/home-debug.png', fullPage: true })

console.log('Console errors:', JSON.stringify(errors, null, 2))
console.log('URL:', page.url())
console.log('Title:', await page.title())

await browser.close()