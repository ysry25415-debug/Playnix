do $$ begin
  create type public.offer_status as enum ('draft', 'active', 'paused', 'sold_out');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.offer_delivery_mode as enum ('instant', 'chat');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum ('pending', 'paid', 'delivered', 'cancelled');
exception when duplicate_object then null; end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id) on delete cascade,
  game_slug text not null,
  category_slug text not null,
  title text not null,
  description text not null,
  price_usd numeric(10,2) not null check (price_usd > 0),
  delivery_mode public.offer_delivery_mode not null default 'chat',
  delivery_time text not null default 'Instant delivery',
  stock_count integer not null default 1 check (stock_count >= 0),
  status public.offer_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  game_slug text not null,
  category_slug text not null,
  offer_title text not null,
  price_usd numeric(10,2) not null check (price_usd > 0),
  delivery_mode public.offer_delivery_mode not null default 'chat',
  status public.order_status not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.offers
add column if not exists delivery_mode public.offer_delivery_mode not null default 'chat';

alter table public.orders
add column if not exists delivery_mode public.offer_delivery_mode not null default 'chat';

create table if not exists public.offer_private_deliveries (
  offer_id uuid primary key references public.offers(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  delivery_content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_delivery_details (
  order_id uuid primary key references public.orders(id) on delete cascade,
  offer_id uuid not null references public.offers(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  delivery_mode public.offer_delivery_mode not null,
  delivery_content text,
  created_at timestamptz not null default now(),
  unlocked_at timestamptz
);

create table if not exists public.offer_images (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  public_url text not null,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_offers_seller_id on public.offers(seller_id);
create index if not exists idx_offers_game_status on public.offers(game_slug, category_slug, status);
create index if not exists idx_orders_seller_id on public.orders(seller_id);
create index if not exists idx_orders_buyer_id on public.orders(buyer_id);
create index if not exists idx_offer_private_deliveries_seller_id on public.offer_private_deliveries(seller_id);
create index if not exists idx_order_delivery_details_buyer_id on public.order_delivery_details(buyer_id);
create index if not exists idx_order_delivery_details_seller_id on public.order_delivery_details(seller_id);
create index if not exists idx_offer_images_offer_id on public.offer_images(offer_id, sort_order, created_at);
create index if not exists idx_offer_images_seller_id on public.offer_images(seller_id);
create unique index if not exists uq_offer_images_primary_per_offer
on public.offer_images(offer_id)
where is_primary = true;

drop trigger if exists trg_offers_updated_at on public.offers;
create trigger trg_offers_updated_at
before update on public.offers
for each row execute function public.set_updated_at();

drop trigger if exists trg_offer_private_deliveries_updated_at on public.offer_private_deliveries;
create trigger trg_offer_private_deliveries_updated_at
before update on public.offer_private_deliveries
for each row execute function public.set_updated_at();

alter table public.offers enable row level security;
alter table public.orders enable row level security;
alter table public.offer_images enable row level security;
alter table public.offer_private_deliveries enable row level security;
alter table public.order_delivery_details enable row level security;

drop policy if exists "offers_select_market_or_owner" on public.offers;
create policy "offers_select_market_or_owner"
on public.offers for select
to authenticated
using (
  status = 'active'
  or seller_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "offers_insert_seller" on public.offers;
create policy "offers_insert_seller"
on public.offers for insert
to authenticated
with check (
  seller_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('seller', 'admin')
  )
);

drop policy if exists "offers_update_seller" on public.offers;
create policy "offers_update_seller"
on public.offers for update
to authenticated
using (
  seller_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  seller_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "offers_delete_seller" on public.offers;
create policy "offers_delete_seller"
on public.offers for delete
to authenticated
using (
  seller_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "orders_select_parties" on public.orders;
create policy "orders_select_parties"
on public.orders for select
to authenticated
using (
  buyer_id = auth.uid()
  or seller_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "orders_insert_buyer" on public.orders;
create policy "orders_insert_buyer"
on public.orders for insert
to authenticated
with check (
  buyer_id = auth.uid()
  and buyer_id <> seller_id
);

drop policy if exists "offer_private_deliveries_select_owner" on public.offer_private_deliveries;
create policy "offer_private_deliveries_select_owner"
on public.offer_private_deliveries for select
to authenticated
using (
  seller_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "offer_private_deliveries_insert_owner" on public.offer_private_deliveries;
create policy "offer_private_deliveries_insert_owner"
on public.offer_private_deliveries for insert
to authenticated
with check (
  seller_id = auth.uid()
  and exists (
    select 1
    from public.offers o
    where o.id = offer_private_deliveries.offer_id
      and o.seller_id = auth.uid()
  )
);

drop policy if exists "offer_private_deliveries_update_owner" on public.offer_private_deliveries;
create policy "offer_private_deliveries_update_owner"
on public.offer_private_deliveries for update
to authenticated
using (
  seller_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  seller_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "offer_private_deliveries_delete_owner" on public.offer_private_deliveries;
create policy "offer_private_deliveries_delete_owner"
on public.offer_private_deliveries for delete
to authenticated
using (
  seller_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "order_delivery_details_select_parties" on public.order_delivery_details;
create policy "order_delivery_details_select_parties"
on public.order_delivery_details for select
to authenticated
using (
  buyer_id = auth.uid()
  or seller_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "order_delivery_details_insert_owner" on public.order_delivery_details;
create policy "order_delivery_details_insert_owner"
on public.order_delivery_details for insert
to authenticated
with check (
  seller_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "order_delivery_details_update_owner" on public.order_delivery_details;
create policy "order_delivery_details_update_owner"
on public.order_delivery_details for update
to authenticated
using (
  seller_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  seller_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "offer_images_select_market_or_owner" on public.offer_images;
create policy "offer_images_select_market_or_owner"
on public.offer_images for select
to authenticated
using (
  exists (
    select 1
    from public.offers o
    where o.id = offer_images.offer_id
      and (
        o.status = 'active'
        or o.seller_id = auth.uid()
      )
  )
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "offer_images_insert_seller" on public.offer_images;
create policy "offer_images_insert_seller"
on public.offer_images for insert
to authenticated
with check (
  seller_id = auth.uid()
  and exists (
    select 1
    from public.offers o
    where o.id = offer_images.offer_id
      and o.seller_id = auth.uid()
  )
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('seller', 'admin')
  )
);

drop policy if exists "offer_images_update_seller" on public.offer_images;
create policy "offer_images_update_seller"
on public.offer_images for update
to authenticated
using (
  seller_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  seller_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "offer_images_delete_seller" on public.offer_images;
create policy "offer_images_delete_seller"
on public.offer_images for delete
to authenticated
using (
  seller_id = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'offer-images',
  'offer-images',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "offer_images_upload_own_folder" on storage.objects;
create policy "offer_images_upload_own_folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'offer-images'
  and (storage.foldername(name))[1] = auth.uid()::text
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('seller', 'admin')
  )
);

drop policy if exists "offer_images_update_own_folder" on storage.objects;
create policy "offer_images_update_own_folder"
on storage.objects for update
to authenticated
using (
  bucket_id = 'offer-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'offer-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "offer_images_delete_own_folder" on storage.objects;
create policy "offer_images_delete_own_folder"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'offer-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
