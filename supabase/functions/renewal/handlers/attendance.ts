import {
  createFailureResponse,
  createJsonResponse,
  readJsonBody,
} from '../../_shared/http.ts';
import { createSupabaseAdminClient } from '../../_shared/supabaseAdmin.ts';
import { parseAttendanceMonthRequest, parseRenewalRequestBase } from '../../_shared/request.ts';
import { isFailureResponse, isRecord } from '../../_shared/db.ts';
import type {
  AttendanceMonthResponse,
  SubmitAttendanceResponse,
} from '../../_shared/renewalTypes.ts';

export async function handleAttendanceMonth(request: Request): Promise<Response> {
  const requestBody = await readJsonBody(request);
  const attendanceRequest = parseAttendanceMonthRequest(requestBody);

  if (attendanceRequest == null) {
    return createFailureResponse('invalidRequest');
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc('get_renewal_attendance_month', {
      p_anonymous_hash: attendanceRequest.anonymousHash,
      p_year: attendanceRequest.year,
      p_month: attendanceRequest.month,
    });

    if (error != null) {
      throw error;
    }

    if (!isAttendanceMonthResponse(data)) {
      return createFailureResponse('serverError');
    }

    return createJsonResponse(data);
  } catch (error) {
    console.error('renewal attendance month failed', error);
    return createFailureResponse('serverError');
  }
}

export async function handleCreditAttendanceGold(request: Request): Promise<Response> {
  const requestBody = await readJsonBody(request);
  const requestBase = parseRenewalRequestBase(requestBody);

  if (requestBase == null) {
    return createFailureResponse('invalidRequest');
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc('submit_renewal_attendance', {
      p_anonymous_hash: requestBase.anonymousHash,
      p_idempotency_key: requestBase.idempotencyKey,
    });

    if (error != null) {
      throw error;
    }

    if (!isSubmitAttendanceResponse(data)) {
      return createFailureResponse('serverError');
    }

    return createJsonResponse(data);
  } catch (error) {
    console.error('renewal credit attendance gold failed', error);
    return createFailureResponse('serverError');
  }
}

function isAttendanceMonthResponse(value: unknown): value is AttendanceMonthResponse {
  if (!isRecord(value)) {
    return false;
  }

  if (isFailureResponse(value)) {
    return typeof value.reason === 'string';
  }

  return (
    value.type === 'success' &&
    Array.isArray(value.attendedDatesKst) &&
    typeof value.todayKst === 'string'
  );
}

function isSubmitAttendanceResponse(value: unknown): value is SubmitAttendanceResponse {
  if (!isRecord(value)) {
    return false;
  }

  if (isFailureResponse(value)) {
    return typeof value.reason === 'string';
  }

  return (
    value.type === 'success' &&
    typeof value.idempotencyKey === 'string' &&
    typeof value.attendanceDateKst === 'string' &&
    typeof value.creditedGold === 'number' &&
    typeof value.goldBalance === 'number' &&
    typeof value.isReplay === 'boolean'
  );
}
