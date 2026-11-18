-- Ejecuta este script en Supabase > SQL Editor

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  description text,
  category text,
  price numeric(12,2),
  stock integer,
  image text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

-- Permisos de la API (en proyectos nuevos de Supabase ya no se otorgan solos)
grant select on public.products to anon;
grant select, insert, update, delete on public.products to authenticated;

-- Clientes (anónimos): solo ven productos activos
create policy "Público ve productos activos"
  on public.products for select
  to anon
  using (active = true);

-- Administradores (usuarios con sesión): acceso total
create policy "Admin gestiona productos"
  on public.products for all
  to authenticated
  using (true)
  with check (true);

-- Bucket público para imágenes
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

create policy "Imágenes visibles para todos"
  on storage.objects for select
  using (bucket_id = 'products');

create policy "Admin sube imágenes"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'products');

create policy "Admin actualiza imágenes"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'products');

create policy "Admin borra imágenes"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'products');
