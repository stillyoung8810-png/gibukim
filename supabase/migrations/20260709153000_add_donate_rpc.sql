-- donate_renewal_gold: 전액 기부 + 캠페인 배분·승격·placeholder 루프

create or replace function ensure_active_donation_campaign()
returns donation_campaigns
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign donation_campaigns;
  v_last_goal integer := 10000;
begin
  select *
  into v_campaign
  from donation_campaigns
  where is_active = true
  for update;

  if found then
    return v_campaign;
  end if;

  select goal_gold
  into v_last_goal
  from donation_campaigns
  order by created_at desc
  limit 1;

  if v_last_goal is null or v_last_goal <= 0 then
    v_last_goal := 10000;
  end if;

  insert into donation_campaigns (
    title,
    goal_gold,
    current_gold,
    status,
    is_active,
    is_listed,
    sort_order
  )
  values (
    '다음 기부',
    v_last_goal,
    0,
    'placeholder_active',
    true,
    false,
    0
  )
  returning *
  into v_campaign;

  return v_campaign;
end;
$$;

create or replace function promote_or_create_next_donation_campaign(
  p_previous_goal_gold integer
)
returns donation_campaigns
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next donation_campaigns;
begin
  select *
  into v_next
  from donation_campaigns
  where status = 'scheduled'
  order by sort_order asc, created_at asc
  limit 1
  for update;

  if found then
    update donation_campaigns
    set
      is_active = true,
      status = 'active',
      is_listed = true,
      updated_at = now()
    where id = v_next.id
    returning *
    into v_next;

    return v_next;
  end if;

  insert into donation_campaigns (
    title,
    goal_gold,
    current_gold,
    status,
    is_active,
    is_listed,
    sort_order
  )
  values (
    '다음 기부',
    greatest(1, coalesce(p_previous_goal_gold, 10000)),
    0,
    'placeholder_active',
    true,
    false,
    0
  )
  returning *
  into v_next;

  return v_next;
end;
$$;

create or replace function get_today_donated_gold(
  p_anonymous_hash text
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(gold_amount), 0)::integer
  from donation_participants
  where anonymous_hash = p_anonymous_hash
    and (donated_at at time zone 'Asia/Seoul')::date = get_current_kst_date();
$$;

