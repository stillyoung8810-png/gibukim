-- gibukim renewal ledger (kilomoa 이식 + gibukim 조정)
-- - gold_ledger: donation_debit 추가
-- - box_ledger: time_box_credit 사용 (distance_box_credit 미사용)

create extension if not exists pgcrypto;

create table if not exists renewal_users (
  anonymous_hash text primary key,
  status text not null default 'active' check (status in ('active', 'blocked', 'suspended')),
  available_box_count integer not null default 0 check (available_box_count >= 0),
  gold_balance integer not null default 0 check (gold_balance >= 0),
  total_converted_toss_point integer not null default 0 check (total_converted_toss_point >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists gold_ledger (
  id uuid primary key default gen_random_uuid(),
  anonymous_hash text not null references renewal_users (anonymous_hash),
  type text not null check (
    type in (
      'box_open_credit',
      'attendance_credit',
      'conversion_hold_debit',
      'conversion_hold_release',
      'donation_debit',
      'admin_adjustment'
    )
  ),
  amount integer not null,
  idempotency_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (
    (type in ('box_open_credit', 'attendance_credit') and amount > 0)
    or (type = 'conversion_hold_debit' and amount < 0)
    or (type = 'conversion_hold_release' and amount > 0)
    or (type = 'donation_debit' and amount < 0)
    or (type = 'admin_adjustment' and amount <> 0)
  ),
  unique (anonymous_hash, idempotency_key)
);

create table if not exists box_ledger (
  id uuid primary key default gen_random_uuid(),
  anonymous_hash text not null references renewal_users (anonymous_hash),
  type text not null check (
    type in (
      'time_box_credit',
      'box_open_debit',
      'admin_adjustment'
    )
  ),
  amount integer not null,
  idempotency_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (
    (type = 'time_box_credit' and amount > 0)
    or (type = 'box_open_debit' and amount < 0)
    or (type = 'admin_adjustment' and amount <> 0)
  ),
  unique (anonymous_hash, idempotency_key)
);

create table if not exists conversions (
  conversion_id uuid primary key default gen_random_uuid(),
  anonymous_hash text not null references renewal_users (anonymous_hash),
  requested_gold integer not null check (requested_gold > 0),
  point_amount integer not null check (point_amount > 0),
  exchange_rate_snapshot numeric(10, 4) not null check (exchange_rate_snapshot > 0),
  status text not null check (
    status in (
      'pending',
      'sdk_call_started',
      'finalized',
      'expired',
      'cancelled',
      'manual_review'
    )
  ),
  toss_success_key text,
  idempotency_key text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  status_updated_at timestamptz not null default now(),
  finalized_at timestamptz,
  unique (anonymous_hash, idempotency_key),
  unique (toss_success_key)
);

create unique index if not exists one_active_conversion_per_user
on conversions (anonymous_hash)
where status in ('pending', 'sdk_call_started');

create table if not exists attendance_records (
  id uuid primary key default gen_random_uuid(),
  anonymous_hash text not null references renewal_users (anonymous_hash),
  attendance_date_kst date not null,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (anonymous_hash, attendance_date_kst),
  unique (anonymous_hash, idempotency_key)
);

create index if not exists gold_ledger_anonymous_hash_created_at_idx
on gold_ledger (anonymous_hash, created_at desc);

create index if not exists box_ledger_anonymous_hash_created_at_idx
on box_ledger (anonymous_hash, created_at desc);

create index if not exists conversions_anonymous_hash_created_at_idx
on conversions (anonymous_hash, created_at desc);

create index if not exists conversions_anonymous_hash_finalized_at_idx
on conversions (anonymous_hash, finalized_at desc)
where status = 'finalized';

create index if not exists attendance_records_anonymous_hash_date_idx
on attendance_records (anonymous_hash, attendance_date_kst desc);

create or replace function set_renewal_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_renewal_users_updated_at on renewal_users;
create trigger set_renewal_users_updated_at
before update on renewal_users
for each row
execute function set_renewal_updated_at();

create or replace function get_or_create_renewal_user(
  p_anonymous_hash text
)
returns renewal_users
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user renewal_users;
begin
  if p_anonymous_hash is null or length(p_anonymous_hash) = 0 then
    raise exception 'anonymous_hash is required';
  end if;

  insert into renewal_users (anonymous_hash)
  values (p_anonymous_hash)
  on conflict (anonymous_hash) do nothing;

  select *
  into v_user
  from renewal_users
  where anonymous_hash = p_anonymous_hash;

  return v_user;
end;
$$;

alter table renewal_users enable row level security;
alter table gold_ledger enable row level security;
alter table box_ledger enable row level security;
alter table conversions enable row level security;
alter table attendance_records enable row level security;

revoke all on renewal_users from anon, authenticated;
revoke all on gold_ledger from anon, authenticated;
revoke all on box_ledger from anon, authenticated;
revoke all on conversions from anon, authenticated;
revoke all on attendance_records from anon, authenticated;
revoke all on function get_or_create_renewal_user(text) from anon, authenticated;

grant usage on schema public to service_role;
grant all on renewal_users to service_role;
grant all on gold_ledger to service_role;
grant all on box_ledger to service_role;
grant all on conversions to service_role;
grant all on attendance_records to service_role;
grant execute on function get_or_create_renewal_user(text) to service_role;
