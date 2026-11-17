-- SHAREMEAL food freshness and safety controls
-- Apply this migration in the Supabase SQL Editor before deploying the UI.

alter table public.donations
  add column if not exists prepared_at timestamptz,
  add column if not exists safe_until timestamptz,
  add column if not exists storage_type text not null default 'ambient',
  add column if not exists storage_temperature numeric(5,2),
  add column if not exists safety_status text not null default 'pending';

alter table public.donations
  drop constraint if exists donations_storage_type_check,
  add constraint donations_storage_type_check
    check (storage_type in ('ambient', 'refrigerated', 'hot_held', 'frozen')),
  drop constraint if exists donations_safety_status_check,
  add constraint donations_safety_status_check
    check (safety_status in ('pending', 'verified', 'on_hold', 'rejected')),
  drop constraint if exists donations_storage_temperature_check,
  add constraint donations_storage_temperature_check
    check (storage_temperature is null or storage_temperature between -80 and 150),
  drop constraint if exists donations_freshness_window_check,
  add constraint donations_freshness_window_check
    check (prepared_at is null or safe_until is null or safe_until >= prepared_at);

create index if not exists donations_safe_until_idx on public.donations (safe_until);
create index if not exists donations_safety_status_idx on public.donations (safety_status);

create table if not exists public.food_safety_reports (
  id uuid primary key default gen_random_uuid(),
  donation_id uuid not null references public.donations(id) on delete cascade,
  reported_by uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('unusual_smell', 'mould', 'appearance', 'temperature', 'packaging', 'other')),
  description text check (description is null or char_length(description) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists food_safety_reports_donation_idx
  on public.food_safety_reports (donation_id, created_at desc);

alter table public.food_safety_reports enable row level security;

drop policy if exists "Users can report food safety concerns" on public.food_safety_reports;
create policy "Users can report food safety concerns"
on public.food_safety_reports for insert to authenticated
with check (
  reported_by = auth.uid()
  and exists (
    select 1
    from public.donations d
    left join public.profiles p on p.id = auth.uid()
    where d.id = donation_id
      and (d.donor_id = auth.uid() or p.role = 'ngo')
  )
);

drop policy if exists "Reporters and donation owners can read safety reports" on public.food_safety_reports;
create policy "Reporters and donation owners can read safety reports"
on public.food_safety_reports for select to authenticated
using (
  reported_by = auth.uid()
  or exists (
    select 1 from public.donations d
    where d.id = donation_id and d.donor_id = auth.uid()
  )
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'ngo'
  )
);

-- A report immediately blocks the donation pending a human safety review.
create or replace function public.hold_donation_after_safety_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.donations
  set safety_status = 'on_hold'
  where id = new.donation_id;
  return new;
end;
$$;

drop trigger if exists food_safety_report_hold_donation on public.food_safety_reports;
create trigger food_safety_report_hold_donation
after insert on public.food_safety_reports
for each row execute function public.hold_donation_after_safety_report();

-- This view calculates expiry at read time, so no scheduled job is required.
-- The declared deadline is a tracking signal only, not a food-safety certification.
create or replace view public.donations_with_freshness
with (security_invoker = true)
as
select d.*,
  case
    when d.safe_until is null then 'deadline_not_set'
    when d.safe_until <= now() then 'expired'
    when d.safe_until <= now() + interval '4 hours' then 'expiring_soon'
    else 'fresh'
  end as freshness_status
from public.donations d;

