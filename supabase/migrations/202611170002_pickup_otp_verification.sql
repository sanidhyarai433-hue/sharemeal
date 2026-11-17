-- SHAREMEAL OTP-based pickup verification
-- Donors generate a short-lived one-time code; an authenticated volunteer verifies it at collection.
create extension if not exists pgcrypto with schema extensions;

alter table public.donations
  add column if not exists pickup_verified_at timestamptz,
  add column if not exists pickup_verified_by uuid references auth.users(id);

create table if not exists public.pickup_verification_codes (
  id uuid primary key default gen_random_uuid(),
  donation_id uuid not null references public.donations(id) on delete cascade,
  donor_id uuid not null references auth.users(id) on delete cascade,
  code_hash bytea not null,
  expires_at timestamptz not null,
  attempts integer not null default 0 check (attempts between 0 and 5),
  verified_at timestamptz,
  verified_by uuid references auth.users(id),
  invalidated_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists pickup_codes_donation_idx
  on public.pickup_verification_codes (donation_id, created_at desc);

alter table public.pickup_verification_codes enable row level security;
-- No direct table access: only the security-definer RPCs below can read or mutate codes.
revoke all on public.pickup_verification_codes from anon, authenticated;

create or replace function public.create_pickup_otp(p_donation_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_code text;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.donations d
    where d.id = p_donation_id and d.donor_id = v_user
      and coalesce(d.safety_status, 'pending') not in ('on_hold', 'rejected')
      and (d.safe_until is null or d.safe_until > now())
      and d.pickup_deadline > now()
      and d.pickup_verified_at is null
  ) then
    raise exception 'Donation is not eligible for pickup verification';
  end if;

  update public.pickup_verification_codes
  set invalidated_at = now()
  where donation_id = p_donation_id and verified_at is null and invalidated_at is null;

  v_code := lpad((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint % 1000000)::text, 6, '0');
  insert into public.pickup_verification_codes (donation_id, donor_id, code_hash, expires_at)
  values (p_donation_id, v_user, extensions.digest(v_code, 'sha256'), now() + interval '30 minutes');
  return v_code;
end;
$$;

create or replace function public.verify_pickup_otp(p_donation_id uuid, p_code text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user uuid := auth.uid();
  v_record public.pickup_verification_codes%rowtype;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.profiles p where p.id = v_user and p.role = 'volunteer') then
    raise exception 'Only an authenticated volunteer can verify pickup';
  end if;
  if p_code is null or p_code !~ '^[0-9]{6}$' then
    raise exception 'Enter a valid six-digit pickup code';
  end if;

  select * into v_record
  from public.pickup_verification_codes
  where donation_id = p_donation_id
    and verified_at is null and invalidated_at is null
    and expires_at > now() and attempts < 5
  order by created_at desc
  limit 1
  for update;

  if not found then raise exception 'No active pickup code. Ask the donor to generate a new one'; end if;

  if v_record.code_hash <> extensions.digest(p_code, 'sha256') then
    update public.pickup_verification_codes set attempts = attempts + 1 where id = v_record.id;
    raise exception 'Incorrect pickup code';
  end if;

  if not exists (
    select 1 from public.donations d
    where d.id = p_donation_id
      and coalesce(d.safety_status, 'pending') not in ('on_hold', 'rejected')
      and (d.safe_until is null or d.safe_until > now())
      and d.pickup_deadline > now()
      and d.pickup_verified_at is null
  ) then
    raise exception 'Donation is expired, on safety hold, or already collected';
  end if;

  update public.pickup_verification_codes
  set verified_at = now(), verified_by = v_user
  where id = v_record.id;
  update public.donations
  set pickup_verified_at = now(), pickup_verified_by = v_user
  where id = p_donation_id;
  return true;
end;
$$;

revoke all on function public.create_pickup_otp(uuid) from public, anon;
revoke all on function public.verify_pickup_otp(uuid, text) from public, anon;
grant execute on function public.create_pickup_otp(uuid) to authenticated;
grant execute on function public.verify_pickup_otp(uuid, text) to authenticated;
