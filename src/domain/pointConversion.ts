import type {
  ActiveConversionSnapshot,
  ApiFailureReason,
} from '../api/renewalApiClient';
import {
  createCancelConversionIdempotencyKey,
  createConversionReservationIdempotencyKey,
  createConversionSdkStartedIdempotencyKey,
  createFinalizeConversionIdempotencyKey,
  createManualReviewConversionIdempotencyKey,
  fetchCancelConversion,
  fetchCreateConversion,
  fetchFinalizeConversion,
  fetchMarkConversionManualReview,
  fetchMarkConversionSdkStarted,
} from '../api/renewalApiClient';
import { renewalApiConfig } from '../api/renewalApiConfig';
import {
  canReleaseHoldAfterGrantFailure,
  type TossPointPromotionGateway,
} from '../adapters/tossPointPromotionGateway';
import { CONVERSION_POLICY, conversionMessages } from '../constants/conversionMessages';
import {
  assertPendingFinalizeStorageWritable,
  clearPendingFinalizeRecord,
  readPendingFinalizeRecord,
  writePendingFinalizeRecord,
} from '../storage/pendingConversionStorage';
import type { ActiveConversion } from '../types/appState';

export type ConversionFlowResult = {
  readonly bannerMessage: string;
  readonly goldBalance?: number;
  readonly todayConvertedTossPoint?: number;
  readonly activeConversion?: ActiveConversion | null;
  readonly serverNowMs?: number;
};

export function toActiveConversion(
  snapshot: ActiveConversionSnapshot | null,
): ActiveConversion | null {
  if (snapshot == null) {
    return null;
  }

  return {
    conversionId: snapshot.conversionId,
    status: snapshot.status,
    pointAmount: snapshot.pointAmount,
    expiresAtMs: snapshot.expiresAtMs,
    statusUpdatedAtMs: snapshot.statusUpdatedAtMs,
  };
}

export function getConversionFailureMessage(reason: ApiFailureReason): string {
  switch (reason) {
    case 'emptyGold':
      return conversionMessages.emptyGold;
    case 'pointAmountTooSmall':
      return conversionMessages.pointAmountTooSmall;
    case 'dailyLimitReached':
      return conversionMessages.dailyLimitReached;
    case 'reservationLimitReached':
      return conversionMessages.reservationLimitReached;
    case 'pendingConversionExists':
      return conversionMessages.pendingExists;
    case 'rateLimited':
      return conversionMessages.rateLimited;
    case 'conversionUnavailable':
      return conversionMessages.unavailable;
    case 'invalidRequest':
      return conversionMessages.invalidRequest;
    case 'invalidExchangeRate':
    case 'invalidFinancialArgs':
      return conversionMessages.invalidFinancialArgs;
    case 'manualReviewRequired':
      return conversionMessages.manualReviewRequired;
    case 'userBlocked':
      return conversionMessages.userBlocked;
    case 'userSuspended':
      return conversionMessages.userSuspended;
    case 'unconfigured':
      return conversionMessages.unconfigured;
    case 'serverError':
    case 'network':
    case 'invalidResponse':
      return conversionMessages.networkFailed;
    default:
      return conversionMessages.networkFailed;
  }
}

function isPendingConversionExpired(
  activeConversion: ActiveConversion,
  serverNowMs: number,
): boolean {
  return activeConversion.status === 'pending' && serverNowMs >= activeConversion.expiresAtMs;
}

function isSdkStartedConversionStale(
  activeConversion: ActiveConversion,
  serverNowMs: number,
): boolean {
  return (
    activeConversion.status === 'sdk_call_started' &&
    serverNowMs - activeConversion.statusUpdatedAtMs >= CONVERSION_POLICY.sdkStartedManualReviewAfterMs
  );
}

export async function executePendingFinalize(
  anonymousHash: string,
): Promise<ConversionFlowResult | null> {
  const pendingRecord = await readPendingFinalizeRecord();

  if (pendingRecord == null || pendingRecord.anonymousHash !== anonymousHash) {
    return null;
  }

  const finalizeResult = await fetchFinalizeConversion({
    config: renewalApiConfig,
    anonymousHash: pendingRecord.anonymousHash,
    conversionId: pendingRecord.conversionId,
    tossSuccessKey: pendingRecord.tossSuccessKey,
    idempotencyKey: createFinalizeConversionIdempotencyKey(pendingRecord.conversionId),
    clientSentAtMs: Date.now(),
  });

  if (finalizeResult.type === 'failure') {
    return { bannerMessage: getConversionFailureMessage(finalizeResult.reason) };
  }

  await clearPendingFinalizeRecord();

  return {
    bannerMessage: conversionMessages.completed,
    goldBalance: finalizeResult.goldBalance,
    todayConvertedTossPoint: finalizeResult.todayConvertedTossPoint,
    activeConversion: null,
  };
}

