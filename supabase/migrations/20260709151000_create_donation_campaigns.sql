-- gibukim 기부 캠페인 · 참여자 · 이미지 · Storage

create table if not exists donation_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  goal_gold integer not null check (goal_gold > 0),
  current_gold integer not null default 0 check (current_gold >= 0),
  status text not null check (
    status in ('active', 'scheduled', 'completed', 'placeholder_active')
  ),
  is_active boolean not null default false,
  is_listed boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'active' and is_active = true and is_listed = true)
    or (status = 'placeholder_active' and is_active = true and is_listed = false)
    or (status = 'scheduled' and is_active = false)
    or (status = 'completed' and is_active = false)
  )
);

-- 홈·donate 대상 활성 캠페인은 전역 1건
create unique index if not exists one_active_donation_campaign
on donation_campaigns (is_active)
where is_active = true;

create index if not exists donation_campaigns_listed_created_at_idx
on donation_campaigns (created_at desc)
where is_listed = true;

create index if not exists donation_campaigns_scheduled_sort_idx
on donation_campaigns (sort_order asc, created_at asc)
where status = 'scheduled';

create table if not exists donation_campaign_images (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references donation_campaigns (id) on delete cascade,
  url text not null,
  sort_order integer not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default now()
);

-- 캠페인당 커버 이미지 최대 1장
create unique index if not exists one_cover_image_per_campaign
on donation_campaign_images (campaign_id)
where is_cover = true;

create index if not exists donation_campaign_images_campaign_sort_idx
on donation_campaign_images (campaign_id, sort_order asc);

create table if not exists donation_participants (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references donation_campaigns (id),
  anonymous_hash text not null references renewal_users (anonymous_hash),
  nickname text not null check (char_length(nickname) >= 1 and char_length(nickname) <= 10),
  gold_amount integer not null check (gold_amount > 0),
  donated_at timestamptz not null default now(),
  idempotency_key text not null,
  unique (anonymous_hash, idempotency_key)
);

create index if not exists donation_participants_campaign_donated_at_idx
on donation_participants (campaign_id, donated_at desc);

create index if not exists donation_participants_hash_donated_at_idx
on donation_participants (anonymous_hash, donated_at desc);

drop trigger if exists set_donation_campaigns_updated_at on donation_campaigns;
create trigger set_donation_campaigns_updated_at
before update on donation_campaigns
for each row
execute function set_renewal_updated_at();

alter table donation_campaigns enable row level security;
alter table donation_campaign_images enable row level security;
alter table donation_participants enable row level security;

revoke all on donation_campaigns from anon, authenticated;
revoke all on donation_campaign_images from anon, authenticated;
revoke all on donation_participants from anon, authenticated;

grant all on donation_campaigns to service_role;
grant all on donation_campaign_images to service_role;
grant all on donation_participants to service_role;

-- 캠페인 이미지 Storage 버킷 (public read, service_role write)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'donation-campaign-images',
  'donation-campaign-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- 공개 읽기
create policy "donation campaign images are publicly readable"
on storage.objects
for select
to public
using (bucket_id = 'donation-campaign-images');

-- 클라이언트 직접 쓰기 금지 (service_role은 RLS 우회)
create policy "donation campaign images insert denied for anon authenticated"
on storage.objects
for insert
to anon, authenticated
with check (false);

create policy "donation campaign images update denied for anon authenticated"
on storage.objects
for update
to anon, authenticated
using (false);

create policy "donation campaign images delete denied for anon authenticated"
on storage.objects
for delete
to anon, authenticated
using (false);
