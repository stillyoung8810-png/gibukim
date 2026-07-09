export type TabScreen = 'home' | 'point' | 'donation';

export type Screen = TabScreen | 'donationDetail';

export type BootstrapStatus = 'loading' | 'ready' | 'failed';

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'failed';

export type ActiveCampaign = {
  readonly id: string;
  readonly title: string;
  readonly goalGold: number;
  readonly currentGold: number;
  readonly status?: 'active' | 'placeholder_active';
};

export type AttendanceMonth = {
  readonly year: number;
  readonly month: number;
  readonly todayKst: string;
  readonly attendedDatesKst: readonly string[];
};

export type DonationCampaign = {
  readonly id: string;
  readonly title: string;
  readonly coverImageUrl: string | null;
  readonly totalGold: number;
  readonly participantNicknames: readonly string[];
  readonly imageUrls: readonly string[];
};

export type MyDonationSummary = {
  readonly participatedCount: number;
  readonly totalDonatedGold: number;
};

export type ActiveConversion = {
  readonly conversionId: string;
  readonly status: 'pending' | 'sdk_call_started';
  readonly pointAmount: number;
  readonly expiresAtMs: number;
  readonly statusUpdatedAtMs: number;
};

export type AppState = {
  currentScreen: Screen;
  selectedCampaignId: string | null;
  bannerMessage: string | null;
  bootstrapStatus: BootstrapStatus;
  anonymousHash: string | null;

  activeCampaign: ActiveCampaign | null;
  nextBoxRemainingLabel: string;
  nextBoxProgress: number;
  isBoostActive: boolean;
  boostRemainingLabel: string | null;
  availableBoxCount: number;
  hasBoxOpenOpportunity: boolean;
  validTapCount: number;
  isRewardAdBusy: boolean;
  isBoxOpenCrediting: boolean;
  goldBalance: number;

  todayDonatedGold: number;
  todayConvertedTossPoint: number;
  donationNickname: string;
  isDonating: boolean;
  isConverting: boolean;
  isAttending: boolean;
  activeConversion: ActiveConversion | null;
  serverNowMs: number;
  attendance: AttendanceMonth;

  myDonationSummary: MyDonationSummary;
  campaigns: readonly DonationCampaign[];
  donationListStatus: LoadStatus;
  donationDetailStatus: LoadStatus;
};

export type AttendanceCalendarCell = {
  readonly dateKst: string;
  readonly dayOfMonth: number;
  readonly isToday: boolean;
  readonly hasAttended: boolean;
};

export type AttendanceCalendar = {
  readonly year: number;
  readonly month: number;
  readonly cells: readonly AttendanceCalendarCell[];
};
