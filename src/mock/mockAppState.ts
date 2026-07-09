import { GIBUKIM_POLICY } from '../domain/gibukimPolicy';
import type { AppState } from '../types/appState';

export const BOX_TAP_REQUIRED_COUNT = GIBUKIM_POLICY.boxTapRequiredCount;
export const GOLD_PER_BOX_OPEN = GIBUKIM_POLICY.goldPerBoxOpen;
export const NICKNAME_MAX_LENGTH = 10;
export const BANNER_DISMISS_MS = 2400;
export const ACCRUAL_TICK_MS = 30_000;

function getAttendanceMonthSeed(todayKst: string): AppState['attendance'] {
  const [yearText, monthText] = todayKst.split('-');
  const year = Number(yearText);
  const month = Number(monthText);

  return {
    year: Number.isInteger(year) ? year : 2026,
    month: Number.isInteger(month) ? month : 7,
    todayKst,
    attendedDatesKst: [],
  };
}

/** 서버 연동 전 초기 화면용. bootstrap 성공 시 잔액·캠페인 등으로 덮어씁니다. */
export function createInitialAppState(): AppState {
  const todayKst = '2026-07-09';

  return {
    currentScreen: 'home',
    selectedCampaignId: null,
    bannerMessage: null,
    bootstrapStatus: 'loading',
    anonymousHash: null,

    activeCampaign: null,
    nextBoxRemainingLabel: '상자 적립 준비 중',
    nextBoxProgress: 0,
    isBoostActive: false,
    boostRemainingLabel: null,
    availableBoxCount: 0,
    hasBoxOpenOpportunity: false,
    validTapCount: 0,
    isRewardAdBusy: false,
    isBoxOpenCrediting: false,
    goldBalance: 0,

    todayDonatedGold: 0,
    todayConvertedTossPoint: 0,
    donationNickname: '',
    isDonating: false,
    isConverting: false,
    isAttending: false,
    activeConversion: null,
    serverNowMs: Date.now(),
    attendance: getAttendanceMonthSeed(todayKst),

    myDonationSummary: {
      participatedCount: 0,
      totalDonatedGold: 0,
    },
    campaigns: [],
    donationListStatus: 'idle',
    donationDetailStatus: 'idle',
  };
}

export function formatDonationSuccessToast(nickname: string, gold: number): string {
  return `🌱 "${nickname}님의 ${gold}골드로 오늘 하루가 조금 더 따뜻해졌습니다."`;
}

export function parseYearMonthFromKst(todayKst: string): { readonly year: number; readonly month: number } {
  const [yearText, monthText] = todayKst.split('-');
  return {
    year: Number(yearText) || new Date().getFullYear(),
    month: Number(monthText) || new Date().getMonth() + 1,
  };
}
