-- AppBarber migration
-- Adds shop ownership and RLS without recreating existing tables.

begin;

create or replace function public.public_booking_shop_id()
returns uuid
language sql
stable
security definer
as $$
  select id
  from shops
  order by created_at asc
  limit 1
$$;

create or replace function public.is_shop_owner(shop_uuid uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1
    from shops
    where shops.id = shop_uuid
      and shops.owner_user_id = auth.uid()
  )
$$;

create or replace function public.can_view_shop(shop_uuid uuid)
returns boolean
language sql
stable
security definer
as $$
  select public.is_shop_owner(shop_uuid)
    or (auth.role() = 'anon' and shop_uuid = public.public_booking_shop_id())
$$;

alter table shops
  add column if not exists owner_user_id uuid references auth.users(id) on delete set null;

alter table clients
  add column if not exists shop_id uuid references shops(id) on delete cascade;

update clients
set shop_id = public.public_booking_shop_id()
where shop_id is null;

alter table clients
  alter column shop_id set not null;

alter table clients
  drop constraint if exists clients_phone_key;

create unique index if not exists idx_clients_shop_phone
  on clients (shop_id, phone);

alter table shops enable row level security;
alter table barbers enable row level security;
alter table barber_availability enable row level security;
alter table services enable row level security;
alter table barber_services enable row level security;
alter table clients enable row level security;
alter table appointments enable row level security;
alter table whatsapp_configs enable row level security;
alter table google_calendar_tokens enable row level security;

drop policy if exists "Users can read own shop" on shops;
drop policy if exists "Users can insert own shop" on shops;
drop policy if exists "Users can update own shop" on shops;
drop policy if exists "Users can delete own shop" on shops;

create policy "Users can read own shop"
  on shops for select
  using (
    public.can_view_shop(id)
    or (auth.role() = 'authenticated' and owner_user_id is null)
  );

create policy "Users can insert own shop"
  on shops for insert
  with check (auth.role() = 'authenticated' and owner_user_id = auth.uid());

create policy "Users can update own shop"
  on shops for update
  using (
    public.is_shop_owner(id)
    or (auth.role() = 'authenticated' and owner_user_id is null)
  )
  with check (
    public.is_shop_owner(id)
    or (auth.role() = 'authenticated' and owner_user_id = auth.uid())
  );

create policy "Users can delete own shop"
  on shops for delete
  using (public.is_shop_owner(id));

drop policy if exists "Users can read shop barbers" on barbers;
drop policy if exists "Users can insert shop barbers" on barbers;
drop policy if exists "Users can update shop barbers" on barbers;
drop policy if exists "Users can delete shop barbers" on barbers;

create policy "Users can read shop barbers"
  on barbers for select
  using (public.can_view_shop(shop_id));

create policy "Users can insert shop barbers"
  on barbers for insert
  with check (public.is_shop_owner(shop_id));

create policy "Users can update shop barbers"
  on barbers for update
  using (public.is_shop_owner(shop_id))
  with check (public.is_shop_owner(shop_id));

create policy "Users can delete shop barbers"
  on barbers for delete
  using (public.is_shop_owner(shop_id));

drop policy if exists "Users can read barber availability" on barber_availability;
drop policy if exists "Users can insert barber availability" on barber_availability;
drop policy if exists "Users can update barber availability" on barber_availability;
drop policy if exists "Users can delete barber availability" on barber_availability;

create policy "Users can read barber availability"
  on barber_availability for select
  using (
    exists (
      select 1
      from barbers
      where barbers.id = barber_availability.barber_id
        and public.can_view_shop(barbers.shop_id)
    )
  );

create policy "Users can insert barber availability"
  on barber_availability for insert
  with check (
    exists (
      select 1
      from barbers
      where barbers.id = barber_availability.barber_id
        and public.is_shop_owner(barbers.shop_id)
    )
  );

create policy "Users can update barber availability"
  on barber_availability for update
  using (
    exists (
      select 1
      from barbers
      where barbers.id = barber_availability.barber_id
        and public.is_shop_owner(barbers.shop_id)
    )
  )
  with check (
    exists (
      select 1
      from barbers
      where barbers.id = barber_availability.barber_id
        and public.is_shop_owner(barbers.shop_id)
    )
  );

create policy "Users can delete barber availability"
  on barber_availability for delete
  using (
    exists (
      select 1
      from barbers
      where barbers.id = barber_availability.barber_id
        and public.is_shop_owner(barbers.shop_id)
    )
  );

drop policy if exists "Users can read own services" on services;
drop policy if exists "Users can insert own services" on services;
drop policy if exists "Users can update own services" on services;
drop policy if exists "Users can delete own services" on services;

create policy "Users can read own services"
  on services for select
  using (public.can_view_shop(shop_id));

create policy "Users can insert own services"
  on services for insert
  with check (public.is_shop_owner(shop_id));

create policy "Users can update own services"
  on services for update
  using (public.is_shop_owner(shop_id))
  with check (public.is_shop_owner(shop_id));

create policy "Users can delete own services"
  on services for delete
  using (public.is_shop_owner(shop_id));

