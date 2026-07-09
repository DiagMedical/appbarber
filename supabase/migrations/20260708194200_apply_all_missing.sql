-- Apply all missing columns to shops table
-- Execute this in Supabase Dashboard > SQL Editor

alter table shops
  add column if not exists owner_user_id uuid references auth.users(id) on delete set null,
  add column if not exists public_slug text,
  add column if not exists instagram text,
  add column if not exists working_hours jsonb default '{}',
  add column if not exists gallery_photos jsonb default '[]',
  add column if not exists hero_photo text;

-- Set public_slug for existing shops
update shops set public_slug = 'minha-barbearia-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)
where public_slug is null;

-- Make public_slug unique after populating
alter table shops add constraint shops_public_slug_key unique (public_slug);