export async function executeActiveConversionRecovery(params: {
  readonly anonymousHash: string;
  readonly activeConversion: ActiveConversion | null;
  readonly serverNowMs: number;
}): Promise<ConversionFlowResult | null> {
  const pendingResult = await executePendingFinalize(params.anonymousHash);
  if (pendingResult != null) {
    return pendingResult;
  }

  const activeConversion = params.activeConversion;
  if (activeConversion == null) {
    return null;
  }

  if (isPendingConversionExpired(activeConversion, params.serverNowMs)) {
    const cancelResult = await fetchCancelConversion({
      config: renewalApiConfig,
      anonymousHash: params.anonymousHash,
      conversionId: activeConversion.conversionId,
      reason: 'expiredBeforeSdkCallStarted',
      idempotencyKey: createCancelConversionIdempotencyKey(activeConversion.conversionId),
      clientSentAtMs: Date.now(),
    });

    if (cancelResult.type === 'success') {
      return {
        bannerMessage: conversionMessages.pendingExpiredRecovered,
        activeConversion: null,
      };
    }

    return { bannerMessage: getConversionFailureMessage(cancelResult.reason) };
  }

  if (activeConversion.status === 'pending') {
    return { bannerMessage: conversionMessages.pendingRecovery };
  }

  if (isSdkStartedConversionStale(activeConversion, params.serverNowMs)) {
    const manualReviewResult = await fetchMarkConversionManualReview({
      config: renewalApiConfig,
      anonymousHash: params.anonymousHash,
      conversionId: activeConversion.conversionId,
      reason: 'sdkCallStartedWithoutSuccessKey',
      idempotencyKey: createManualReviewConversionIdempotencyKey(activeConversion.conversionId),
      clientSentAtMs: Date.now(),
    });

    if (manualReviewResult.type === 'success') {
      return {
        bannerMessage: conversionMessages.manualReviewQueued,
        activeConversion: null,
      };
    }

    return { bannerMessage: getConversionFailureMessage(manualReviewResult.reason) };
  }

  return { bannerMessage: conversionMessages.manualReviewRequired };
}

export async function executePointConversion(params: {
  readonly anonymousHash: string;
  readonly activeConversion: ActiveConversion | null;
  readonly serverNowMs: number;
  readonly gateway: TossPointPromotionGateway | null;
}): Promise<ConversionFlowResult> {
  if (params.gateway == null) {
    return { bannerMessage: conversionMessages.unconfigured };
  }

  try {
    await assertPendingFinalizeStorageWritable();
  } catch {
    return { bannerMessage: conversionMessages.storageUnavailable };
  }

  const pendingResult = await executePendingFinalize(params.anonymousHash);
  if (pendingResult != null) {
    return pendingResult;
  }

  if (params.activeConversion != null) {
    const recovery = await executeActiveConversionRecovery({
      anonymousHash: params.anonymousHash,
      activeConversion: params.activeConversion,
      serverNowMs: params.serverNowMs,
    });
    if (recovery != null) {
      return recovery;
    }
  }

  const createSentAtMs = Date.now();
  const createResult = await fetchCreateConversion({
    config: renewalApiConfig,
    anonymousHash: params.anonymousHash,
    idempotencyKey: createConversionReservationIdempotencyKey({
      anonymousHash: params.anonymousHash,
      clientSentAtMs: createSentAtMs,
    }),
    clientSentAtMs: createSentAtMs,
  });

  if (createResult.type === 'failure') {
    return { bannerMessage: getConversionFailureMessage(createResult.reason) };
  }

  const markResult = await fetchMarkConversionSdkStarted({
    config: renewalApiConfig,
    anonymousHash: params.anonymousHash,
    conversionId: createResult.conversionId,
    idempotencyKey: createConversionSdkStartedIdempotencyKey(createResult.conversionId),
    clientSentAtMs: Date.now(),
  });

  if (markResult.type === 'failure') {
    return { bannerMessage: getConversionFailureMessage(markResult.reason) };
  }

  const grantResult = await params.gateway.grantTossPoint(markResult.pointAmount);

  if (grantResult.type === 'failed') {
    if (canReleaseHoldAfterGrantFailure(grantResult.reason)) {
      const cancelResult = await fetchCancelConversion({
        config: renewalApiConfig,
        anonymousHash: params.anonymousHash,
        conversionId: createResult.conversionId,
        reason: 'sdkClearFailedBeforeReward',
        idempotencyKey: createCancelConversionIdempotencyKey(createResult.conversionId),
        clientSentAtMs: Date.now(),
      });

      if (cancelResult.type === 'success') {
        return {
          bannerMessage: conversionMessages.tossSdkFailed,
          activeConversion: null,
        };
      }
    }

    return {
      bannerMessage:
        grantResult.reason === 'ambiguousUnknown'
          ? conversionMessages.manualReviewRequired
          : conversionMessages.tossSdkFailed,
    };
  }

  try {
    await writePendingFinalizeRecord({
      anonymousHash: params.anonymousHash,
      conversionId: createResult.conversionId,
      tossSuccessKey: grantResult.tossSuccessKey,
      pointAmount: markResult.pointAmount,
      savedAtMs: Date.now(),
    });
  } catch {
    return { bannerMessage: conversionMessages.manualReviewRequired };
  }

  const finalizeResult = await fetchFinalizeConversion({
    config: renewalApiConfig,
    anonymousHash: params.anonymousHash,
    conversionId: createResult.conversionId,
    tossSuccessKey: grantResult.tossSuccessKey,
    idempotencyKey: createFinalizeConversionIdempotencyKey(createResult.conversionId),
    clientSentAtMs: Date.now(),
  });

  if (finalizeResult.type === 'failure') {
    return { bannerMessage: getConversionFailureMessage(finalizeResult.reason) };
  }

  await clearPendingFinalizeRecord();

  return {
    bannerMessage: conversionMessages.completed,
    goldBalance: finalizeResult.goldBalance,
    todayConvertedTossPoint: finalizeResult.todayConvertedTossPoint,
    activeConversion: null,
  };
}
