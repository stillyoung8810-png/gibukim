-- 개발용 활성 캠페인 시드 (없을 때만)

insert into donation_campaigns (
  title,
  goal_gold,
  current_gold,
  status,
  is_active,
  is_listed,
  sort_order
)
select
  '두리여유법인 따뜻한 한 끼',
  10000,
  0,
  'active',
  true,
  true,
  0
where not exists (
  select 1 from donation_campaigns where is_active = true
);
