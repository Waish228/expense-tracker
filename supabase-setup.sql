-- ============================================
-- EXPENSE TRACKER — SUPABASE DATABASE SETUP
-- ============================================
-- Run this ENTIRE script in Supabase → SQL Editor → New Query → Run
-- ============================================

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text default '',
  currency text default 'INR',
  monthly_budget numeric default 0,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. CATEGORIES TABLE
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  icon text default '📁',
  color text default '#3B82F6',
  created_at timestamptz default now()
);

alter table public.categories enable row level security;

create policy "Users can view own categories"
  on public.categories for select
  using (auth.uid() = user_id);

create policy "Users can insert own categories"
  on public.categories for insert
  with check (auth.uid() = user_id);

create policy "Users can update own categories"
  on public.categories for update
  using (auth.uid() = user_id);

create policy "Users can delete own categories"
  on public.categories for delete
  using (auth.uid() = user_id);

-- 3. TRANSACTIONS TABLE
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('credit', 'debit')),
  amount numeric not null check (amount > 0),
  category text default 'other',
  description text default '',
  source text default 'manual' check (source in ('sms', 'manual')),
  sms_raw text,
  transaction_date timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.transactions enable row level security;

create policy "Users can view own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "Users can insert own transactions"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own transactions"
  on public.transactions for update
  using (auth.uid() = user_id);

create policy "Users can delete own transactions"
  on public.transactions for delete
  using (auth.uid() = user_id);

-- 4. DEFAULT CATEGORIES FUNCTION
-- Call this after a user signs up to seed default categories
create or replace function public.seed_default_categories(p_user_id uuid)
returns void as $$
begin
  insert into public.categories (user_id, name, icon, color) values
    (p_user_id, 'Food & Dining',    '🍔', '#EF4444'),
    (p_user_id, 'Transport',        '🚗', '#F59E0B'),
    (p_user_id, 'Shopping',         '🛍️', '#EC4899'),
    (p_user_id, 'Bills & Utilities','⚡', '#8B5CF6'),
    (p_user_id, 'Entertainment',    '🎬', '#06B6D4'),
    (p_user_id, 'Health',           '💊', '#10B981'),
    (p_user_id, 'Education',        '📚', '#3B82F6'),
    (p_user_id, 'Salary',           '💰', '#22C55E'),
    (p_user_id, 'Recharge',         '📱', '#6366F1'),
    (p_user_id, 'Transfer',         '💸', '#A855F7'),
    (p_user_id, 'Other',            '📁', '#64748B');
end;
$$ language plpgsql security definer;

-- 5. INDEXES for performance
create index if not exists idx_transactions_user_date 
  on public.transactions (user_id, transaction_date desc);

create index if not exists idx_transactions_user_type 
  on public.transactions (user_id, type);

create index if not exists idx_categories_user 
  on public.categories (user_id);

-- ============================================
-- DONE! Your database is ready.
-- ============================================
