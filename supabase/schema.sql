-- Tarefas
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'pendente' check (status in ('pendente', 'em_andamento', 'concluida')),
  priority text not null default 'media' check (priority in ('baixa', 'media', 'alta')),
  created_at timestamptz not null default now()
);
alter table public.tasks enable row level security;
create policy if not exists "allow all tasks" on public.tasks for all using (true) with check (true);

-- Transações financeiras
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric(12, 2) not null check (amount > 0),
  type text not null check (type in ('receita', 'despesa')),
  category text not null default 'Geral',
  date date not null default current_date,
  created_at timestamptz not null default now()
);
alter table public.transactions enable row level security;
create policy if not exists "allow all transactions" on public.transactions for all using (true) with check (true);

-- Clientes Xtent
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  company text,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  created_at timestamptz not null default now()
);
alter table public.clients enable row level security;
create policy if not exists "allow all clients" on public.clients for all using (true) with check (true);

-- Prospects (pipeline)
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
create policy if not exists "allow all prospects" on public.prospects for all using (true) with check (true);