create or replace function donate_renewal_gold(
  p_anonymous_hash text,
  p_idempotency_key text,
  p_nickname text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user renewal_users;
  v_existing_gold_ledger gold_ledger;
  v_nickname text;
  v_amount integer;
  v_remaining integer;
  v_campaign donation_campaigns;
  v_space integer;
  v_take integer;
  v_previous_goal integer;
  v_active_campaign jsonb;
  v_today_donated_gold integer;
  v_participant_key text;
begin
  if p_anonymous_hash is null or length(p_anonymous_hash) = 0 then
    return jsonb_build_object('type', 'failure', 'reason', 'invalidRequest');
  end if;

  if p_idempotency_key is null or length(p_idempotency_key) = 0 then
    return jsonb_build_object('type', 'failure', 'reason', 'invalidRequest');
  end if;

  v_nickname := trim(coalesce(p_nickname, ''));

  if char_length(v_nickname) < 1 or char_length(v_nickname) > 10 then
    return jsonb_build_object('type', 'failure', 'reason', 'invalidRequest');
  end if;

  perform get_or_create_renewal_user(p_anonymous_hash);

  select *
  into v_user
  from renewal_users
  where anonymous_hash = p_anonymous_hash
  for update;

  select *
  into v_existing_gold_ledger
  from gold_ledger
  where anonymous_hash = p_anonymous_hash
    and idempotency_key = p_idempotency_key;

  if found then
    if v_existing_gold_ledger.type <> 'donation_debit' then
      return jsonb_build_object('type', 'failure', 'reason', 'invalidRequest');
    end if;

    v_campaign := ensure_active_donation_campaign();
    v_today_donated_gold := get_today_donated_gold(p_anonymous_hash);

    return jsonb_build_object(
      'type', 'success',
      'goldBalance', 0,
      'creditedAmount', abs(v_existing_gold_ledger.amount),
      'todayDonatedGold', v_today_donated_gold,
      'isReplay', true,
      'activeCampaign', jsonb_build_object(
        'id', v_campaign.id,
        'title', v_campaign.title,
        'goalGold', v_campaign.goal_gold,
        'currentGold', v_campaign.current_gold,
        'status', v_campaign.status
      )
    );
  end if;

  if v_user.status = 'blocked' then
    return jsonb_build_object('type', 'failure', 'reason', 'userBlocked');
  end if;

  v_amount := v_user.gold_balance;

  if v_amount <= 0 then
    return jsonb_build_object('type', 'failure', 'reason', 'emptyGold');
  end if;

  insert into gold_ledger (
    anonymous_hash,
    type,
    amount,
    idempotency_key,
    metadata
  )
  values (
    p_anonymous_hash,
    'donation_debit',
    -v_amount,
    p_idempotency_key,
    jsonb_build_object(
      'nickname', v_nickname,
      'creditedAmount', v_amount,
      'resultingGoldBalance', 0
    )
  );

  update renewal_users
  set gold_balance = 0
  where anonymous_hash = p_anonymous_hash;

  v_remaining := v_amount;

  while v_remaining > 0 loop
    v_campaign := ensure_active_donation_campaign();

    v_space := greatest(0, v_campaign.goal_gold - v_campaign.current_gold);

    if v_space <= 0 then
      update donation_campaigns
      set
        is_active = false,
        status = 'completed',
        updated_at = now()
      where id = v_campaign.id;

      perform promote_or_create_next_donation_campaign(v_campaign.goal_gold);
      continue;
    end if;

    v_take := least(v_remaining, v_space);
    v_participant_key := 'donate:' || p_idempotency_key || ':' || v_campaign.id::text;

    update donation_campaigns
    set
      current_gold = current_gold + v_take,
      updated_at = now()
    where id = v_campaign.id
    returning *
    into v_campaign;

    insert into donation_participants (
      campaign_id,
      anonymous_hash,
      nickname,
      gold_amount,
      idempotency_key
    )
    values (
      v_campaign.id,
      p_anonymous_hash,
      v_nickname,
      v_take,
      v_participant_key
    )
    on conflict (anonymous_hash, idempotency_key) do nothing;

    v_remaining := v_remaining - v_take;

    if v_campaign.current_gold >= v_campaign.goal_gold then
      v_previous_goal := v_campaign.goal_gold;

      update donation_campaigns
      set
        is_active = false,
        status = 'completed',
        updated_at = now()
      where id = v_campaign.id;

      perform promote_or_create_next_donation_campaign(v_previous_goal);
    end if;
  end loop;

  v_campaign := ensure_active_donation_campaign();
  v_today_donated_gold := get_today_donated_gold(p_anonymous_hash);
  v_active_campaign := jsonb_build_object(
    'id', v_campaign.id,
    'title', v_campaign.title,
    'goalGold', v_campaign.goal_gold,
    'currentGold', v_campaign.current_gold,
    'status', v_campaign.status
  );

  return jsonb_build_object(
    'type', 'success',
    'goldBalance', 0,
    'creditedAmount', v_amount,
    'todayDonatedGold', v_today_donated_gold,
    'isReplay', false,
    'activeCampaign', v_active_campaign
  );
end;
$$;

revoke all on function ensure_active_donation_campaign() from anon, authenticated;
revoke all on function promote_or_create_next_donation_campaign(integer) from anon, authenticated;
revoke all on function get_today_donated_gold(text) from anon, authenticated;
revoke all on function donate_renewal_gold(text, text, text) from anon, authenticated;

grant execute on function ensure_active_donation_campaign() to service_role;
grant execute on function promote_or_create_next_donation_campaign(integer) to service_role;
grant execute on function get_today_donated_gold(text) to service_role;
grant execute on function donate_renewal_gold(text, text, text) to service_role;
