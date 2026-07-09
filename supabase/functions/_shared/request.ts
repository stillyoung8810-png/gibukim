import type {
  AttendanceMonthRequest,
  BootstrapRequest,
  CancelConversionReason,
  CancelConversionRequest,
  CampaignDetailRequest,
  ConversionIdRequest,
  CreditBoxesRequest,
  DonateRequest,
  FinalizeConversionRequest,
  ManualReviewConversionReason,
  ManualReviewConversionRequest,
  AnonymousHashRequest,
  RenewalRequestBase,
} from './renewalTypes.ts';

export function parseAttendanceMonthRequest(input: unknown): AttendanceMonthRequest | null {
  if (!isRecord(input)) {
    return null;
  }

  if (typeof input.anonymousHash !== 'string' || input.anonymousHash === '') {
    return null;
  }

  if (typeof input.year !== 'number' || !Number.isInteger(input.year) || input.year < 2000 || input.year > 2100) {
    return null;
  }

  if (typeof input.month !== 'number' || !Number.isInteger(input.month) || input.month < 1 || input.month > 12) {
    return null;
  }

  return {
    anonymousHash: input.anonymousHash,
    year: input.year,
    month: input.month,
  };
}

export function parseRenewalRequestBase(input: unknown): RenewalRequestBase | null {
  if (!isRecord(input)) {
    return null;
  }

  if (typeof input.anonymousHash !== 'string' || input.anonymousHash === '') {
    return null;
  }

  if (typeof input.idempotencyKey !== 'string' || input.idempotencyKey === '') {
    return null;
  }

  if (typeof input.clientSentAtMs !== 'number' || !Number.isFinite(input.clientSentAtMs)) {
    return null;
  }

  return {
    anonymousHash: input.anonymousHash,
    idempotencyKey: input.idempotencyKey,
    clientSentAtMs: input.clientSentAtMs,
  };
}

export function parseBootstrapRequest(input: unknown): BootstrapRequest | null {
  if (!isRecord(input)) {
    return null;
  }

  const requestBase = parseRenewalRequestBase(input);

  if (requestBase == null) {
    return null;
  }

  if (input.initialAvailableBoxCount == null) {
    return {
      ...requestBase,
      initialAvailableBoxCount: 0,
    };
  }

  if (
    typeof input.initialAvailableBoxCount !== 'number' ||
    !Number.isInteger(input.initialAvailableBoxCount) ||
    input.initialAvailableBoxCount < 0
  ) {
    return null;
  }

  return {
    ...requestBase,
    initialAvailableBoxCount: input.initialAvailableBoxCount,
  };
}

export function parseCreditBoxesRequest(input: unknown): CreditBoxesRequest | null {
  if (!isRecord(input)) {
    return null;
  }

  const requestBase = parseRenewalRequestBase(input);

  if (requestBase == null) {
    return null;
  }

  if (
    typeof input.earnedBoxCount !== 'number' ||
    !Number.isInteger(input.earnedBoxCount) ||
    input.earnedBoxCount <= 0
  ) {
    return null;
  }

  return {
    ...requestBase,
    earnedBoxCount: input.earnedBoxCount,
  };
}

export function parseConversionIdRequest(input: unknown): ConversionIdRequest | null {
  if (!isRecord(input)) {
    return null;
  }

  const requestBase = parseRenewalRequestBase(input);

  if (requestBase == null) {
    return null;
  }

  if (typeof input.conversionId !== 'string' || input.conversionId === '') {
    return null;
  }

  return {
    ...requestBase,
    conversionId: input.conversionId,
  };
}

export function parseFinalizeConversionRequest(input: unknown): FinalizeConversionRequest | null {
  if (!isRecord(input)) {
    return null;
  }

  const conversionRequest = parseConversionIdRequest(input);

  if (conversionRequest == null) {
    return null;
  }

  if (typeof input.tossSuccessKey !== 'string' || input.tossSuccessKey === '') {
    return null;
  }

  return {
    ...conversionRequest,
    tossSuccessKey: input.tossSuccessKey,
  };
}

export function parseCancelConversionRequest(input: unknown): CancelConversionRequest | null {
  if (!isRecord(input)) {
    return null;
  }

  const conversionRequest = parseConversionIdRequest(input);

  if (conversionRequest == null) {
    return null;
  }

  if (!isCancelConversionReason(input.reason)) {
    return null;
  }

  return {
    ...conversionRequest,
    reason: input.reason,
  };
}

export function parseManualReviewConversionRequest(input: unknown): ManualReviewConversionRequest | null {
  if (!isRecord(input)) {
    return null;
  }

  const conversionRequest = parseConversionIdRequest(input);

  if (conversionRequest == null) {
    return null;
  }

  if (!isManualReviewConversionReason(input.reason)) {
    return null;
  }

  return {
    ...conversionRequest,
    reason: input.reason,
  };
}

export function parseDonateRequest(input: unknown): DonateRequest | null {
  if (!isRecord(input)) {
    return null;
  }

  const requestBase = parseRenewalRequestBase(input);

  if (requestBase == null) {
    return null;
  }

  if (typeof input.nickname !== 'string') {
    return null;
  }

  const nickname = input.nickname.trim();

  if (nickname.length < 1 || nickname.length > 10) {
    return null;
  }

  return {
    ...requestBase,
    nickname,
  };
}

export function parseAnonymousHashRequest(input: unknown): AnonymousHashRequest | null {
  if (!isRecord(input)) {
    return null;
  }

  if (typeof input.anonymousHash !== 'string' || input.anonymousHash === '') {
    return null;
  }

  return { anonymousHash: input.anonymousHash };
}

export function parseCampaignDetailRequest(input: unknown): CampaignDetailRequest | null {
  if (!isRecord(input)) {
    return null;
  }

  if (typeof input.anonymousHash !== 'string' || input.anonymousHash === '') {
    return null;
  }

  if (typeof input.campaignId !== 'string' || input.campaignId === '') {
    return null;
  }

  return {
    anonymousHash: input.anonymousHash,
    campaignId: input.campaignId,
  };
}

function isCancelConversionReason(value: unknown): value is CancelConversionReason {
  return (
    value === 'sdkClearFailedBeforeReward' ||
    value === 'userCancelledBeforeSdkCallStarted' ||
    value === 'expiredBeforeSdkCallStarted'
  );
}

function isManualReviewConversionReason(value: unknown): value is ManualReviewConversionReason {
  return (
    value === 'sdkCallStartedWithoutSuccessKey' ||
    value === 'ambiguousSdkFailureAfterSdkStarted' ||
    value === 'successKeyStorageFailed'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}
