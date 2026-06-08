import pg from 'pg'
const { Client } = pg

const client = new Client({
  connectionString: process.argv[2],
  ssl: { rejectUnauthorized: false }
})

const sql = `
create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  company text,
  stage text not null default 'lead' check (stage in ('lead', 'contato', 'proposta', 'negociacao', 'fechado', 'perdido')),
  value numeric(12, 2),
  notes text,
  created_at timestamptz not null default now()
);
alter table public.prospects enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='prospects' and policyname='allow all prospects') then
    create policy "allow all prospects" on public.prospects for all using (true) with check (true);
  end if;
end $$;
`

try {
  await client.connect()
  console.log('✓ Conectado')
  await client.query(sql)
  console.log('✓ Tabela prospects criada')
  const r = await client.query(`select table_name from information_schema.tables where table_schema='public' and table_name='prospects'`)
  console.log('✓ Verificado:', r.rows[0]?.table_name)
} catch (e) {
  console.error('✗', e.message)
} finally {
  await client.end()
}