drop policy if exists "Users can read barber services" on barber_services;
drop policy if exists "Users can insert barber services" on barber_services;
drop policy if exists "Users can update barber services" on barber_services;
drop policy if exists "Users can delete barber services" on barber_services;

create policy "Users can read barber services"
  on barber_services for select
  using (
    exists (
      select 1
      from barbers
      where barbers.id = barber_services.barber_id
        and public.can_view_shop(barbers.shop_id)
    )
    and exists (
      select 1
      from services
      where services.id = barber_services.service_id
        and public.can_view_shop(services.shop_id)
    )
  );

create policy "Users can insert barber services"
  on barber_services for insert
  with check (
    exists (
      select 1
      from barbers
      where barbers.id = barber_services.barber_id
        and public.is_shop_owner(barbers.shop_id)
    )
    and exists (
      select 1
      from services
      where services.id = barber_services.service_id
        and public.is_shop_owner(services.shop_id)
    )
  );

create policy "Users can update barber services"
  on barber_services for update
  using (
    exists (
      select 1
      from barbers
      where barbers.id = barber_services.barber_id
        and public.is_shop_owner(barbers.shop_id)
    )
    and exists (
      select 1
      from services
      where services.id = barber_services.service_id
        and public.is_shop_owner(services.shop_id)
    )
  )
  with check (
    exists (
      select 1
      from barbers
      where barbers.id = barber_services.barber_id
        and public.is_shop_owner(barbers.shop_id)
    )
    and exists (
      select 1
      from services
      where services.id = barber_services.service_id
        and public.is_shop_owner(services.shop_id)
    )
  );

create policy "Users can delete barber services"
  on barber_services for delete
  using (
    exists (
      select 1
      from barbers
      where barbers.id = barber_services.barber_id
        and public.is_shop_owner(barbers.shop_id)
    )
    and exists (
      select 1
      from services
      where services.id = barber_services.service_id
        and public.is_shop_owner(services.shop_id)
    )
  );

drop policy if exists "Users can read own clients" on clients;
drop policy if exists "Users can insert own clients" on clients;
drop policy if exists "Users can update own clients" on clients;
drop policy if exists "Users can delete own clients" on clients;

create policy "Users can read own clients"
  on clients for select
  using (public.can_view_shop(shop_id));

create policy "Users can insert own clients"
  on clients for insert
  with check (
    public.is_shop_owner(shop_id)
    or (auth.role() = 'anon' and shop_id = public.public_booking_shop_id())
  );

create policy "Users can update own clients"
  on clients for update
  using (public.is_shop_owner(shop_id))
  with check (public.is_shop_owner(shop_id));

create policy "Users can delete own clients"
  on clients for delete
  using (public.is_shop_owner(shop_id));

drop policy if exists "Users can read own appointments" on appointments;
drop policy if exists "Users can insert own appointments" on appointments;
drop policy if exists "Users can update own appointments" on appointments;
drop policy if exists "Users can delete own appointments" on appointments;

create policy "Users can read own appointments"
  on appointments for select
  using (public.can_view_shop(shop_id));

create policy "Users can insert own appointments"
  on appointments for insert
  with check (
    public.is_shop_owner(shop_id)
    or (auth.role() = 'anon' and shop_id = public.public_booking_shop_id())
  );

create policy "Users can update own appointments"
  on appointments for update
  using (public.is_shop_owner(shop_id))
  with check (public.is_shop_owner(shop_id));

create policy "Users can delete own appointments"
  on appointments for delete
  using (public.is_shop_owner(shop_id));

drop policy if exists "Users can read own whatsapp config" on whatsapp_configs;
drop policy if exists "Users can insert own whatsapp config" on whatsapp_configs;
drop policy if exists "Users can update own whatsapp config" on whatsapp_configs;
drop policy if exists "Users can delete own whatsapp config" on whatsapp_configs;

create policy "Users can read own whatsapp config"
  on whatsapp_configs for select
  using (public.can_view_shop(shop_id));

create policy "Users can insert own whatsapp config"
  on whatsapp_configs for insert
  with check (public.is_shop_owner(shop_id));

create policy "Users can update own whatsapp config"
  on whatsapp_configs for update
  using (public.is_shop_owner(shop_id))
  with check (public.is_shop_owner(shop_id));

create policy "Users can delete own whatsapp config"
  on whatsapp_configs for delete
  using (public.is_shop_owner(shop_id));

drop policy if exists "Users can read own google tokens" on google_calendar_tokens;
drop policy if exists "Users can insert own google tokens" on google_calendar_tokens;
drop policy if exists "Users can update own google tokens" on google_calendar_tokens;
drop policy if exists "Users can delete own google tokens" on google_calendar_tokens;

create policy "Users can read own google tokens"
  on google_calendar_tokens for select
  using (public.can_view_shop(shop_id));

create policy "Users can insert own google tokens"
  on google_calendar_tokens for insert
  with check (public.is_shop_owner(shop_id));

create policy "Users can update own google tokens"
  on google_calendar_tokens for update
  using (public.is_shop_owner(shop_id))
  with check (public.is_shop_owner(shop_id));

create policy "Users can delete own google tokens"
  on google_calendar_tokens for delete
  using (public.is_shop_owner(shop_id));

commit;
