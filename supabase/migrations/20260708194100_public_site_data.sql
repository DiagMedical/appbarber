-- AppBarber migration
-- Adds public site columns to shops

begin;

alter table shops
  add column if not exists instagram text,
  add column if not exists working_hours jsonb default '{}',
  add column if not exists gallery_photos jsonb default '[]',
  add column if not exists hero_photo text;

commit;
