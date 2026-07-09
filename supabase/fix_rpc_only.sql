-- RPC functions para o Admin (bypass RLS via security definer)
-- Executa este bloco primeiro

create or replace function public.admin_get_all_shops()
returns json
language plpgsql
security definer
as $$
declare
  admin_email text;
  result json;
begin
  select email into admin_email from auth.users where id = auth.uid();
  if admin_email is distinct from 'welloliver@gmail.com' then
    raise exception 'Unauthorized';
  end if;

  select json_agg(row_to_json(s)) into result
  from (select * from shops order by created_at desc) s;

  return coalesce(result, '[]'::json);
end;
$$;

create or replace function public.admin_create_shop(shop_name text, owner_id text default null)
returns json
language plpgsql
security definer
as $$
declare
  admin_email text;
  new_shop shops;
begin
  select email into admin_email from auth.users where id = auth.uid();
  if admin_email is distinct from 'welloliver@gmail.com' then
    raise exception 'Unauthorized';
  end if;

  insert into shops (name, owner_user_id)
  values (shop_name, nullif(owner_id, '')::uuid)
  returning * into new_shop;

  return row_to_json(new_shop);
end;
$$;

create or replace function public.admin_delete_shop(shop_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  admin_email text;
begin
  select email into admin_email from auth.users where id = auth.uid();
  if admin_email is distinct from 'welloliver@gmail.com' then
    raise exception 'Unauthorized';
  end if;

  delete from shops where id = shop_id;
end;
$$;

create or replace function public.admin_update_shop(
  shop_id uuid,
  shop_name text default null,
  shop_phone text default null,
  shop_address text default null,
  shop_logo text default null,
  shop_instagram text default null
)
returns json
language plpgsql
security definer
as $$
declare
  admin_email text;
  updated shops;
begin
  select email into admin_email from auth.users where id = auth.uid();
  if admin_email is distinct from 'welloliver@gmail.com' then
    raise exception 'Unauthorized';
  end if;

  update shops set
    name = coalesce(shop_name, name),
    phone = coalesce(shop_phone, phone),
    address = coalesce(shop_address, address),
    logo_url = coalesce(shop_logo, logo_url),
    instagram = coalesce(shop_instagram, instagram)
  where id = shop_id
  returning * into updated;

  return row_to_json(updated);
end;
$$;
