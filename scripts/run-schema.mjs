import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const { Client } = pg
const __dirname = dirname(fileURLToPath(import.meta.url))

const connectionString = process.argv[2]
if (!connectionString) {
  console.error('Usage: node scripts/run-schema.mjs <connection-string>')
  process.exit(1)
}

const sql = readFileSync(join(__dirname, '../supabase/schema.sql'), 'utf8')

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })

try {
  await client.connect()
  console.log('✓ Conectado ao banco de dados')
  await client.query(sql)
  console.log('✓ Schema executado com sucesso')

  const tables = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('tasks', 'transactions', 'clients')
    ORDER BY table_name
  `)
  console.log('\nTabelas criadas:')
  tables.rows.forEach(r => console.log(`  ✓ ${r.table_name}`))
} catch (err) {
  console.error('✗ Erro:', err.message)
  process.exit(1)
} finally {
  await client.end()
}
