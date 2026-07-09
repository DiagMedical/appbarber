-- AppBarber — Fix RLS Policies + Admin Setup
-- Execute no Supabase Dashboard > SQL Editor
-- 1º executa este bloco inteiro
-- 2º depois roda o INSERT do admin separadamente

begin;

-- ─── 1. Colunas faltantes ───────────────────────────────────
alter table shops
  add column if not exists owner_user_id uuid references auth.users(id) on delete set null,
  add column if not exists public_slug text,
  add column if not exists instagram text,
  add column if not exists working_hours jsonb default '{}',
  add column if not exists gallery_photos jsonb default '[]',
  add column if not exists hero_photo text;

drop index if exists idx_shops_public_slug;
create unique index if not exists idx_shops_public_slug on shops (public_slug) where public_slug is not null;

-- ─── 2. Tabela de admins ────────────────────────────────────
create table if not exists admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

alter table admins enable row level security;

drop policy if exists "Admins can read admins" on admins;
create policy "Admins can read admins"
  on admins for select
  using (auth.role() = 'authenticated');

-- ─── 3. Função is_admin (precisa existir ANTES das policies) ─
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
as $$
  select exists (select 1 from admins where user_id = auth.uid())
$$;

-- ─── 4. Políticas RLS ────────────────────────────────────────
drop policy if exists "Users can read own shop" on shops;
create policy "Users can read own shop"
  on shops for select
  using (
    can_view_shop(id)
    or (auth.role() = 'authenticated' and owner_user_id is null)
    or public.is_admin()
  );

drop policy if exists "Users can insert own shop" on shops;
create policy "Users can insert own shop"
  on shops for insert
  with check (auth.role() = 'authenticated' and owner_user_id = auth.uid());

drop policy if exists "Users can update own shop" on shops;
create policy "Users can update own shop"
  on shops for update
  using (
    is_shop_owner(id)
    or (auth.role() = 'authenticated' and owner_user_id is null)
  )
  with check (
    is_shop_owner(id)
    or (auth.role() = 'authenticated' and owner_user_id = auth.uid())
  );

drop policy if exists "Users can delete own shop" on shops;
create policy "Users can delete own shop"
  on shops for delete
  using (public.is_shop_owner(id) or public.is_admin());

-- ─── 5. public_slug para lojas existentes ────────────────────
update shops
set public_slug = 'barbearia-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)
where public_slug is null;

commit;
