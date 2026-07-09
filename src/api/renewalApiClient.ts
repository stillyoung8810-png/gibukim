import { isRenewalApiConfigured, type RenewalApiConfig } from './renewalApiConfig';

export type ActiveCampaignSnapshot = {
  readonly id: string;
  readonly title: string;
  readonly goalGold: number;
  readonly currentGold: number;
  readonly status: 'active' | 'placeholder_active';
};

export type ActiveConversionSnapshot = {
  readonly conversionId: string;
  readonly status: 'pending' | 'sdk_call_started';
  readonly pointAmount: number;
  readonly expiresAtMs: number;
  readonly statusUpdatedAtMs: number;
};

export type BootstrapState = {
  readonly availableBoxCount: number;
  readonly goldBalance: number;
  readonly todayConvertedTossPoint: number;
  readonly todayDonatedGold: number;
  readonly activeConversion: ActiveConversionSnapshot | null;
  readonly activeCampaign: ActiveCampaignSnapshot | null;
  readonly serverNowMs: number;
  readonly todayKst: string;
};

export type ApiFailureReason =
  | 'unconfigured'
  | 'invalidRequest'
  | 'userBlocked'
  | 'userSuspended'
  | 'emptyGold'
  | 'emptyBox'
  | 'alreadyAttended'
  | 'goldLimitReached'
  | 'rateLimited'
  | 'pointAmountTooSmall'
  | 'invalidExchangeRate'
  | 'invalidFinancialArgs'
  | 'conversionUnavailable'
  | 'pendingConversionExists'
  | 'reservationLimitReached'
  | 'dailyLimitReached'
  | 'manualReviewRequired'
  | 'serverError'
  | 'network'
  | 'invalidResponse';

export type CreateConversionResult =
  | {
      readonly type: 'success';
      readonly conversionId: string;
      readonly goldToDebit: number;
      readonly pointAmount: number;
      readonly exchangeRateSnapshot: number;
    }
  | { readonly type: 'failure'; readonly reason: ApiFailureReason };

export type FinalizeConversionResult =
  | {
      readonly type: 'success';
      readonly goldBalance: number;
      readonly todayConvertedTossPoint: number;
    }
  | { readonly type: 'failure'; readonly reason: ApiFailureReason };

export type CancelConversionResult =
  | { readonly type: 'success' }
  | { readonly type: 'failure'; readonly reason: ApiFailureReason };

export type ManualReviewConversionResult =
  | { readonly type: 'success' }
  | { readonly type: 'failure'; readonly reason: ApiFailureReason };

export type CancelConversionReason =
  | 'sdkClearFailedBeforeReward'
  | 'userCancelledBeforeSdkCallStarted'
  | 'expiredBeforeSdkCallStarted';

export type ManualReviewConversionReason =
  | 'sdkCallStartedWithoutSuccessKey'
  | 'ambiguousSdkFailureAfterSdkStarted'
  | 'successKeyStorageFailed';

export type BootstrapResult =
  | { readonly type: 'success'; readonly state: BootstrapState }
  | { readonly type: 'failure'; readonly reason: ApiFailureReason };

export type CreditBoxesResult =
  | { readonly type: 'success'; readonly availableBoxCount: number; readonly isReplay: boolean }
  | { readonly type: 'failure'; readonly reason: ApiFailureReason };

export type CreditBoxOpenGoldResult =
  | {
      readonly type: 'success';
      readonly idempotencyKey: string;
      readonly creditedGold: number;
      readonly goldBalance: number;
      readonly availableBoxCount: number;
      readonly isReplay: boolean;
    }
  | { readonly type: 'failure'; readonly reason: ApiFailureReason };

export type AttendanceMonthResult =
  | {
      readonly type: 'success';
      readonly year: number;
      readonly month: number;
      readonly attendedDatesKst: readonly string[];
      readonly todayKst: string;
    }
  | { readonly type: 'failure'; readonly reason: ApiFailureReason };

export type CreditAttendanceResult =
  | {
      readonly type: 'success';
      readonly idempotencyKey: string;
      readonly attendanceDateKst: string;
      readonly creditedGold: number;
      readonly goldBalance: number;
      readonly isReplay: boolean;
    }
  | { readonly type: 'failure'; readonly reason: ApiFailureReason };

