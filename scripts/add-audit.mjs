import pg from 'pg'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sql = readFileSync(join(__dirname, '../supabase/audit.sql'), 'utf8')
const conn = process.argv[2] ?? 'postgresql://postgres:04iCzF6rNvoNf0@db.vhqvrycgkktinqpysett.supabase.co:5432/postgres'
const client = new pg.Client({ connectionString: conn, ssl: { rejectUnauthorized: false } })
await client.connect()
for (const s of sql.split(';').map(s => s.trim()).filter(Boolean)) {
  try { await client.query(s); console.log('✓', s.slice(0, 60)) }
  catch (e) { console.warn('⚠', e.message.slice(0, 70)) }
}
const { rows } = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='audit_log'")
console.log('\naudit_log:', rows.length ? '✅ criada' : '❌ falhou')
await client.end()
