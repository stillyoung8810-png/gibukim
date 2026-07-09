import {
  createFailureResponse,
  createJsonResponse,
  readJsonBody,
} from '../../_shared/http.ts';
import { createSupabaseAdminClient } from '../../_shared/supabaseAdmin.ts';
import {
  parseCancelConversionRequest,
  parseConversionIdRequest,
  parseFinalizeConversionRequest,
  parseManualReviewConversionRequest,
  parseRenewalRequestBase,
} from '../../_shared/request.ts';
import { isFailureResponse, isRecord } from '../../_shared/db.ts';
import type {
  CancelConversionResponse,
  CreateConversionResponse,
  FinalizeConversionResponse,
  ManualReviewConversionResponse,
} from '../../_shared/renewalTypes.ts';

export async function handleCreateConversion(request: Request): Promise<Response> {
  const requestBody = await readJsonBody(request);
  const requestBase = parseRenewalRequestBase(requestBody);

  if (requestBase == null) {
    return createFailureResponse('invalidRequest');
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc('create_renewal_conversion', {
      p_anonymous_hash: requestBase.anonymousHash,
      p_idempotency_key: requestBase.idempotencyKey,
    });

    if (error != null) {
      throw error;
    }

    if (!isCreateConversionResponse(data)) {
      return createFailureResponse('serverError');
    }

    return createJsonResponse(data);
  } catch (error) {
    console.error('renewal create conversion failed', error);
    return createFailureResponse('serverError');
  }
}

export async function handleMarkConversionSdkCallStarted(request: Request): Promise<Response> {
  const requestBody = await readJsonBody(request);
  const conversionRequest = parseConversionIdRequest(requestBody);

  if (conversionRequest == null) {
    return createFailureResponse('invalidRequest');
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc('mark_renewal_conversion_sdk_call_started', {
      p_anonymous_hash: conversionRequest.anonymousHash,
      p_conversion_id: conversionRequest.conversionId,
    });

    if (error != null) {
      throw error;
    }

    if (!isCreateConversionResponse(data)) {
      return createFailureResponse('serverError');
    }

    return createJsonResponse(data);
  } catch (error) {
    console.error('renewal mark conversion sdk started failed', error);
    return createFailureResponse('serverError');
  }
}

export async function handleFinalizeConversion(request: Request): Promise<Response> {
  const requestBody = await readJsonBody(request);
  const finalizeRequest = parseFinalizeConversionRequest(requestBody);

  if (finalizeRequest == null) {
    return createFailureResponse('invalidRequest');
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc('finalize_renewal_conversion', {
      p_anonymous_hash: finalizeRequest.anonymousHash,
      p_conversion_id: finalizeRequest.conversionId,
      p_toss_success_key: finalizeRequest.tossSuccessKey,
    });

    if (error != null) {
      throw error;
    }

    if (!isFinalizeConversionResponse(data)) {
      return createFailureResponse('serverError');
    }

    return createJsonResponse(data);
  } catch (error) {
    console.error('renewal finalize conversion failed', error);
    return createFailureResponse('serverError');
  }
}

export async function handleCancelConversion(request: Request): Promise<Response> {
  const requestBody = await readJsonBody(request);
  const cancelRequest = parseCancelConversionRequest(requestBody);

  if (cancelRequest == null) {
    return createFailureResponse('invalidRequest');
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc('cancel_renewal_conversion', {
      p_anonymous_hash: cancelRequest.anonymousHash,
      p_conversion_id: cancelRequest.conversionId,
      p_reason: cancelRequest.reason,
    });

    if (error != null) {
      throw error;
    }

    if (!isCancelConversionResponse(data)) {
      return createFailureResponse('serverError');
    }

    return createJsonResponse(data);
  } catch (error) {
    console.error('renewal cancel conversion failed', error);
    return createFailureResponse('serverError');
  }
}

export async function handleMarkConversionManualReview(request: Request): Promise<Response> {
  const requestBody = await readJsonBody(request);
  const manualReviewRequest = parseManualReviewConversionRequest(requestBody);

  if (manualReviewRequest == null) {
    return createFailureResponse('invalidRequest');
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc('mark_renewal_conversion_manual_review', {
      p_anonymous_hash: manualReviewRequest.anonymousHash,
      p_conversion_id: manualReviewRequest.conversionId,
      p_reason: manualReviewRequest.reason,
    });

    if (error != null) {
      throw error;
    }

    if (!isManualReviewConversionResponse(data)) {
      return createFailureResponse('serverError');
    }

    return createJsonResponse(data);
  } catch (error) {
    console.error('renewal mark conversion manual review failed', error);
    return createFailureResponse('serverError');
  }
}

function isCreateConversionResponse(value: unknown): value is CreateConversionResponse {
  if (!isRecord(value)) {
    return false;
  }

  if (isFailureResponse(value)) {
    return typeof value.reason === 'string';
  }

  return (
    value.type === 'success' &&
    typeof value.conversionId === 'string' &&
    typeof value.goldToDebit === 'number' &&
    typeof value.pointAmount === 'number' &&
    typeof value.exchangeRateSnapshot === 'number'
  );
}

function isFinalizeConversionResponse(value: unknown): value is FinalizeConversionResponse {
  if (!isRecord(value)) {
    return false;
  }

  if (isFailureResponse(value)) {
    return typeof value.reason === 'string';
  }

  return (
    value.type === 'success' &&
    typeof value.goldBalance === 'number' &&
    typeof value.todayConvertedTossPoint === 'number'
  );
}

function isCancelConversionResponse(value: unknown): value is CancelConversionResponse {
  if (!isRecord(value)) {
    return false;
  }

  if (isFailureResponse(value)) {
    return typeof value.reason === 'string';
  }

  return value.type === 'success';
}

function isManualReviewConversionResponse(value: unknown): value is ManualReviewConversionResponse {
  if (!isRecord(value)) {
    return false;
  }

  if (isFailureResponse(value)) {
    return typeof value.reason === 'string';
  }

  return value.type === 'success';
}