export type DonateResult =
  | {
      readonly type: 'success';
      readonly goldBalance: number;
      readonly creditedAmount: number;
      readonly todayDonatedGold: number;
      readonly isReplay: boolean;
      readonly activeCampaign: ActiveCampaignSnapshot;
    }
  | { readonly type: 'failure'; readonly reason: ApiFailureReason };

export type CampaignListItem = {
  readonly id: string;
  readonly title: string;
  readonly coverImageUrl: string | null;
};

export type ListCampaignsResult =
  | { readonly type: 'success'; readonly campaigns: readonly CampaignListItem[] }
  | { readonly type: 'failure'; readonly reason: ApiFailureReason };

export type CampaignDetailResult =
  | {
      readonly type: 'success';
      readonly id: string;
      readonly title: string;
      readonly goalGold: number;
      readonly currentGold: number;
      readonly images: readonly { readonly url: string; readonly isCover: boolean }[];
      readonly participantNicknames: readonly string[];
    }
  | { readonly type: 'failure'; readonly reason: ApiFailureReason };

export type MyDonationsResult =
  | {
      readonly type: 'success';
      readonly participatedCount: number;
      readonly totalDonatedGold: number;
    }
  | { readonly type: 'failure'; readonly reason: ApiFailureReason };

type Fetcher = (
  input: string,
  init: {
    readonly method: string;
    readonly headers: Record<string, string>;
    readonly body: string;
  },
) => Promise<Response>;

export function createBootstrapIdempotencyKey(params: {
  readonly anonymousHash: string;
  readonly clientSentAtMs: number;
}): string {
  return `bootstrap:${params.anonymousHash}:${params.clientSentAtMs}`;
}

export function createBoxOpenGoldIdempotencyKey(params: {
  readonly anonymousHash: string;
  readonly clientSentAtMs: number;
}): string {
  return `box-open:${params.anonymousHash}:${params.clientSentAtMs}`;
}

export function createAttendanceIdempotencyKey(params: {
  readonly anonymousHash: string;
  readonly todayKst: string;
}): string {
  return `attendance:${params.anonymousHash}:${params.todayKst}`;
}

export function createDonateIdempotencyKey(params: {
  readonly anonymousHash: string;
  readonly clientSentAtMs: number;
}): string {
  return `donate:${params.anonymousHash}:${params.clientSentAtMs}`;
}

export function createTimeBoxCreditIdempotencyKey(params: {
  readonly anonymousHash: string;
  readonly clientSentAtMs: number;
  readonly earnedBoxCount: number;
}): string {
  return `time-box:${params.anonymousHash}:${params.clientSentAtMs}:${params.earnedBoxCount}`;
}

export function createConversionReservationIdempotencyKey(params: {
  readonly anonymousHash: string;
  readonly clientSentAtMs: number;
}): string {
  return `conversion-reservation:${params.anonymousHash}:${params.clientSentAtMs}`;
}

export function createConversionSdkStartedIdempotencyKey(conversionId: string): string {
  return `conversion-sdk-started:${conversionId}`;
}

export function createFinalizeConversionIdempotencyKey(conversionId: string): string {
  return `conversion-finalize:${conversionId}`;
}

export function createCancelConversionIdempotencyKey(conversionId: string): string {
  return `conversion-cancel:${conversionId}`;
}

export function createManualReviewConversionIdempotencyKey(conversionId: string): string {
  return `conversion-manual-review:${conversionId}`;
}

