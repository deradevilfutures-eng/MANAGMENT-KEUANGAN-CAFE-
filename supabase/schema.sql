-- Cafe Finance Manager: initial Supabase schema
-- Run this file in Supabase SQL Editor. Every row is scoped to its authenticated owner.
create extension if not exists pgcrypto;

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  txn_date date not null default current_date,
  txn_type text not null check (txn_type in ('income','expense')),
  category text not null,
  description text not null,
  amount numeric(14,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  category text not null default 'Bahan baku',
  quantity numeric(12,2) not null default 0 check (quantity >= 0),
  unit text not null default 'pcs',
  min_quantity numeric(12,2) not null default 0 check (min_quantity >= 0),
  unit_cost numeric(14,2) not null default 0 check (unit_cost >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'Staff',
  phone text,
  monthly_salary numeric(14,2) not null default 0 check (monthly_salary >= 0),
  employment_status text not null default 'Aktif' check (employment_status in ('Aktif','Nonaktif')),
  created_at timestamptz not null default now()
);

alter table public.transactions enable row level security;
alter table public.inventory_items enable row level security;
alter table public.employees enable row level security;

revoke all on public.transactions, public.inventory_items, public.employees from anon;
grant select, insert, update, delete on public.transactions, public.inventory_items, public.employees to authenticated;

drop policy if exists "owner manages transactions" on public.transactions;
create policy "owner manages transactions" on public.transactions
for all to authenticated using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

drop policy if exists "owner manages inventory" on public.inventory_items;
create policy "owner manages inventory" on public.inventory_items
for all to authenticated using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

drop policy if exists "owner manages employees" on public.employees;
create policy "owner manages employees" on public.employees
for all to authenticated using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create index if not exists transactions_owner_date_idx on public.transactions(owner_id, txn_date desc);
create index if not exists inventory_owner_name_idx on public.inventory_items(owner_id, name);
create index if not exists employees_owner_name_idx on public.employees(owner_id, full_name);
