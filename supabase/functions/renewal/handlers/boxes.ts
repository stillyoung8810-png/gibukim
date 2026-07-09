import {
  createFailureResponse,
  createJsonResponse,
  readJsonBody,
} from '../../_shared/http.ts';
import { createSupabaseAdminClient } from '../../_shared/supabaseAdmin.ts';
import { parseCreditBoxesRequest, parseRenewalRequestBase } from '../../_shared/request.ts';
import { isFailureResponse, isRecord } from '../../_shared/db.ts';
import type {
  CreditBoxOpenGoldResponse,
  CreditBoxesResponse,
  RenewalApiFailureReason,
} from '../../_shared/renewalTypes.ts';

export async function handleCreditBoxes(request: Request): Promise<Response> {
  const requestBody = await readJsonBody(request);
  const creditRequest = parseCreditBoxesRequest(requestBody);

  if (creditRequest == null) {
    return createFailureResponse('invalidRequest');
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc('credit_renewal_time_boxes', {
      p_anonymous_hash: creditRequest.anonymousHash,
      p_idempotency_key: creditRequest.idempotencyKey,
      p_earned_box_count: creditRequest.earnedBoxCount,
    });

    if (error != null) {
      throw error;
    }

    if (!isCreditBoxesResponse(data)) {
      return createFailureResponse('serverError');
    }

    return createJsonResponse(data);
  } catch (error) {
    console.error('renewal credit boxes failed', error);
    return createFailureResponse('serverError');
  }
}

export async function handleCreditBoxOpenGold(request: Request): Promise<Response> {
  const requestBody = await readJsonBody(request);
  const requestBase = parseRenewalRequestBase(requestBody);

  if (requestBase == null) {
    return createFailureResponse('invalidRequest');
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc('credit_renewal_box_open_gold', {
      p_anonymous_hash: requestBase.anonymousHash,
      p_idempotency_key: requestBase.idempotencyKey,
    });

    if (error != null) {
      throw error;
    }

    if (!isCreditBoxOpenGoldResponse(data)) {
      return createFailureResponse('serverError');
    }

    return createJsonResponse(data);
  } catch (error) {
    console.error('renewal credit box open gold failed', error);
    return createFailureResponse('serverError');
  }
}

function isCreditBoxesResponse(value: unknown): value is CreditBoxesResponse {
  if (!isRecord(value)) {
    return false;
  }

  if (isFailureResponse(value)) {
    return isRenewalApiFailureReason(value.reason);
  }

  return (
    value.type === 'success' &&
    typeof value.availableBoxCount === 'number' &&
    typeof value.isReplay === 'boolean'
  );
}

function isCreditBoxOpenGoldResponse(value: unknown): value is CreditBoxOpenGoldResponse {
  if (!isRecord(value)) {
    return false;
  }

  if (isFailureResponse(value)) {
    return isRenewalApiFailureReason(value.reason);
  }

  return (
    value.type === 'success' &&
    typeof value.idempotencyKey === 'string' &&
    typeof value.creditedGold === 'number' &&
    typeof value.goldBalance === 'number' &&
    typeof value.availableBoxCount === 'number' &&
    typeof value.isReplay === 'boolean'
  );
}

function isRenewalApiFailureReason(value: unknown): value is RenewalApiFailureReason {
  return typeof value === 'string';
}