async function postRenewalRoute(params: {
  readonly config: RenewalApiConfig;
  readonly route: string;
  readonly body: unknown;
  readonly fetcher?: Fetcher;
}): Promise<{ readonly type: 'ok'; readonly body: unknown } | { readonly type: 'failure'; readonly reason: ApiFailureReason }> {
  if (!isRenewalApiConfigured(params.config)) {
    return { type: 'failure', reason: 'unconfigured' };
  }

  const fetcher = params.fetcher ?? fetch;

  try {
    const response = await fetcher(`${params.config.functionsBaseUrl}/renewal/${params.route}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: params.config.anonKey,
        Authorization: `Bearer ${params.config.anonKey}`,
      },
      body: JSON.stringify(params.body),
    });

    if (!response.ok) {
      return { type: 'failure', reason: 'network' };
    }

    return { type: 'ok', body: await response.json() };
  } catch {
    return { type: 'failure', reason: 'network' };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function toFailureReason(value: unknown): ApiFailureReason {
  if (typeof value !== 'string') {
    return 'invalidResponse';
  }

  switch (value) {
    case 'invalidRequest':
    case 'userBlocked':
    case 'userSuspended':
    case 'emptyGold':
    case 'emptyBox':
    case 'alreadyAttended':
    case 'goldLimitReached':
    case 'rateLimited':
    case 'pointAmountTooSmall':
    case 'invalidExchangeRate':
    case 'invalidFinancialArgs':
    case 'conversionUnavailable':
    case 'pendingConversionExists':
    case 'reservationLimitReached':
    case 'dailyLimitReached':
    case 'manualReviewRequired':
    case 'serverError':
      return value;
    default:
      return 'invalidResponse';
  }
}

function parseActiveCampaign(value: unknown): ActiveCampaignSnapshot | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.id !== 'string' ||
    typeof value.title !== 'string' ||
    typeof value.goalGold !== 'number' ||
    typeof value.currentGold !== 'number'
  ) {
    return null;
  }

  if (value.status !== 'active' && value.status !== 'placeholder_active') {
    return null;
  }

  return {
    id: value.id,
    title: value.title,
    goalGold: value.goalGold,
    currentGold: value.currentGold,
    status: value.status,
  };
}

function parseActiveConversion(value: unknown): ActiveConversionSnapshot | null {
  if (value == null) {
    return null;
  }

  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.conversionId !== 'string' ||
    typeof value.pointAmount !== 'number' ||
    typeof value.expiresAtMs !== 'number' ||
    typeof value.statusUpdatedAtMs !== 'number'
  ) {
    return null;
  }

  if (value.status !== 'pending' && value.status !== 'sdk_call_started') {
    return null;
  }

  return {
    conversionId: value.conversionId,
    status: value.status,
    pointAmount: value.pointAmount,
    expiresAtMs: value.expiresAtMs,
    statusUpdatedAtMs: value.statusUpdatedAtMs,
  };
}

export async function fetchBootstrap(params: {
  readonly config: RenewalApiConfig;
  readonly anonymousHash: string;
  readonly idempotencyKey: string;
  readonly clientSentAtMs: number;
  readonly initialAvailableBoxCount?: number;
  readonly fetcher?: Fetcher;
}): Promise<BootstrapResult> {
  const result = await postRenewalRoute({
    config: params.config,
    route: 'bootstrap',
    body: {
      anonymousHash: params.anonymousHash,
      idempotencyKey: params.idempotencyKey,
      clientSentAtMs: params.clientSentAtMs,
      initialAvailableBoxCount: params.initialAvailableBoxCount ?? 0,
    },
    fetcher: params.fetcher,
  });

  if (result.type === 'failure') {
    return result;
  }

  if (!isRecord(result.body)) {
    return { type: 'failure', reason: 'invalidResponse' };
  }

  if (result.body.type === 'failure') {
    return { type: 'failure', reason: toFailureReason(result.body.reason) };
  }

  if (
    result.body.type !== 'success' ||
    typeof result.body.availableBoxCount !== 'number' ||
    typeof result.body.goldBalance !== 'number' ||
    typeof result.body.todayConvertedTossPoint !== 'number' ||
    typeof result.body.todayDonatedGold !== 'number' ||
    typeof result.body.serverNowMs !== 'number' ||
    typeof result.body.todayKst !== 'string'
  ) {
    return { type: 'failure', reason: 'invalidResponse' };
  }

  return {
    type: 'success',
    state: {
      availableBoxCount: result.body.availableBoxCount,
      goldBalance: result.body.goldBalance,
      todayConvertedTossPoint: result.body.todayConvertedTossPoint,
      todayDonatedGold: result.body.todayDonatedGold,
      activeConversion: parseActiveConversion(result.body.activeConversion),
      activeCampaign: parseActiveCampaign(result.body.activeCampaign),
      serverNowMs: result.body.serverNowMs,
      todayKst: result.body.todayKst,
    },
  };
}

export async function fetchCreditBoxes(params: {
  readonly config: RenewalApiConfig;
  readonly anonymousHash: string;
  readonly idempotencyKey: string;
  readonly clientSentAtMs: number;
  readonly earnedBoxCount: number;
  readonly fetcher?: Fetcher;
}): Promise<CreditBoxesResult> {
  const result = await postRenewalRoute({
    config: params.config,
    route: 'credit-boxes',
    body: {
      anonymousHash: params.anonymousHash,
      idempotencyKey: params.idempotencyKey,
      clientSentAtMs: params.clientSentAtMs,
      earnedBoxCount: params.earnedBoxCount,
    },
    fetcher: params.fetcher,
  });

  if (result.type === 'failure') {
    return result;
  }

  if (!isRecord(result.body)) {
    return { type: 'failure', reason: 'invalidResponse' };
  }

  if (result.body.type === 'failure') {
    return { type: 'failure', reason: toFailureReason(result.body.reason) };
  }

  if (
    result.body.type !== 'success' ||
    typeof result.body.availableBoxCount !== 'number' ||
    typeof result.body.isReplay !== 'boolean'
  ) {
    return { type: 'failure', reason: 'invalidResponse' };
  }

  return {
    type: 'success',
    availableBoxCount: result.body.availableBoxCount,
    isReplay: result.body.isReplay,
  };
}

export async function fetchCreditBoxOpenGold(params: {
  readonly config: RenewalApiConfig;
  readonly anonymousHash: string;
  readonly idempotencyKey: string;
  readonly clientSentAtMs: number;
  readonly fetcher?: Fetcher;
}): Promise<CreditBoxOpenGoldResult> {
  const result = await postRenewalRoute({
    config: params.config,
    route: 'credit-box-open-gold',
    body: {
      anonymousHash: params.anonymousHash,
      idempotencyKey: params.idempotencyKey,
      clientSentAtMs: params.clientSentAtMs,
    },
    fetcher: params.fetcher,
  });

  if (result.type === 'failure') {
    return result;
  }

  if (!isRecord(result.body)) {
    return { type: 'failure', reason: 'invalidResponse' };
  }

  if (result.body.type === 'failure') {
    return { type: 'failure', reason: toFailureReason(result.body.reason) };
  }

  if (
    result.body.type !== 'success' ||
    typeof result.body.idempotencyKey !== 'string' ||
    typeof result.body.creditedGold !== 'number' ||
    typeof result.body.goldBalance !== 'number' ||
    typeof result.body.availableBoxCount !== 'number' ||
    typeof result.body.isReplay !== 'boolean'
  ) {
    return { type: 'failure', reason: 'invalidResponse' };
  }

  return {
    type: 'success',
    idempotencyKey: result.body.idempotencyKey,
    creditedGold: result.body.creditedGold,
    goldBalance: result.body.goldBalance,
    availableBoxCount: result.body.availableBoxCount,
    isReplay: result.body.isReplay,
  };
}

export async function fetchAttendanceMonth(params: {
  readonly config: RenewalApiConfig;
  readonly anonymousHash: string;
  readonly year: number;
  readonly month: number;
  readonly fetcher?: Fetcher;
}): Promise<AttendanceMonthResult> {
  const result = await postRenewalRoute({
    config: params.config,
    route: 'attendance-month',
    body: {
      anonymousHash: params.anonymousHash,
      year: params.year,
      month: params.month,
    },
    fetcher: params.fetcher,
  });

  if (result.type === 'failure') {
    return result;
  }

  if (!isRecord(result.body)) {
    return { type: 'failure', reason: 'invalidResponse' };
  }

  if (result.body.type === 'failure') {
    return { type: 'failure', reason: toFailureReason(result.body.reason) };
  }

  if (
    result.body.type !== 'success' ||
    !Array.isArray(result.body.attendedDatesKst) ||
    typeof result.body.todayKst !== 'string'
  ) {
    return { type: 'failure', reason: 'invalidResponse' };
  }

  return {
    type: 'success',
    year: params.year,
    month: params.month,
    attendedDatesKst: result.body.attendedDatesKst.filter((value): value is string => typeof value === 'string'),
    todayKst: result.body.todayKst,
  };
}

export async function fetchCreditAttendanceGold(params: {
  readonly config: RenewalApiConfig;
  readonly anonymousHash: string;
  readonly idempotencyKey: string;
  readonly clientSentAtMs: number;
  readonly fetcher?: Fetcher;
}): Promise<CreditAttendanceResult> {
  const result = await postRenewalRoute({
    config: params.config,
    route: 'credit-attendance-gold',
    body: {
      anonymousHash: params.anonymousHash,
      idempotencyKey: params.idempotencyKey,
      clientSentAtMs: params.clientSentAtMs,
    },
    fetcher: params.fetcher,
  });

  if (result.type === 'failure') {
    return result;
  }

  if (!isRecord(result.body)) {
    return { type: 'failure', reason: 'invalidResponse' };
  }

  if (result.body.type === 'failure') {
    return { type: 'failure', reason: toFailureReason(result.body.reason) };
  }

  if (
    result.body.type !== 'success' ||
    typeof result.body.idempotencyKey !== 'string' ||
    typeof result.body.attendanceDateKst !== 'string' ||
    typeof result.body.creditedGold !== 'number' ||
    typeof result.body.goldBalance !== 'number' ||
    typeof result.body.isReplay !== 'boolean'
  ) {
    return { type: 'failure', reason: 'invalidResponse' };
  }

  return {
    type: 'success',
    idempotencyKey: result.body.idempotencyKey,
    attendanceDateKst: result.body.attendanceDateKst,
    creditedGold: result.body.creditedGold,
    goldBalance: result.body.goldBalance,
    isReplay: result.body.isReplay,
  };
}

export async function fetchDonate(params: {
  readonly config: RenewalApiConfig;
  readonly anonymousHash: string;
  readonly idempotencyKey: string;
  readonly clientSentAtMs: number;
  readonly nickname: string;
  readonly fetcher?: Fetcher;
}): Promise<DonateResult> {
  const result = await postRenewalRoute({
    config: params.config,
    route: 'donate',
    body: {
      anonymousHash: params.anonymousHash,
      idempotencyKey: params.idempotencyKey,
      clientSentAtMs: params.clientSentAtMs,
      nickname: params.nickname,
    },
    fetcher: params.fetcher,
  });

  if (result.type === 'failure') {
    return result;
  }

  if (!isRecord(result.body)) {
    return { type: 'failure', reason: 'invalidResponse' };
  }

  if (result.body.type === 'failure') {
    return { type: 'failure', reason: toFailureReason(result.body.reason) };
  }

  const activeCampaign = parseActiveCampaign(result.body.activeCampaign);

  if (
    result.body.type !== 'success' ||
    typeof result.body.goldBalance !== 'number' ||
    typeof result.body.creditedAmount !== 'number' ||
    typeof result.body.todayDonatedGold !== 'number' ||
    typeof result.body.isReplay !== 'boolean' ||
    activeCampaign == null
  ) {
    return { type: 'failure', reason: 'invalidResponse' };
  }

  return {
    type: 'success',
    goldBalance: result.body.goldBalance,
    creditedAmount: result.body.creditedAmount,
    todayDonatedGold: result.body.todayDonatedGold,
    isReplay: result.body.isReplay,
    activeCampaign,
  };
}

export async function fetchListCampaigns(params: {
  readonly config: RenewalApiConfig;
  readonly anonymousHash: string;
  readonly fetcher?: Fetcher;
}): Promise<ListCampaignsResult> {
  const result = await postRenewalRoute({
    config: params.config,
    route: 'list-campaigns',
    body: { anonymousHash: params.anonymousHash },
    fetcher: params.fetcher,
  });

  if (result.type === 'failure') {
    return result;
  }

  if (!isRecord(result.body)) {
    return { type: 'failure', reason: 'invalidResponse' };
  }

  if (result.body.type === 'failure') {
    return { type: 'failure', reason: toFailureReason(result.body.reason) };
  }

  if (result.body.type !== 'success' || !Array.isArray(result.body.campaigns)) {
    return { type: 'failure', reason: 'invalidResponse' };
  }

  const campaigns: CampaignListItem[] = result.body.campaigns.flatMap((item) => {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.title !== 'string') {
      return [];
    }

    return [
      {
        id: item.id,
        title: item.title,
        coverImageUrl: typeof item.coverImageUrl === 'string' ? item.coverImageUrl : null,
      },
    ];
  });

  return { type: 'success', campaigns };
}

export async function fetchCampaignDetail(params: {
  readonly config: RenewalApiConfig;
  readonly anonymousHash: string;
  readonly campaignId: string;
  readonly fetcher?: Fetcher;
}): Promise<CampaignDetailResult> {
  const result = await postRenewalRoute({
    config: params.config,
    route: 'get-campaign-detail',
    body: {
      anonymousHash: params.anonymousHash,
      campaignId: params.campaignId,
    },
    fetcher: params.fetcher,
  });

  if (result.type === 'failure') {
    return result;
  }

  if (!isRecord(result.body)) {
    return { type: 'failure', reason: 'invalidResponse' };
  }

  if (result.body.type === 'failure') {
    return { type: 'failure', reason: toFailureReason(result.body.reason) };
  }

  if (
    result.body.type !== 'success' ||
    typeof result.body.id !== 'string' ||
    typeof result.body.title !== 'string' ||
    typeof result.body.goalGold !== 'number' ||
    typeof result.body.currentGold !== 'number' ||
    !Array.isArray(result.body.images) ||
    !Array.isArray(result.body.participantNicknames)
  ) {
    return { type: 'failure', reason: 'invalidResponse' };
  }

  return {
    type: 'success',
    id: result.body.id,
    title: result.body.title,
    goalGold: result.body.goalGold,
    currentGold: result.body.currentGold,
    images: result.body.images.flatMap((image) => {
      if (!isRecord(image) || typeof image.url !== 'string') {
        return [];
      }
      return [{ url: image.url, isCover: image.isCover === true }];
    }),
    participantNicknames: result.body.participantNicknames.filter(
      (nickname): nickname is string => typeof nickname === 'string',
    ),
  };
}

export async function fetchMyDonations(params: {
  readonly config: RenewalApiConfig;
  readonly anonymousHash: string;
  readonly fetcher?: Fetcher;
}): Promise<MyDonationsResult> {
  const result = await postRenewalRoute({
    config: params.config,
    route: 'get-my-donations',
    body: { anonymousHash: params.anonymousHash },
    fetcher: params.fetcher,
  });

  if (result.type === 'failure') {
    return result;
  }

  if (!isRecord(result.body)) {
    return { type: 'failure', reason: 'invalidResponse' };
  }

  if (result.body.type === 'failure') {
    return { type: 'failure', reason: toFailureReason(result.body.reason) };
  }

  if (
    result.body.type !== 'success' ||
    typeof result.body.participatedCount !== 'number' ||
    typeof result.body.totalDonatedGold !== 'number'
  ) {
    return { type: 'failure', reason: 'invalidResponse' };
  }

  return {
    type: 'success',
    participatedCount: result.body.participatedCount,
    totalDonatedGold: result.body.totalDonatedGold,
  };
}

function parseCreateConversionSuccess(body: Record<string, unknown>): CreateConversionResult {
  if (body.type === 'failure') {
    return { type: 'failure', reason: toFailureReason(body.reason) };
  }

  if (
    body.type !== 'success' ||
    typeof body.conversionId !== 'string' ||
    typeof body.goldToDebit !== 'number' ||
    typeof body.pointAmount !== 'number' ||
    typeof body.exchangeRateSnapshot !== 'number'
  ) {
    return { type: 'failure', reason: 'invalidResponse' };
  }

  return {
    type: 'success',
    conversionId: body.conversionId,
    goldToDebit: body.goldToDebit,
    pointAmount: body.pointAmount,
    exchangeRateSnapshot: body.exchangeRateSnapshot,
  };
}

export async function fetchCreateConversion(params: {
  readonly config: RenewalApiConfig;
  readonly anonymousHash: string;
  readonly idempotencyKey: string;
  readonly clientSentAtMs: number;
  readonly fetcher?: Fetcher;
}): Promise<CreateConversionResult> {
  const result = await postRenewalRoute({
    config: params.config,
    route: 'create-conversion',
    body: {
      anonymousHash: params.anonymousHash,
      idempotencyKey: params.idempotencyKey,
      clientSentAtMs: params.clientSentAtMs,
    },
    fetcher: params.fetcher,
  });

  if (result.type === 'failure') {
    return result;
  }

  if (!isRecord(result.body)) {
    return { type: 'failure', reason: 'invalidResponse' };
  }

  return parseCreateConversionSuccess(result.body);
}

export async function fetchMarkConversionSdkStarted(params: {
  readonly config: RenewalApiConfig;
  readonly anonymousHash: string;
  readonly conversionId: string;
  readonly idempotencyKey: string;
  readonly clientSentAtMs: number;
  readonly fetcher?: Fetcher;
}): Promise<CreateConversionResult> {
  const result = await postRenewalRoute({
    config: params.config,
    route: 'mark-conversion-sdk-call-started',
    body: {
      anonymousHash: params.anonymousHash,
      conversionId: params.conversionId,
      idempotencyKey: params.idempotencyKey,
      clientSentAtMs: params.clientSentAtMs,
    },
    fetcher: params.fetcher,
  });

  if (result.type === 'failure') {
    return result;
  }

  if (!isRecord(result.body)) {
    return { type: 'failure', reason: 'invalidResponse' };
  }

  return parseCreateConversionSuccess(result.body);
}

export async function fetchFinalizeConversion(params: {
  readonly config: RenewalApiConfig;
  readonly anonymousHash: string;
  readonly conversionId: string;
  readonly tossSuccessKey: string;
  readonly idempotencyKey: string;
  readonly clientSentAtMs: number;
  readonly fetcher?: Fetcher;
}): Promise<FinalizeConversionResult> {
  const result = await postRenewalRoute({
    config: params.config,
    route: 'finalize-conversion',
    body: {
      anonymousHash: params.anonymousHash,
      conversionId: params.conversionId,
      tossSuccessKey: params.tossSuccessKey,
      idempotencyKey: params.idempotencyKey,
      clientSentAtMs: params.clientSentAtMs,
    },
    fetcher: params.fetcher,
  });

  if (result.type === 'failure') {
    return result;
  }

  if (!isRecord(result.body)) {
    return { type: 'failure', reason: 'invalidResponse' };
  }

  if (result.body.type === 'failure') {
    return { type: 'failure', reason: toFailureReason(result.body.reason) };
  }

  if (
    result.body.type !== 'success' ||
    typeof result.body.goldBalance !== 'number' ||
    typeof result.body.todayConvertedTossPoint !== 'number'
  ) {
    return { type: 'failure', reason: 'invalidResponse' };
  }

  return {
    type: 'success',
    goldBalance: result.body.goldBalance,
    todayConvertedTossPoint: result.body.todayConvertedTossPoint,
  };
}

export async function fetchCancelConversion(params: {
  readonly config: RenewalApiConfig;
  readonly anonymousHash: string;
  readonly conversionId: string;
  readonly reason: CancelConversionReason;
  readonly idempotencyKey: string;
  readonly clientSentAtMs: number;
  readonly fetcher?: Fetcher;
}): Promise<CancelConversionResult> {
  const result = await postRenewalRoute({
    config: params.config,
    route: 'cancel-conversion',
    body: {
      anonymousHash: params.anonymousHash,
      conversionId: params.conversionId,
      reason: params.reason,
      idempotencyKey: params.idempotencyKey,
      clientSentAtMs: params.clientSentAtMs,
    },
    fetcher: params.fetcher,
  });

  if (result.type === 'failure') {
    return result;
  }

  if (!isRecord(result.body)) {
    return { type: 'failure', reason: 'invalidResponse' };
  }

  if (result.body.type === 'failure') {
    return { type: 'failure', reason: toFailureReason(result.body.reason) };
  }

  if (result.body.type !== 'success') {
    return { type: 'failure', reason: 'invalidResponse' };
  }

  return { type: 'success' };
}

export async function fetchMarkConversionManualReview(params: {
  readonly config: RenewalApiConfig;
  readonly anonymousHash: string;
  readonly conversionId: string;
  readonly reason: ManualReviewConversionReason;
  readonly idempotencyKey: string;
  readonly clientSentAtMs: number;
  readonly fetcher?: Fetcher;
}): Promise<ManualReviewConversionResult> {
  const result = await postRenewalRoute({
    config: params.config,
    route: 'mark-conversion-manual-review',
    body: {
      anonymousHash: params.anonymousHash,
      conversionId: params.conversionId,
      reason: params.reason,
      idempotencyKey: params.idempotencyKey,
      clientSentAtMs: params.clientSentAtMs,
    },
    fetcher: params.fetcher,
  });

  if (result.type === 'failure') {
    return result;
  }

  if (!isRecord(result.body)) {
    return { type: 'failure', reason: 'invalidResponse' };
  }

  if (result.body.type === 'failure') {
    return { type: 'failure', reason: toFailureReason(result.body.reason) };
  }

  if (result.body.type !== 'success') {
    return { type: 'failure', reason: 'invalidResponse' };
  }

  return { type: 'success' };
}
