-- SHAREMEAL: location-aware nearby donation alerts
-- Run this migration in the Supabase SQL Editor before using live receiver features.

alter table public.profiles
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

alter table public.donations
  add column if not exists pickup_latitude double precision,
  add column if not exists pickup_longitude double precision;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  donation_id uuid references public.donations(id) on delete cascade,
  type text not null default 'nearby_donation',
  title text not null,
  message text not null,
  distance_km double precision,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_created_idx
  on public.notifications(recipient_id, created_at desc);
create index if not exists profiles_role_location_idx
  on public.profiles(role, latitude, longitude);
create index if not exists donations_pickup_location_idx
  on public.donations(pickup_latitude, pickup_longitude);

alter table public.notifications enable row level security;

drop policy if exists "Recipients can read their notifications" on public.notifications;
create policy "Recipients can read their notifications"
  on public.notifications for select
  to authenticated
  using (recipient_id = auth.uid());

drop policy if exists "Recipients can mark their notifications read" on public.notifications;
create policy "Recipients can mark their notifications read"
  on public.notifications for update
  to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- Update only the signed-in user's own coordinates; the client cannot change other profile fields.
create or replace function public.set_my_location(p_latitude double precision, p_longitude double precision)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if p_latitude is null or p_longitude is null
     or p_latitude < -90 or p_latitude > 90
     or p_longitude < -180 or p_longitude > 180 then
    raise exception 'Invalid coordinates';
  end if;
  update public.profiles
     set latitude = p_latitude, longitude = p_longitude
   where id = auth.uid();
end;
$$;

revoke all on function public.set_my_location(double precision, double precision) from public;
grant execute on function public.set_my_location(double precision, double precision) to authenticated;

-- NGOs can see active donation listings; donor-owned rows remain protected by existing policies.
drop policy if exists "NGOs can view food donations" on public.donations;
create policy "NGOs can view food donations"
  on public.donations for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'ngo'
    )
  );

create or replace function public.notify_ngos_near_new_donation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.pickup_latitude is null or new.pickup_longitude is null then
    return new;
  end if;

  insert into public.notifications (recipient_id, donation_id, type, title, message, distance_km)
  select
    p.id,
    new.id,
    'nearby_donation',
    'New food donation nearby',
    coalesce(new.food_name, 'A food donation') || ' is available near your location.',
    distance.distance_km
  from public.profiles p
  cross join lateral (
    select 6371 * acos(least(1.0, greatest(-1.0,
      cos(radians(p.latitude)) * cos(radians(new.pickup_latitude))
      * cos(radians(new.pickup_longitude) - radians(p.longitude))
      + sin(radians(p.latitude)) * sin(radians(new.pickup_latitude))
    ))) as distance_km
  ) distance
  where p.role = 'ngo'
    and p.latitude is not null
    and p.longitude is not null
    and distance.distance_km <= 5
    and p.id <> coalesce(new.donor_id, p.id);

  return new;
end;
$$;

drop trigger if exists donations_notify_nearby_ngos on public.donations;
create trigger donations_notify_nearby_ngos
after insert on public.donations
for each row execute function public.notify_ngos_near_new_donation();

-- Enable Supabase Realtime delivery for in-app alerts.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
exception when undefined_object then
  raise notice 'supabase_realtime publication not found; enable Realtime for public.notifications in Supabase dashboard.';
end $$;
