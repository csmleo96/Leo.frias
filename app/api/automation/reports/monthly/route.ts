import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const DATA_PATH = path.join(process.cwd(), '.data', 'recipients.json')

async function getRecipients(): Promise<string[]> {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf-8')
    return JSON.parse(raw).recipients ?? ['leo.frias@xtentgroup.com']
  } catch {
    return [process.env.NOTIFICATION_EMAIL_TO ?? process.env.SMTP_USER ?? 'leo.frias@xtentgroup.com']
  }
}

export async function POST(_request: NextRequest) {
  const recipients = await getRecipients()
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const res = await fetch(`${base}/api/automation/reports/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'monthly', recipients }),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function GET() {
  return NextResponse.json({ webhook: '/api/automation/reports/monthly', method: 'POST', description: 'n8n trigger para relatório mensal' })
}
