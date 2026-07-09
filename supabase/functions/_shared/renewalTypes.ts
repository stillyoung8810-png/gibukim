export type KstDateString = string;

export type RenewalRequestBase = {
  readonly anonymousHash: string;
  readonly idempotencyKey: string;
  readonly clientSentAtMs: number;
};

export type BootstrapRequest = RenewalRequestBase & {
  readonly initialAvailableBoxCount: number;
};

export type CreditBoxesRequest = RenewalRequestBase & {
  readonly earnedBoxCount: number;
};

export type AttendanceMonthRequest = {
  readonly anonymousHash: string;
  readonly year: number;
  readonly month: number;
};

export type ConversionIdRequest = RenewalRequestBase & {
  readonly conversionId: string;
};

export type FinalizeConversionRequest = ConversionIdRequest & {
  readonly tossSuccessKey: string;
};

export type CancelConversionReason =
  | 'sdkClearFailedBeforeReward'
  | 'userCancelledBeforeSdkCallStarted'
  | 'expiredBeforeSdkCallStarted';

export type CancelConversionRequest = ConversionIdRequest & {
  readonly reason: CancelConversionReason;
};

export type ManualReviewConversionReason =
  | 'sdkCallStartedWithoutSuccessKey'
  | 'ambiguousSdkFailureAfterSdkStarted'
  | 'successKeyStorageFailed';

export type ManualReviewConversionRequest = ConversionIdRequest & {
  readonly reason: ManualReviewConversionReason;
};

export type DonateRequest = RenewalRequestBase & {
  readonly nickname: string;
};

export type CampaignDetailRequest = {
  readonly anonymousHash: string;
  readonly campaignId: string;
};

export type AnonymousHashRequest = {
  readonly anonymousHash: string;
};

export type RenewalApiFailureReason =
  | 'invalidRequest'
  | 'userBlocked'
  | 'userSuspended'
  | 'rateLimited'
  | 'goldLimitReached'
  | 'emptyBox'
  | 'alreadyAttended'
  | 'emptyGold'
  | 'pointAmountTooSmall'
  | 'invalidExchangeRate'
  | 'invalidFinancialArgs'
  | 'conversionUnavailable'
  | 'pendingConversionExists'
  | 'reservationLimitReached'
  | 'dailyLimitReached'
  | 'manualReviewRequired'
  | 'serverError';

export type ActiveConversionSnapshot = {
  readonly conversionId: string;
  readonly status: 'pending' | 'sdk_call_started';
  readonly pointAmount: number;
  readonly expiresAtMs: number;
  readonly statusUpdatedAtMs: number;
};

export type ActiveCampaignSnapshot = {
  readonly id: string;
  readonly title: string;
  readonly goalGold: number;
  readonly currentGold: number;
  readonly status: 'active' | 'placeholder_active';
};

export type BootstrapResponse =
  | {
      readonly type: 'success';
      readonly availableBoxCount: number;
      readonly goldBalance: number;
      readonly todayConvertedTossPoint: number;
      readonly todayDonatedGold: number;
      readonly activeConversion: ActiveConversionSnapshot | null;
      readonly activeCampaign: ActiveCampaignSnapshot | null;
      readonly serverNowMs: number;
      readonly todayKst: KstDateString;
    }
  | { readonly type: 'failure'; readonly reason: RenewalApiFailureReason };

export type CreditBoxesResponse =
  | {
      readonly type: 'success';
      readonly availableBoxCount: number;
      readonly isReplay: boolean;
    }
  | { readonly type: 'failure'; readonly reason: RenewalApiFailureReason };

export type CreditBoxOpenGoldResponse =
  | {
      readonly type: 'success';
      readonly idempotencyKey: string;
      readonly creditedGold: number;
      readonly goldBalance: number;
      readonly availableBoxCount: number;
      readonly isReplay: boolean;
    }
  | { readonly type: 'failure'; readonly reason: RenewalApiFailureReason };

export type AttendanceMonthResponse =
  | {
      readonly type: 'success';
      readonly attendedDatesKst: readonly KstDateString[];
      readonly todayKst: KstDateString;
    }
  | { readonly type: 'failure'; readonly reason: RenewalApiFailureReason };

export type SubmitAttendanceResponse =
  | {
      readonly type: 'success';
      readonly idempotencyKey: string;
      readonly attendanceDateKst: KstDateString;
      readonly creditedGold: number;
      readonly goldBalance: number;
      readonly isReplay: boolean;
    }
  | { readonly type: 'failure'; readonly reason: RenewalApiFailureReason };

export type CreateConversionResponse =
  | {
      readonly type: 'success';
      readonly conversionId: string;
      readonly goldToDebit: number;
      readonly pointAmount: number;
      readonly exchangeRateSnapshot: number;
    }
  | { readonly type: 'failure'; readonly reason: RenewalApiFailureReason };

export type FinalizeConversionResponse =
  | {
      readonly type: 'success';
      readonly goldBalance: number;
      readonly todayConvertedTossPoint: number;
    }
  | { readonly type: 'failure'; readonly reason: RenewalApiFailureReason };

export type CancelConversionResponse =
  | { readonly type: 'success' }
  | { readonly type: 'failure'; readonly reason: RenewalApiFailureReason };

export type ManualReviewConversionResponse =
  | { readonly type: 'success' }
  | { readonly type: 'failure'; readonly reason: RenewalApiFailureReason };

export type DonateResponse =
  | {
      readonly type: 'success';
      readonly goldBalance: number;
      readonly creditedAmount: number;
      readonly todayDonatedGold: number;
      readonly isReplay: boolean;
      readonly activeCampaign: ActiveCampaignSnapshot;
    }
  | { readonly type: 'failure'; readonly reason: RenewalApiFailureReason };

export type CampaignListItem = {
  readonly id: string;
  readonly title: string;
  readonly coverImageUrl: string | null;
};

export type ListCampaignsResponse =
  | {
      readonly type: 'success';
      readonly campaigns: readonly CampaignListItem[];
    }
  | { readonly type: 'failure'; readonly reason: RenewalApiFailureReason };

export type CampaignDetailResponse =
  | {
      readonly type: 'success';
      readonly id: string;
      readonly title: string;
      readonly goalGold: number;
      readonly currentGold: number;
      readonly images: readonly { readonly url: string; readonly isCover: boolean }[];
      readonly participantNicknames: readonly string[];
    }
  | { readonly type: 'failure'; readonly reason: RenewalApiFailureReason };

export type MyDonationsResponse =
  | {
      readonly type: 'success';
      readonly participatedCount: number;
      readonly totalDonatedGold: number;
    }
  | { readonly type: 'failure'; readonly reason: RenewalApiFailureReason };
