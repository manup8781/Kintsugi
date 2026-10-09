-- Kintsugi: base de datos, permisos y almacenamiento.
-- Ejecuta este archivo completo en Supabase > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  seed_key text unique,
  title text not null,
  zone text not null default '',
  style text not null default '',
  alt_text text not null default '',
  image_path text not null,
  layout text not null default 'standard' check (layout in ('standard','work-wide','work-tall')),
  display_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(10,2) not null default 0 check (price >= 0),
  category text not null default 'oreja' check (category in ('oreja','nariz','cuerpo')),
  material text not null default '',
  image_path text not null,
  display_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists portfolio_items_updated_at on public.portfolio_items;
create trigger portfolio_items_updated_at before update on public.portfolio_items for each row execute function public.set_updated_at();
drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at before update on public.products for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

alter table public.admin_users enable row level security;
alter table public.portfolio_items enable row level security;
alter table public.products enable row level security;

drop policy if exists "Admin reads own membership" on public.admin_users;
create policy "Admin reads own membership" on public.admin_users for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Public reads published portfolio" on public.portfolio_items;
create policy "Public reads published portfolio" on public.portfolio_items for select to anon, authenticated using (is_published or public.is_admin());
drop policy if exists "Admins insert portfolio" on public.portfolio_items;
create policy "Admins insert portfolio" on public.portfolio_items for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins update portfolio" on public.portfolio_items;
create policy "Admins update portfolio" on public.portfolio_items for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins delete portfolio" on public.portfolio_items;
create policy "Admins delete portfolio" on public.portfolio_items for delete to authenticated using (public.is_admin());

drop policy if exists "Public reads published products" on public.products;
create policy "Public reads published products" on public.products for select to anon, authenticated using (is_published or public.is_admin());
drop policy if exists "Admins insert products" on public.products;
create policy "Admins insert products" on public.products for insert to authenticated with check (public.is_admin());
drop policy if exists "Admins update products" on public.products;
create policy "Admins update products" on public.products for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Admins delete products" on public.products;
create policy "Admins delete products" on public.products for delete to authenticated using (public.is_admin());

revoke all on public.admin_users from anon, authenticated;
grant select on public.admin_users to authenticated;

revoke all on public.portfolio_items, public.products from anon, authenticated;
grant select on public.portfolio_items, public.products to anon, authenticated;
grant insert, update, delete on public.portfolio_items, public.products to authenticated;

insert into storage.buckets (id,name,public)
values ('portfolio','portfolio',true),('products','products',true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public reads Kintsugi images" on storage.objects;
create policy "Public reads Kintsugi images" on storage.objects for select to anon, authenticated using (bucket_id in ('portfolio','products'));
drop policy if exists "Admins upload Kintsugi images" on storage.objects;
create policy "Admins upload Kintsugi images" on storage.objects for insert to authenticated with check (bucket_id in ('portfolio','products') and public.is_admin());
drop policy if exists "Admins update Kintsugi images" on storage.objects;
create policy "Admins update Kintsugi images" on storage.objects for update to authenticated using (bucket_id in ('portfolio','products') and public.is_admin()) with check (bucket_id in ('portfolio','products') and public.is_admin());
drop policy if exists "Admins delete Kintsugi images" on storage.objects;
create policy "Admins delete Kintsugi images" on storage.objects for delete to authenticated using (bucket_id in ('portfolio','products') and public.is_admin());

-- DESPUÉS DE CREAR TU USUARIO EN AUTHENTICATION > USERS,
-- reemplaza el correo y ejecuta solamente esta sentencia:
-- insert into public.admin_users (user_id)
-- select id from auth.users where email = 'TU-CORREO@EJEMPLO.COM'
-- on conflict (user_id) do nothing;
