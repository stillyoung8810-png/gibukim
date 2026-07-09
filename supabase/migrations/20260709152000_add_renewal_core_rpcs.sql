-- gibukim renewal core RPCs (kilomoa 이식 + time_box_credit)

create or replace function get_or_create_renewal_user_with_initial_boxes(
  p_anonymous_hash text,
  p_initial_available_box_count integer default 0
)
returns renewal_users
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user renewal_users;
  v_initial_available_box_count integer;
begin
  if p_anonymous_hash is null or length(p_anonymous_hash) = 0 then
    raise exception 'anonymous_hash is required';
  end if;

  v_initial_available_box_count := least(
    300,
    greatest(0, coalesce(p_initial_available_box_count, 0))
  );

  insert into renewal_users (
    anonymous_hash,
    available_box_count
  )
  values (
    p_anonymous_hash,
    v_initial_available_box_count
  )
  on conflict (anonymous_hash) do nothing
  returning *
  into v_user;

  if found then
    if v_initial_available_box_count > 0 then
      insert into box_ledger (
        anonymous_hash,
        type,
        amount,
        idempotency_key,
        metadata
      )
      values (
        p_anonymous_hash,
        'admin_adjustment',
        v_initial_available_box_count,
        'legacy-local-box-migration:' || p_anonymous_hash,
        jsonb_build_object(
          'source',
          'legacy_local_box_migration',
          'resultingAvailableBoxCount',
          v_initial_available_box_count
        )
      )
      on conflict (anonymous_hash, idempotency_key) do nothing;
    end if;

    return v_user;
  end if;

  select *
  into v_user
  from renewal_users
  where anonymous_hash = p_anonymous_hash;

  return v_user;
end;
$$;

revoke all on function get_or_create_renewal_user_with_initial_boxes(text, integer)
from anon, authenticated;

grant execute on function get_or_create_renewal_user_with_initial_boxes(text, integer)
to service_role;

