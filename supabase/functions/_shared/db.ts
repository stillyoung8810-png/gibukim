import type { SupabaseClient } from 'npm:@supabase/supabase-js';

import { getKstDayUtcRange } from './kst.ts';
import type {
  ActiveCampaignSnapshot,
  ActiveConversionSnapshot,
  RenewalApiFailureReason,
} from './renewalTypes.ts';

export type RenewalUserRow = {
  readonly anonymous_hash: string;
  readonly status: 'active' | 'blocked' | 'suspended';
  readonly available_box_count: number;
  readonly gold_balance: number;
  readonly total_converted_toss_point: number;
};

export async function getOrCreateRenewalUser(
  supabase: SupabaseClient,
  anonymousHash: string,
  initialAvailableBoxCount = 0,
): Promise<RenewalUserRow | null> {
  const { data, error } = await supabase.rpc('get_or_create_renewal_user_with_initial_boxes', {
    p_anonymous_hash: anonymousHash,
    p_initial_available_box_count: initialAvailableBoxCount,
  });

  if (error != null) {
    throw error;
  }

  return normalizeUserRow(data);
}

export async function getTodayConvertedTossPoint(params: {
  readonly supabase: SupabaseClient;
  readonly anonymousHash: string;
  readonly todayKst: string;
}): Promise<number> {
  const range = getKstDayUtcRange(params.todayKst);
  const { data, error } = await params.supabase
    .from('conversions')
    .select('point_amount')
    .eq('anonymous_hash', params.anonymousHash)
    .eq('status', 'finalized')
    .gte('finalized_at', range.startIso)
    .lt('finalized_at', range.endIso);

  if (error != null) {
    throw error;
  }

  if (!Array.isArray(data)) {
    return 0;
  }

  return data.reduce((sum, row) => {
    if (!isRecord(row) || typeof row.point_amount !== 'number') {
      return sum;
    }
    return sum + row.point_amount;
  }, 0);
}

export async function getTodayDonatedGold(params: {
  readonly supabase: SupabaseClient;
  readonly anonymousHash: string;
  readonly todayKst: string;
}): Promise<number> {
  const range = getKstDayUtcRange(params.todayKst);
  const { data, error } = await params.supabase
    .from('donation_participants')
    .select('gold_amount')
    .eq('anonymous_hash', params.anonymousHash)
    .gte('donated_at', range.startIso)
    .lt('donated_at', range.endIso);

  if (error != null) {
    throw error;
  }

  if (!Array.isArray(data)) {
    return 0;
  }

  return data.reduce((sum, row) => {
    if (!isRecord(row) || typeof row.gold_amount !== 'number') {
      return sum;
    }
    return sum + row.gold_amount;
  }, 0);
}

export async function getActiveConversionSnapshot(
  supabase: SupabaseClient,
  anonymousHash: string,
): Promise<ActiveConversionSnapshot | null> {
  const { data, error } = await supabase
    .from('conversions')
    .select('conversion_id, status, point_amount, expires_at, status_updated_at')
    .eq('anonymous_hash', anonymousHash)
    .in('status', ['pending', 'sdk_call_started'])
    .maybeSingle();

  if (error != null) {
    throw error;
  }

  return normalizeActiveConversionRow(data);
}

export async function getActiveCampaignSnapshot(
  supabase: SupabaseClient,
): Promise<ActiveCampaignSnapshot | null> {
  const { data, error } = await supabase
    .from('donation_campaigns')
    .select('id, title, goal_gold, current_gold, status')
    .eq('is_active', true)
    .maybeSingle();

  if (error != null) {
    throw error;
  }

  return normalizeActiveCampaignRow(data);
}

export function isFailureResponse(value: Record<string, unknown>): value is {
  readonly type: 'failure';
  readonly reason: RenewalApiFailureReason;
} {
  return value.type === 'failure' && typeof value.reason === 'string';
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeUserRow(value: unknown): RenewalUserRow | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.anonymous_hash !== 'string' ||
    typeof value.available_box_count !== 'number' ||
    typeof value.gold_balance !== 'number' ||
    typeof value.total_converted_toss_point !== 'number'
  ) {
    return null;
  }

  if (value.status !== 'active' && value.status !== 'blocked' && value.status !== 'suspended') {
    return null;
  }

  return {
    anonymous_hash: value.anonymous_hash,
    status: value.status,
    available_box_count: value.available_box_count,
    gold_balance: value.gold_balance,
    total_converted_toss_point: value.total_converted_toss_point,
  };
}

function normalizeActiveConversionRow(value: unknown): ActiveConversionSnapshot | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.conversion_id !== 'string' ||
    typeof value.point_amount !== 'number' ||
    typeof value.expires_at !== 'string' ||
    typeof value.status_updated_at !== 'string'
  ) {
    return null;
  }

  if (value.status !== 'pending' && value.status !== 'sdk_call_started') {
    return null;
  }

  return {
    conversionId: value.conversion_id,
    status: value.status,
    pointAmount: value.point_amount,
    expiresAtMs: new Date(value.expires_at).getTime(),
    statusUpdatedAtMs: new Date(value.status_updated_at).getTime(),
  };
}

function normalizeActiveCampaignRow(value: unknown): ActiveCampaignSnapshot | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.id !== 'string' ||
    typeof value.title !== 'string' ||
    typeof value.goal_gold !== 'number' ||
    typeof value.current_gold !== 'number'
  ) {
    return null;
  }

  if (value.status !== 'active' && value.status !== 'placeholder_active') {
    return null;
  }

  return {
    id: value.id,
    title: value.title,
    goalGold: value.goal_gold,
    currentGold: value.current_gold,
    status: value.status,
  };
}
