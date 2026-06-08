import pg from 'pg'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const connStr = process.argv[2]

if (!connStr) {
  console.error('Uso: node scripts/add-operacoes.mjs "postgresql://postgres:SENHA@db.xxx.supabase.co:5432/postgres"')
  process.exit(1)
}

const sql = readFileSync(join(__dirname, '../supabase/operacoes.sql'), 'utf8')
const client = new pg.Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } })

await client.connect()
console.log('Conectado ao Supabase')

// Run each statement separately to handle IF NOT EXISTS properly
const statements = sql.split(';').map(s => s.trim()).filter(Boolean)
for (const stmt of statements) {
  try {
    await client.query(stmt)
    console.log('✓', stmt.slice(0, 60).replace(/\n/g, ' ') + '...')
  } catch (e) {
    console.warn('⚠ (ignorado):', e.message.slice(0, 80))
  }
}

// Verify tables
const { rows } = await client.query(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name IN ('glpi_tickets','jira_tickets','sync_log')
  ORDER BY table_name
`)
console.log('\nTabelas criadas:', rows.map(r => r.table_name).join(', '))

await client.end()
console.log('Concluído.')
