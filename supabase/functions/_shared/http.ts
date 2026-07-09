import type { RenewalApiFailureReason } from './renewalTypes.ts';

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-renewal-ops-token, x-renewal-cron-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
} as const;

export function createJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

export function createFailureResponse(reason: RenewalApiFailureReason, status = 200): Response {
  return createJsonResponse({ type: 'failure', reason }, status);
}

export function createOptionsResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function readJsonBody(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function isPostRequest(request: Request): boolean {
  return request.method.toUpperCase() === 'POST';
}

export function isOptionsRequest(request: Request): boolean {
  return request.method.toUpperCase() === 'OPTIONS';
}