create or replace function credit_renewal_time_boxes(
  p_anonymous_hash text,
  p_idempotency_key text,
  p_earned_box_count integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user renewal_users;
  v_existing_box_ledger box_ledger;
  v_next_available_box_count integer;
begin
  if p_anonymous_hash is null or length(p_anonymous_hash) = 0 then
    return jsonb_build_object('type', 'failure', 'reason', 'invalidRequest');
  end if;

  if p_idempotency_key is null or length(p_idempotency_key) = 0 then
    return jsonb_build_object('type', 'failure', 'reason', 'invalidRequest');
  end if;

  if p_earned_box_count is null or p_earned_box_count <= 0 then
    return jsonb_build_object('type', 'failure', 'reason', 'invalidRequest');
  end if;

  perform get_or_create_renewal_user(p_anonymous_hash);

  select *
  into v_user
  from renewal_users
  where anonymous_hash = p_anonymous_hash
  for update;

  select *
  into v_existing_box_ledger
  from box_ledger
  where anonymous_hash = p_anonymous_hash
    and idempotency_key = p_idempotency_key;

  if found then
    if v_existing_box_ledger.type <> 'time_box_credit' then
      return jsonb_build_object('type', 'failure', 'reason', 'invalidRequest');
    end if;

    return jsonb_build_object(
      'type', 'success',
      'availableBoxCount',
      coalesce(
        (v_existing_box_ledger.metadata->>'resultingAvailableBoxCount')::integer,
        v_user.available_box_count
      ),
      'isReplay', true
    );
  end if;

  if v_user.status = 'blocked' then
    return jsonb_build_object('type', 'failure', 'reason', 'userBlocked');
  end if;

  v_next_available_box_count := v_user.available_box_count + p_earned_box_count;

  insert into box_ledger (
    anonymous_hash,
    type,
    amount,
    idempotency_key,
    metadata
  )
  values (
    p_anonymous_hash,
    'time_box_credit',
    p_earned_box_count,
    p_idempotency_key,
    jsonb_build_object(
      'resultingAvailableBoxCount',
      v_next_available_box_count
    )
  );

  update renewal_users
  set available_box_count = v_next_available_box_count
  where anonymous_hash = p_anonymous_hash;

  return jsonb_build_object(
    'type', 'success',
    'availableBoxCount', v_next_available_box_count,
    'isReplay', false
  );
end;
$$;

create or replace function credit_renewal_box_open_gold(
  p_anonymous_hash text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user renewal_users;
  v_existing_gold_ledger gold_ledger;
  v_credit_amount constant integer := 1;
  v_max_gold_balance constant integer := 5000;
  v_next_available_box_count integer;
  v_next_gold_balance integer;
begin
  if p_anonymous_hash is null or length(p_anonymous_hash) = 0 then
    return jsonb_build_object('type', 'failure', 'reason', 'invalidRequest');
  end if;

  if p_idempotency_key is null or length(p_idempotency_key) = 0 then
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
    if v_existing_gold_ledger.type <> 'box_open_credit' then
      return jsonb_build_object('type', 'failure', 'reason', 'invalidRequest');
    end if;

    return jsonb_build_object(
      'type', 'success',
      'idempotencyKey', p_idempotency_key,
      'creditedGold', v_existing_gold_ledger.amount,
      'goldBalance',
      coalesce(
        (v_existing_gold_ledger.metadata->>'resultingGoldBalance')::integer,
        v_user.gold_balance
      ),
      'availableBoxCount',
      coalesce(
        (v_existing_gold_ledger.metadata->>'resultingAvailableBoxCount')::integer,
        v_user.available_box_count
      ),
      'isReplay', true
    );
  end if;

  if v_user.status = 'blocked' then
    return jsonb_build_object('type', 'failure', 'reason', 'userBlocked');
  end if;

  if v_user.available_box_count <= 0 then
    return jsonb_build_object('type', 'failure', 'reason', 'emptyBox');
  end if;

  if v_user.gold_balance + v_credit_amount > v_max_gold_balance then
    return jsonb_build_object('type', 'failure', 'reason', 'goldLimitReached');
  end if;

  v_next_available_box_count := v_user.available_box_count - 1;
  v_next_gold_balance := v_user.gold_balance + v_credit_amount;

  insert into box_ledger (
    anonymous_hash,
    type,
    amount,
    idempotency_key,
    metadata
  )
  values (
    p_anonymous_hash,
    'box_open_debit',
    -1,
    'box-open-debit:' || p_idempotency_key,
    jsonb_build_object(
      'resultingAvailableBoxCount',
      v_next_available_box_count
    )
  );

  insert into gold_ledger (
    anonymous_hash,
    type,
    amount,
    idempotency_key,
    metadata
  )
  values (
    p_anonymous_hash,
    'box_open_credit',
    v_credit_amount,
    p_idempotency_key,
    jsonb_build_object(
      'resultingGoldBalance',
      v_next_gold_balance,
      'resultingAvailableBoxCount',
      v_next_available_box_count
    )
  );

  update renewal_users
  set
    available_box_count = v_next_available_box_count,
    gold_balance = v_next_gold_balance
  where anonymous_hash = p_anonymous_hash;

  return jsonb_build_object(
    'type', 'success',
    'idempotencyKey', p_idempotency_key,
    'creditedGold', v_credit_amount,
    'goldBalance', v_next_gold_balance,
    'availableBoxCount', v_next_available_box_count,
    'isReplay', false
  );
end;
$$;

revoke all on function credit_renewal_time_boxes(text, text, integer)
from anon, authenticated;

revoke all on function credit_renewal_box_open_gold(text, text)
from anon, authenticated;

grant execute on function credit_renewal_time_boxes(text, text, integer)
to service_role;

grant execute on function credit_renewal_box_open_gold(text, text)
to service_role;

create or replace function get_current_kst_date()
returns date
language sql
stable
as $$
  select (now() at time zone 'Asia/Seoul')::date;
$$;

create or replace function get_renewal_attendance_month(
  p_anonymous_hash text,
  p_year integer,
  p_month integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user renewal_users;
  v_month_start date;
  v_month_end date;
  v_attended_dates text[];
begin
  if p_anonymous_hash is null or length(p_anonymous_hash) = 0 then
    return jsonb_build_object('type', 'failure', 'reason', 'invalidRequest');
  end if;

  if p_year is null or p_year < 2000 or p_year > 2100 then
    return jsonb_build_object('type', 'failure', 'reason', 'invalidRequest');
  end if;

  if p_month is null or p_month < 1 or p_month > 12 then
    return jsonb_build_object('type', 'failure', 'reason', 'invalidRequest');
  end if;

  perform get_or_create_renewal_user(p_anonymous_hash);

  select *
  into v_user
  from renewal_users
  where anonymous_hash = p_anonymous_hash;

  if v_user.status = 'blocked' then
    return jsonb_build_object('type', 'failure', 'reason', 'userBlocked');
  end if;

  if v_user.status = 'suspended' then
    return jsonb_build_object('type', 'failure', 'reason', 'userSuspended');
  end if;

  v_month_start := make_date(p_year, p_month, 1);
  v_month_end := (v_month_start + interval '1 month')::date;

  select coalesce(
    array_agg(to_char(attendance_date_kst, 'YYYY-MM-DD') order by attendance_date_kst),
    array[]::text[]
  )
  into v_attended_dates
  from attendance_records
  where anonymous_hash = p_anonymous_hash
    and attendance_date_kst >= v_month_start
    and attendance_date_kst < v_month_end;

  return jsonb_build_object(
    'type', 'success',
    'attendedDatesKst', v_attended_dates,
    'todayKst', to_char(get_current_kst_date(), 'YYYY-MM-DD')
  );
end;
$$;

create or replace function submit_renewal_attendance(
  p_anonymous_hash text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user renewal_users;
  v_existing_attendance attendance_records;
  v_existing_gold_ledger gold_ledger;
  v_attendance_date_kst date := get_current_kst_date();
  v_credit_amount constant integer := 1;
  v_max_gold_balance constant integer := 5000;
  v_next_gold_balance integer;
begin
  if p_anonymous_hash is null or length(p_anonymous_hash) = 0 then
    return jsonb_build_object('type', 'failure', 'reason', 'invalidRequest');
  end if;

  if p_idempotency_key is null or length(p_idempotency_key) = 0 then
    return jsonb_build_object('type', 'failure', 'reason', 'invalidRequest');
  end if;

  perform get_or_create_renewal_user(p_anonymous_hash);

  select *
  into v_user
  from renewal_users
  where anonymous_hash = p_anonymous_hash
  for update;

  select *
  into v_existing_attendance
  from attendance_records
  where anonymous_hash = p_anonymous_hash
    and idempotency_key = p_idempotency_key;

  if found then
    select *
    into v_existing_gold_ledger
    from gold_ledger
    where anonymous_hash = p_anonymous_hash
      and idempotency_key = p_idempotency_key
      and type = 'attendance_credit';

    return jsonb_build_object(
      'type', 'success',
      'idempotencyKey', p_idempotency_key,
      'attendanceDateKst', to_char(v_existing_attendance.attendance_date_kst, 'YYYY-MM-DD'),
      'creditedGold', coalesce(v_existing_gold_ledger.amount, v_credit_amount),
      'goldBalance',
      coalesce(
        (v_existing_gold_ledger.metadata->>'resultingGoldBalance')::integer,
        v_user.gold_balance
      ),
      'isReplay', true
    );
  end if;

  if v_user.status = 'blocked' then
    return jsonb_build_object('type', 'failure', 'reason', 'userBlocked');
  end if;

  if v_user.status = 'suspended' then
    return jsonb_build_object('type', 'failure', 'reason', 'userSuspended');
  end if;

  select *
  into v_existing_attendance
  from attendance_records
  where anonymous_hash = p_anonymous_hash
    and attendance_date_kst = v_attendance_date_kst
  for update;

  if found then
    return jsonb_build_object('type', 'failure', 'reason', 'alreadyAttended');
  end if;

  if v_user.gold_balance + v_credit_amount > v_max_gold_balance then
    return jsonb_build_object('type', 'failure', 'reason', 'goldLimitReached');
  end if;

  v_next_gold_balance := v_user.gold_balance + v_credit_amount;

  insert into gold_ledger (
    anonymous_hash,
    type,
    amount,
    idempotency_key,
    metadata
  )
  values (
    p_anonymous_hash,
    'attendance_credit',
    v_credit_amount,
    p_idempotency_key,
    jsonb_build_object(
      'attendanceDateKst',
      to_char(v_attendance_date_kst, 'YYYY-MM-DD'),
      'resultingGoldBalance',
      v_next_gold_balance
    )
  );

  insert into attendance_records (
    anonymous_hash,
    attendance_date_kst,
    idempotency_key
  )
  values (
    p_anonymous_hash,
    v_attendance_date_kst,
    p_idempotency_key
  );

  update renewal_users
  set gold_balance = v_next_gold_balance
  where anonymous_hash = p_anonymous_hash;

  return jsonb_build_object(
    'type', 'success',
    'idempotencyKey', p_idempotency_key,
    'attendanceDateKst', to_char(v_attendance_date_kst, 'YYYY-MM-DD'),
    'creditedGold', v_credit_amount,
    'goldBalance', v_next_gold_balance,
    'isReplay', false
  );
end;
$$;

revoke all on function get_renewal_attendance_month(text, integer, integer)
from anon, authenticated;

revoke all on function submit_renewal_attendance(text, text)
from anon, authenticated;

revoke all on function get_current_kst_date()
from anon, authenticated;

grant execute on function get_renewal_attendance_month(text, integer, integer)
to service_role;

grant execute on function submit_renewal_attendance(text, text)
to service_role;

grant execute on function get_current_kst_date()
to service_role;

create or replace function get_current_kst_date()
returns date
language sql
stable
as $$
  select (now() at time zone 'Asia/Seoul')::date;
$$;

create or replace function get_renewal_today_finalized_point(
  p_anonymous_hash text
)
returns integer
language sql
stable
as $$
  select coalesce(sum(point_amount), 0)::integer
  from conversions
  where anonymous_hash = p_anonymous_hash
    and status = 'finalized'
    and finalized_at is not null
    and (finalized_at at time zone 'Asia/Seoul')::date = get_current_kst_date();
$$;

create or replace function create_renewal_conversion(
  p_anonymous_hash text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user renewal_users;
  v_existing_conversion conversions;
  v_active_conversion conversions;
  v_today_reservation_count integer;
  v_today_converted_point integer;
  v_exchange_rate numeric(10, 4) := 1;
  v_remaining_daily_point integer;
  v_point_amount integer;
  v_gold_to_debit integer;
  v_next_gold_balance integer;
  v_conversion conversions;
begin
  if p_anonymous_hash is null or length(p_anonymous_hash) = 0 then
    return jsonb_build_object('type', 'failure', 'reason', 'invalidRequest');
  end if;

  if p_idempotency_key is null or length(p_idempotency_key) = 0 then
    return jsonb_build_object('type', 'failure', 'reason', 'invalidRequest');
  end if;

  perform get_or_create_renewal_user(p_anonymous_hash);

  select *
  into v_user
  from renewal_users
  where anonymous_hash = p_anonymous_hash
  for update;

  select *
  into v_existing_conversion
  from conversions
  where anonymous_hash = p_anonymous_hash
    and idempotency_key = p_idempotency_key;

  if found then
    if v_existing_conversion.status = 'pending' then
      return jsonb_build_object(
        'type', 'success',
        'conversionId', v_existing_conversion.conversion_id,
        'goldToDebit', v_existing_conversion.requested_gold,
        'pointAmount', v_existing_conversion.point_amount,
        'exchangeRateSnapshot', v_existing_conversion.exchange_rate_snapshot
      );
    end if;

    if v_existing_conversion.status = 'sdk_call_started' then
      return jsonb_build_object('type', 'failure', 'reason', 'pendingConversionExists');
    end if;

    return jsonb_build_object('type', 'failure', 'reason', 'conversionUnavailable');
  end if;

  if v_user.status = 'blocked' then
    return jsonb_build_object('type', 'failure', 'reason', 'userBlocked');
  end if;

  if v_user.status = 'suspended' then
    return jsonb_build_object('type', 'failure', 'reason', 'userSuspended');
  end if;

  select *
  into v_active_conversion
  from conversions
  where anonymous_hash = p_anonymous_hash
    and status in ('pending', 'sdk_call_started')
  for update;

  if found then
    return jsonb_build_object('type', 'failure', 'reason', 'pendingConversionExists');
  end if;

  select count(*)::integer
  into v_today_reservation_count
  from conversions
  where anonymous_hash = p_anonymous_hash
    and (created_at at time zone 'Asia/Seoul')::date = get_current_kst_date();

  if v_today_reservation_count >= 3 then
    return jsonb_build_object('type', 'failure', 'reason', 'reservationLimitReached');
  end if;

  v_today_converted_point := get_renewal_today_finalized_point(p_anonymous_hash);
  v_remaining_daily_point := greatest(0, 4000 - v_today_converted_point);

  if v_user.gold_balance <= 0 then
    return jsonb_build_object('type', 'failure', 'reason', 'emptyGold');
  end if;

  if v_remaining_daily_point <= 0 then
    return jsonb_build_object('type', 'failure', 'reason', 'dailyLimitReached');
  end if;

  v_point_amount := least(v_user.gold_balance, 4000, v_remaining_daily_point);

  if v_point_amount <= 0 then
    return jsonb_build_object('type', 'failure', 'reason', 'pointAmountTooSmall');
  end if;

  v_gold_to_debit := v_point_amount;
  v_next_gold_balance := v_user.gold_balance - v_gold_to_debit;

  insert into gold_ledger (
    anonymous_hash,
    type,
    amount,
    idempotency_key,
    metadata
  )
  values (
    p_anonymous_hash,
    'conversion_hold_debit',
    -abs(v_gold_to_debit),
    'conversion-hold:' || p_idempotency_key,
    jsonb_build_object(
      'pointAmount',
      v_point_amount,
      'resultingGoldBalance',
      v_next_gold_balance
    )
  );

  update renewal_users
  set gold_balance = v_next_gold_balance
  where anonymous_hash = p_anonymous_hash;

  insert into conversions (
    anonymous_hash,
    requested_gold,
    point_amount,
    exchange_rate_snapshot,
    status,
    idempotency_key,
    expires_at
  )
  values (
    p_anonymous_hash,
    v_gold_to_debit,
    v_point_amount,
    v_exchange_rate,
    'pending',
    p_idempotency_key,
    now() + interval '10 minutes'
  )
  returning *
  into v_conversion;

  return jsonb_build_object(
    'type', 'success',
    'conversionId', v_conversion.conversion_id,
    'goldToDebit', v_conversion.requested_gold,
    'pointAmount', v_conversion.point_amount,
    'exchangeRateSnapshot', v_conversion.exchange_rate_snapshot
  );
end;
$$;

create or replace function mark_renewal_conversion_sdk_call_started(
  p_anonymous_hash text,
  p_conversion_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversion conversions;
begin
  select *
  into v_conversion
  from conversions
  where conversion_id = p_conversion_id
  for update;

  if not found then
    return jsonb_build_object('type', 'failure', 'reason', 'conversionUnavailable');
  end if;

  if v_conversion.anonymous_hash <> p_anonymous_hash then
    return jsonb_build_object('type', 'failure', 'reason', 'invalidRequest');
  end if;

  if v_conversion.status = 'sdk_call_started' then
    return jsonb_build_object(
      'type', 'success',
      'conversionId', v_conversion.conversion_id,
      'goldToDebit', v_conversion.requested_gold,
      'pointAmount', v_conversion.point_amount,
      'exchangeRateSnapshot', v_conversion.exchange_rate_snapshot
    );
  end if;

  if v_conversion.status <> 'pending' then
    return jsonb_build_object('type', 'failure', 'reason', 'conversionUnavailable');
  end if;

  update conversions
  set
    status = 'sdk_call_started',
    status_updated_at = now()
  where conversion_id = p_conversion_id
  returning *
  into v_conversion;

  return jsonb_build_object(
    'type', 'success',
    'conversionId', v_conversion.conversion_id,
    'goldToDebit', v_conversion.requested_gold,
    'pointAmount', v_conversion.point_amount,
    'exchangeRateSnapshot', v_conversion.exchange_rate_snapshot
  );
end;
$$;

create or replace function finalize_renewal_conversion(
  p_anonymous_hash text,
  p_conversion_id uuid,
  p_toss_success_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversion conversions;
  v_existing_success_key_conversion conversions;
  v_user renewal_users;
  v_today_converted_point integer;
begin
  if p_toss_success_key is null or length(p_toss_success_key) = 0 then
    return jsonb_build_object('type', 'failure', 'reason', 'invalidRequest');
  end if;

  select *
  into v_conversion
  from conversions
  where conversion_id = p_conversion_id
  for update;

  if not found then
    return jsonb_build_object('type', 'failure', 'reason', 'conversionUnavailable');
  end if;

  if v_conversion.anonymous_hash <> p_anonymous_hash then
    return jsonb_build_object('type', 'failure', 'reason', 'invalidRequest');
  end if;

  if v_conversion.status = 'finalized' then
    select *
    into v_user
    from renewal_users
    where anonymous_hash = p_anonymous_hash;

    v_today_converted_point := get_renewal_today_finalized_point(p_anonymous_hash);

    return jsonb_build_object(
      'type', 'success',
      'goldBalance', v_user.gold_balance,
      'todayConvertedTossPoint', v_today_converted_point
    );
  end if;

  if v_conversion.status not in ('pending', 'sdk_call_started') then
    return jsonb_build_object('type', 'failure', 'reason', 'conversionUnavailable');
  end if;

  select *
  into v_existing_success_key_conversion
  from conversions
  where toss_success_key = p_toss_success_key;

  if found and v_existing_success_key_conversion.conversion_id <> p_conversion_id then
    update conversions
    set
      status = 'manual_review',
      status_updated_at = now()
    where conversion_id = p_conversion_id;

    return jsonb_build_object('type', 'failure', 'reason', 'serverError');
  end if;

  update conversions
  set
    status = 'finalized',
    toss_success_key = p_toss_success_key,
    status_updated_at = now(),
    finalized_at = now()
  where conversion_id = p_conversion_id
  returning *
  into v_conversion;

  update renewal_users
  set total_converted_toss_point = total_converted_toss_point + v_conversion.point_amount
  where anonymous_hash = p_anonymous_hash
  returning *
  into v_user;

  v_today_converted_point := get_renewal_today_finalized_point(p_anonymous_hash);

  return jsonb_build_object(
    'type', 'success',
    'goldBalance', v_user.gold_balance,
    'todayConvertedTossPoint', v_today_converted_point
  );
end;
$$;

create or replace function cancel_renewal_conversion(
  p_anonymous_hash text,
  p_conversion_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversion conversions;
  v_existing_release gold_ledger;
  v_user renewal_users;
  v_next_gold_balance integer;
  v_next_status text;
begin
  if p_reason not in (
    'sdkClearFailedBeforeReward',
    'userCancelledBeforeSdkCallStarted',
    'expiredBeforeSdkCallStarted'
  ) then
    return jsonb_build_object('type', 'failure', 'reason', 'invalidRequest');
  end if;

  select *
  into v_conversion
  from conversions
  where conversion_id = p_conversion_id
  for update;

  if not found then
    return jsonb_build_object('type', 'failure', 'reason', 'conversionUnavailable');
  end if;

  if v_conversion.anonymous_hash <> p_anonymous_hash then
    return jsonb_build_object('type', 'failure', 'reason', 'invalidRequest');
  end if;

  if v_conversion.status in ('cancelled', 'expired') then
    return jsonb_build_object('type', 'success');
  end if;

  if v_conversion.status = 'finalized' then
    return jsonb_build_object('type', 'failure', 'reason', 'conversionUnavailable');
  end if;

  if p_reason in ('userCancelledBeforeSdkCallStarted', 'expiredBeforeSdkCallStarted')
    and v_conversion.status <> 'pending' then
    return jsonb_build_object('type', 'failure', 'reason', 'conversionUnavailable');
  end if;

  select *
  into v_existing_release
  from gold_ledger
  where anonymous_hash = p_anonymous_hash
    and idempotency_key = 'conversion-hold-release:' || p_conversion_id::text;

  if not found then
    select *
    into v_user
    from renewal_users
    where anonymous_hash = p_anonymous_hash
    for update;

    v_next_gold_balance := v_user.gold_balance + v_conversion.requested_gold;

    insert into gold_ledger (
      anonymous_hash,
      type,
      amount,
      idempotency_key,
      metadata
    )
    values (
      p_anonymous_hash,
      'conversion_hold_release',
      abs(v_conversion.requested_gold),
      'conversion-hold-release:' || p_conversion_id::text,
      jsonb_build_object(
        'conversionId',
        p_conversion_id,
        'reason',
        p_reason,
        'resultingGoldBalance',
        v_next_gold_balance
      )
    );

    update renewal_users
    set gold_balance = v_next_gold_balance
    where anonymous_hash = p_anonymous_hash;
  end if;

  v_next_status := case
    when p_reason = 'expiredBeforeSdkCallStarted' then 'expired'
    else 'cancelled'
  end;

  update conversions
  set
    status = v_next_status,
    status_updated_at = now()
  where conversion_id = p_conversion_id;

  return jsonb_build_object('type', 'success');
end;
$$;

revoke all on function get_current_kst_date() from anon, authenticated;
revoke all on function get_renewal_today_finalized_point(text) from anon, authenticated;
revoke all on function create_renewal_conversion(text, text) from anon, authenticated;
revoke all on function mark_renewal_conversion_sdk_call_started(text, uuid) from anon, authenticated;
revoke all on function finalize_renewal_conversion(text, uuid, text) from anon, authenticated;
revoke all on function cancel_renewal_conversion(text, uuid, text) from anon, authenticated;

grant execute on function get_current_kst_date() to service_role;
grant execute on function get_renewal_today_finalized_point(text) to service_role;
grant execute on function create_renewal_conversion(text, text) to service_role;
grant execute on function mark_renewal_conversion_sdk_call_started(text, uuid) to service_role;
grant execute on function finalize_renewal_conversion(text, uuid, text) to service_role;
grant execute on function cancel_renewal_conversion(text, uuid, text) to service_role;

create or replace function mark_renewal_conversion_manual_review(
  p_anonymous_hash text,
  p_conversion_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversion conversions;
begin
  if p_anonymous_hash is null or length(p_anonymous_hash) = 0 then
    return jsonb_build_object('type', 'failure', 'reason', 'invalidRequest');
  end if;

  if p_conversion_id is null then
    return jsonb_build_object('type', 'failure', 'reason', 'invalidRequest');
  end if;

  if p_reason not in (
    'sdkCallStartedWithoutSuccessKey',
    'ambiguousSdkFailureAfterSdkStarted',
    'successKeyStorageFailed'
  ) then
    return jsonb_build_object('type', 'failure', 'reason', 'invalidRequest');
  end if;

  select *
  into v_conversion
  from conversions
  where conversion_id = p_conversion_id
  for update;

  if not found then
    return jsonb_build_object('type', 'failure', 'reason', 'conversionUnavailable');
  end if;

  if v_conversion.anonymous_hash <> p_anonymous_hash then
    return jsonb_build_object('type', 'failure', 'reason', 'invalidRequest');
  end if;

  if v_conversion.status = 'manual_review' then
    return jsonb_build_object('type', 'success');
  end if;

  if v_conversion.status <> 'sdk_call_started' then
    return jsonb_build_object('type', 'failure', 'reason', 'conversionUnavailable');
  end if;

  update conversions
  set
    status = 'manual_review',
    status_updated_at = now()
  where conversion_id = p_conversion_id;

  return jsonb_build_object('type', 'success');
end;
$$;

revoke all on function mark_renewal_conversion_manual_review(text, uuid, text)
from anon, authenticated;

grant execute on function mark_renewal_conversion_manual_review(text, uuid, text)
to service_role;
