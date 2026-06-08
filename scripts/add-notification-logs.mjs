import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials not found in environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  try {
    console.log('📋 Lendo migration notification_logs.sql...')
    const sql = readFileSync(resolve(__dirname, '../supabase/notification_logs.sql'), 'utf-8')

    console.log('🚀 Executando migration...')
    const { error } = await supabase.rpc('exec', { sql })

    if (error && error.message && !error.message.includes('already exists')) {
      throw error
    }

    console.log('✅ Migration notification_logs aplicada com sucesso!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Erro ao aplicar migration:', error?.message || error)
    process.exit(1)
  }
}

runMigration()
