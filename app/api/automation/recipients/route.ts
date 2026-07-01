import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const DATA_PATH = path.join(process.cwd(), '.data', 'recipients.json')
const DEFAULT = { recipients: ['leo.frias@xtentgroup.com'], updatedAt: null as string | null }

async function readConfig() {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return DEFAULT
  }
}

export async function GET() {
  const config = await readConfig()
  return NextResponse.json(config)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const recipients: string[] = (body.recipients ?? []).filter((e: string) => typeof e === 'string' && e.includes('@'))
    if (recipients.length === 0) return NextResponse.json({ error: 'Mínimo 1 destinatário válido' }, { status: 400 })
    const config = { recipients, updatedAt: new Date().toISOString() }
    await fs.mkdir(path.join(process.cwd(), '.data'), { recursive: true })
    await fs.writeFile(DATA_PATH, JSON.stringify(config, null, 2), 'utf-8')
    return NextResponse.json(config)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
