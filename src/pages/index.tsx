import { createRoute } from '@granite-js/react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  createTossPointPromotionGateway,
  type TossPointPromotionGateway,
} from '../adapters/tossPointPromotionGateway';
import { createTossRewardAdGateway, type RewardAdGateway } from '../adapters/tossRewardAdGateway';
import {
  createAttendanceIdempotencyKey,
  createBootstrapIdempotencyKey,
  createDonateIdempotencyKey,
  createTimeBoxCreditIdempotencyKey,
  fetchAttendanceMonth,
  fetchBootstrap,
  fetchCampaignDetail,
  fetchCreditAttendanceGold,
  fetchCreditBoxOpenGold,
  fetchCreditBoxes,
  fetchDonate,
  fetchListCampaigns,
  fetchMyDonations,
} from '../api/renewalApiClient';
import { renewalApiConfig } from '../api/renewalApiConfig';
import { DonationDetailScreen } from '../components/donation/DonationDetailScreen';
import { DonationScreen } from '../components/donation/DonationScreen';
import { HomeScreen } from '../components/home/HomeScreen';
import { AppTabBar } from '../components/layout/AppTabBar';
import { PointScreen } from '../components/point/PointScreen';
import { gibukimPromotionConfig, getGibukimRuntimePromotionCode } from '../constants/promotionConfig';
import { gibukimRewardAdConfig } from '../constants/rewardAds';
import { LAYOUT, colors } from '../constants/theme';
import {
  applyBoxTap,
  createBoxOpenOpportunity,
  createInitialBoxOpenTapState,
  getActiveBoxOpenOpportunity,
  restoreBoxOpenOpportunity,
  type BoxOpenOpportunity,
  type BoxOpenTapState,
} from '../domain/boxOpenOpportunity';
import {
  executeActiveConversionRecovery,
  executePointConversion,
  toActiveConversion,
} from '../domain/pointConversion';
import {
  applyAccrualComputation,
  applyBoostAfterRewardAd,
  computeTimeBoxAccrual,
  formatDurationLabel,
  getBoostRemainingMs,
  getNextBoxAccrualProgress,
  getNextBoxRemainingMs,
  isBoostActive,
  restoreLocalTimeAccrualState,
  toStoredLocalTimeAccrualState,
  type LocalTimeAccrualState,
} from '../domain/timeBoxAccrual';
import {
  ACCRUAL_TICK_MS,
  BANNER_DISMISS_MS,
  createInitialAppState,
  formatDonationSuccessToast,
  parseYearMonthFromKst,
} from '../mock/mockAppState';
import { getCurrentAnonymousKeyResult } from '../rewardIdentity';
import {
  clearBoxOpenOpportunity,
  readBoxOpenOpportunity,
  writeBoxOpenOpportunity,
} from '../storage/boxOpenOpportunityStorage';
import { readTimeAccrualState, writeTimeAccrualState } from '../storage/timeAccrualStorage';
import type { AppState, DonationCampaign, TabScreen } from '../types/appState';

function createPromotionGateway(): TossPointPromotionGateway | null {
  const promotionCode = getGibukimRuntimePromotionCode(gibukimPromotionConfig);
  if (promotionCode == null) {
    return null;
  }
  return createTossPointPromotionGateway({ promotionCode });
}

export const Route = createRoute('/', {
  component: Page,
});

function Page() {
  const [appState, setAppState] = useState<AppState>(() => createInitialAppState());
  const actionInFlightRef = useRef(false);
  const anonymousHashRef = useRef<string | null>(null);
  const accrualStateRef = useRef<LocalTimeAccrualState | null>(null);
  const boxOpenOpportunityRef = useRef<BoxOpenOpportunity | null>(null);
  const boxOpenTapStateRef = useRef<BoxOpenTapState>(createInitialBoxOpenTapState());
  const availableBoxCountRef = useRef(0);
  const creditBoxesInFlightRef = useRef(false);

  const boxOpenOpportunityRewardAdGatewayRef = useRef<RewardAdGateway>(
    createTossRewardAdGateway(gibukimRewardAdConfig.boxOpenOpportunityAdGroupIds),
  );
  const boostRewardAdGatewayRef = useRef<RewardAdGateway>(
    createTossRewardAdGateway(gibukimRewardAdConfig.boostAdGroupId),
  );
  const tossPointPromotionGatewayRef = useRef<TossPointPromotionGateway | null>(createPromotionGateway());
  const activeConversionRef = useRef(appState.activeConversion);
  const serverNowMsRef = useRef(appState.serverNowMs);

  useEffect(() => {
    availableBoxCountRef.current = appState.availableBoxCount;
    activeConversionRef.current = appState.activeConversion;
    serverNowMsRef.current = appState.serverNowMs;
  }, [appState.availableBoxCount, appState.activeConversion, appState.serverNowMs]);

  const showBanner = useCallback((message: string) => {
    setAppState((prev) => ({ ...prev, bannerMessage: message }));
  }, []);

  const persistAccrualState = useCallback(async (state: LocalTimeAccrualState, anonymousHash: string, nowMs: number) => {
    accrualStateRef.current = state;
    await writeTimeAccrualState(
      toStoredLocalTimeAccrualState({
        state,
        anonymousHash,
        nowMs,
      }),
    );
  }, []);

  const applyHeroProgress = useCallback(
    (params: {
      readonly prev: AppState;
      readonly accrualState: LocalTimeAccrualState;
      readonly nowMs: number;
      readonly availableBoxCount: number;
      readonly opportunity: BoxOpenOpportunity | null;
      readonly tapState: BoxOpenTapState;
      readonly bannerMessage?: string | null;
    }): AppState => {
      const remainingMs = getNextBoxRemainingMs(
        params.accrualState,
        params.nowMs,
        params.availableBoxCount,
      );
      const progress = getNextBoxAccrualProgress(
        params.accrualState,
        params.nowMs,
        params.availableBoxCount,
      );
      const boostActive = isBoostActive(params.accrualState, params.nowMs);
      const boostRemainingMs = getBoostRemainingMs(params.accrualState, params.nowMs);

      return {
        ...params.prev,
        availableBoxCount: params.availableBoxCount,
        nextBoxRemainingLabel: formatDurationLabel(remainingMs),
        nextBoxProgress: progress,
        isBoostActive: boostActive,
        boostRemainingLabel: boostActive ? formatDurationLabel(boostRemainingMs) : null,
        hasBoxOpenOpportunity: params.opportunity != null,
        validTapCount: params.tapState.validTapCount,
        bannerMessage:
          params.bannerMessage === undefined ? params.prev.bannerMessage : params.bannerMessage,
      };
    },
    [],
  );

  const syncTimeBoxAccrual = useCallback(
    async (params?: { readonly bannerOnEarn?: boolean }) => {
      const anonymousHash = anonymousHashRef.current;
      const accrualState = accrualStateRef.current;

      if (anonymousHash == null || accrualState == null || creditBoxesInFlightRef.current) {
        return;
      }

      const nowMs = Date.now();
      const computation = computeTimeBoxAccrual({
        state: accrualState,
        nowMs,
        availableBoxCount: availableBoxCountRef.current,
      });

      if (computation.earnedBoxCount <= 0) {
        const nextAccrual =
          computation.nextLastAccruedAtMs !== accrualState.lastAccruedAtMs ||
          computation.nextRemainderBoxUnits !== accrualState.accrualRemainderBoxUnits
            ? applyAccrualComputation(accrualState, computation)
            : accrualState;

        if (nextAccrual !== accrualState) {
          try {
            await persistAccrualState(nextAccrual, anonymousHash, nowMs);
          } catch {
            // 로컬 저장 실패는 다음 틱에서 재시도
          }
        }

        setAppState((prev) =>
          applyHeroProgress({
            prev,
            accrualState: nextAccrual,
            nowMs,
            availableBoxCount: prev.availableBoxCount,
            opportunity: boxOpenOpportunityRef.current,
            tapState: boxOpenTapStateRef.current,
          }),
        );
        return;
      }

      creditBoxesInFlightRef.current = true;
      const clientSentAtMs = nowMs;
      const optimisticAccrual = applyAccrualComputation(accrualState, computation);

      try {
        const creditResult = await fetchCreditBoxes({
          config: renewalApiConfig,
          anonymousHash,
          idempotencyKey: createTimeBoxCreditIdempotencyKey({
            anonymousHash,
            clientSentAtMs,
            earnedBoxCount: computation.earnedBoxCount,
          }),
          clientSentAtMs,
          earnedBoxCount: computation.earnedBoxCount,
        });

        if (creditResult.type === 'success') {
          await persistAccrualState(optimisticAccrual, anonymousHash, nowMs);
          availableBoxCountRef.current = creditResult.availableBoxCount;
          setAppState((prev) =>
            applyHeroProgress({
              prev,
              accrualState: optimisticAccrual,
              nowMs,
              availableBoxCount: creditResult.availableBoxCount,
              opportunity: boxOpenOpportunityRef.current,
              tapState: boxOpenTapStateRef.current,
              bannerMessage:
                params?.bannerOnEarn === true && computation.earnedBoxCount > 0
                  ? `기부 상자 ${computation.earnedBoxCount}개를 받았어요.`
                  : undefined,
            }),
          );
          return;
        }

        setAppState((prev) =>
          applyHeroProgress({
            prev,
            accrualState,
            nowMs,
            availableBoxCount: prev.availableBoxCount,
            opportunity: boxOpenOpportunityRef.current,
            tapState: boxOpenTapStateRef.current,
            bannerMessage:
              creditResult.reason === 'network'
                ? '네트워크 연결을 확인하고 다시 시도해 주세요.'
                : '상자 적립에 실패했어요. 잠시 후 다시 시도해 주세요.',
          }),
        );
      } finally {
        creditBoxesInFlightRef.current = false;
      }
    },
    [applyHeroProgress, persistAccrualState],
  );

  const loadDonationLists = useCallback(async (anonymousHash: string) => {
    setAppState((prev) => ({ ...prev, donationListStatus: 'loading' }));

    const [listResult, myResult] = await Promise.all([
      fetchListCampaigns({ config: renewalApiConfig, anonymousHash }),
      fetchMyDonations({ config: renewalApiConfig, anonymousHash }),
    ]);

    setAppState((prev) => {
      const next: AppState = { ...prev };

      if (listResult.type === 'success') {
        next.donationListStatus = 'ready';
        next.campaigns = listResult.campaigns.map((campaign) => {
          const existing = prev.campaigns.find((item) => item.id === campaign.id);
          return {
            id: campaign.id,
            title: campaign.title,
            coverImageUrl: campaign.coverImageUrl,
            totalGold: existing?.totalGold ?? 0,
            participantNicknames: existing?.participantNicknames ?? [],
            imageUrls:
              existing != null && existing.imageUrls.length > 0
                ? existing.imageUrls
                : campaign.coverImageUrl == null
                  ? []
                  : [campaign.coverImageUrl],
          };
        });
      } else {
        next.donationListStatus = 'failed';
      }

      if (myResult.type === 'success') {
        next.myDonationSummary = {
          participatedCount: myResult.participatedCount,
          totalDonatedGold: myResult.totalDonatedGold,
        };
      }

      return next;
    });
  }, []);

  const bootstrapApp = useCallback(async () => {
    setAppState((prev) => ({ ...prev, bootstrapStatus: 'loading', bannerMessage: null }));

    const anonymousKeyResult = await getCurrentAnonymousKeyResult();

    if (anonymousKeyResult.type !== 'success') {
      setAppState((prev) => ({
        ...prev,
        bootstrapStatus: 'failed',
        bannerMessage: '사용자 식별에 실패했어요. 앱을 다시 실행해 주세요.',
      }));
      return;
    }

    anonymousHashRef.current = anonymousKeyResult.hash;
    const clientSentAtMs = Date.now();
    const bootstrapResult = await fetchBootstrap({
      config: renewalApiConfig,
      anonymousHash: anonymousKeyResult.hash,
      idempotencyKey: createBootstrapIdempotencyKey({
        anonymousHash: anonymousKeyResult.hash,
        clientSentAtMs,
      }),
      clientSentAtMs,
    });

    if (bootstrapResult.type === 'failure') {
      setAppState((prev) => ({
        ...prev,
        bootstrapStatus: 'failed',
        anonymousHash: anonymousKeyResult.hash,
        bannerMessage:
          bootstrapResult.reason === 'network'
            ? '네트워크 연결을 확인하고 다시 시도해 주세요.'
            : '서버 연결에 실패했어요. 잠시 후 다시 시도해 주세요.',
      }));
      return;
    }

    const nowMs = Date.now();
    const [rawAccrual, rawOpportunity] = await Promise.all([
      readTimeAccrualState(),
      readBoxOpenOpportunity(),
    ]);

    const restoredAccrual = restoreLocalTimeAccrualState({
      rawValue: rawAccrual,
      anonymousHash: anonymousKeyResult.hash,
      nowMs,
    });
    accrualStateRef.current = restoredAccrual;

    const restoredOpportunity = getActiveBoxOpenOpportunity(
      restoreBoxOpenOpportunity(rawOpportunity),
      nowMs,
    );
    const opportunityForUser =
      restoredOpportunity != null && restoredOpportunity.anonymousHash === anonymousKeyResult.hash
        ? restoredOpportunity
        : null;
    boxOpenOpportunityRef.current = opportunityForUser;
    boxOpenTapStateRef.current = createInitialBoxOpenTapState();

    if (opportunityForUser == null && rawOpportunity != null) {
      await clearBoxOpenOpportunity();
    }

    try {
      await writeTimeAccrualState(
        toStoredLocalTimeAccrualState({
          state: restoredAccrual,
          anonymousHash: anonymousKeyResult.hash,
          nowMs,
        }),
      );
    } catch {
      // 저장 실패해도 부트스트랩은 계속
    }

    const { year, month } = parseYearMonthFromKst(bootstrapResult.state.todayKst);
    const attendanceResult = await fetchAttendanceMonth({
      config: renewalApiConfig,
      anonymousHash: anonymousKeyResult.hash,
      year,
      month,
    });

    availableBoxCountRef.current = bootstrapResult.state.availableBoxCount;
    const remainingMs = getNextBoxRemainingMs(
      restoredAccrual,
      nowMs,
      bootstrapResult.state.availableBoxCount,
    );
    const progress = getNextBoxAccrualProgress(
      restoredAccrual,
      nowMs,
      bootstrapResult.state.availableBoxCount,
    );
    const boostActive = isBoostActive(restoredAccrual, nowMs);
    const boostRemainingMs = getBoostRemainingMs(restoredAccrual, nowMs);

    setAppState((prev) => ({
      ...prev,
      bootstrapStatus: 'ready',
      anonymousHash: anonymousKeyResult.hash,
      availableBoxCount: bootstrapResult.state.availableBoxCount,
      goldBalance: bootstrapResult.state.goldBalance,
      todayDonatedGold: bootstrapResult.state.todayDonatedGold,
      activeCampaign:
        bootstrapResult.state.activeCampaign == null
          ? null
          : {
              id: bootstrapResult.state.activeCampaign.id,
              title: bootstrapResult.state.activeCampaign.title,
              goalGold: bootstrapResult.state.activeCampaign.goalGold,
              currentGold: bootstrapResult.state.activeCampaign.currentGold,
              status: bootstrapResult.state.activeCampaign.status,
            },
      attendance:
        attendanceResult.type === 'success'
          ? {
              year: attendanceResult.year,
              month: attendanceResult.month,
              todayKst: attendanceResult.todayKst,
              attendedDatesKst: attendanceResult.attendedDatesKst,
            }
          : {
              year,
              month,
              todayKst: bootstrapResult.state.todayKst,
              attendedDatesKst: [],
            },
      nextBoxRemainingLabel: formatDurationLabel(remainingMs),
      nextBoxProgress: progress,
      isBoostActive: boostActive,
      boostRemainingLabel: boostActive ? formatDurationLabel(boostRemainingMs) : null,
      hasBoxOpenOpportunity: opportunityForUser != null,
      validTapCount: 0,
      todayConvertedTossPoint: bootstrapResult.state.todayConvertedTossPoint,
      activeConversion: toActiveConversion(bootstrapResult.state.activeConversion),
      serverNowMs: bootstrapResult.state.serverNowMs,
      bannerMessage: null,
    }));

    await loadDonationLists(anonymousKeyResult.hash);
    await syncTimeBoxAccrual({ bannerOnEarn: true });

    if (bootstrapResult.state.activeConversion != null) {
      const recovery = await executeActiveConversionRecovery({
        anonymousHash: anonymousKeyResult.hash,
        activeConversion: toActiveConversion(bootstrapResult.state.activeConversion),
        serverNowMs: bootstrapResult.state.serverNowMs,
      });

      if (recovery != null) {
        setAppState((prev) => ({
          ...prev,
          bannerMessage: recovery.bannerMessage,
          goldBalance: recovery.goldBalance ?? prev.goldBalance,
          todayConvertedTossPoint: recovery.todayConvertedTossPoint ?? prev.todayConvertedTossPoint,
          activeConversion:
            recovery.activeConversion === undefined ? prev.activeConversion : recovery.activeConversion,
        }));
      }
    }
  }, [loadDonationLists, syncTimeBoxAccrual]);

  useEffect(() => {
    void bootstrapApp();
  }, [bootstrapApp]);

  useEffect(() => {
    if (appState.bannerMessage == null) {
      return;
    }

    const timer = setTimeout(() => {
      setAppState((prev) => ({ ...prev, bannerMessage: null }));
    }, BANNER_DISMISS_MS);

    return () => clearTimeout(timer);
  }, [appState.bannerMessage]);

  useEffect(() => {
    if (appState.bootstrapStatus !== 'ready') {
      return;
    }

    const timer = setInterval(() => {
      void syncTimeBoxAccrual();
    }, ACCRUAL_TICK_MS);

    return () => clearInterval(timer);
  }, [appState.bootstrapStatus, syncTimeBoxAccrual]);

  useEffect(() => {
    if (appState.bootstrapStatus !== 'ready') {
      return;
    }

    const timer = setInterval(() => {
      const accrualState = accrualStateRef.current;
      if (accrualState == null) {
        return;
      }

      const nowMs = Date.now();
      const activeOpportunity = getActiveBoxOpenOpportunity(boxOpenOpportunityRef.current, nowMs);

      if (boxOpenOpportunityRef.current != null && activeOpportunity == null) {
        boxOpenOpportunityRef.current = null;
        boxOpenTapStateRef.current = createInitialBoxOpenTapState();
        void clearBoxOpenOpportunity();
      }

      setAppState((prev) =>
        applyHeroProgress({
          prev,
          accrualState,
          nowMs,
          availableBoxCount: prev.availableBoxCount,
          opportunity: activeOpportunity,
          tapState: boxOpenTapStateRef.current,
        }),
      );
    }, 1_000);

    return () => clearInterval(timer);
  }, [appState.bootstrapStatus, applyHeroProgress]);

  useEffect(() => {
    if (appState.bootstrapStatus !== 'ready') {
      return;
    }

    if (appState.hasBoxOpenOpportunity) {
      return;
    }

    void boxOpenOpportunityRewardAdGatewayRef.current.preloadNext();
  }, [appState.bootstrapStatus, appState.hasBoxOpenOpportunity]);

  useEffect(() => {
    return () => {
      boxOpenOpportunityRewardAdGatewayRef.current.dispose();
      boostRewardAdGatewayRef.current.dispose();
    };
  }, []);

  const tabScreen: TabScreen =
    appState.currentScreen === 'donationDetail' ? 'donation' : appState.currentScreen;

  function setTab(screen: TabScreen) {
    setAppState((prev) => ({
      ...prev,
      currentScreen: screen,
      selectedCampaignId: null,
      donationDetailStatus: 'idle',
      bannerMessage: null,
    }));
  }

  async function handleBoost() {
    const anonymousHash = anonymousHashRef.current ?? appState.anonymousHash;
    const accrualState = accrualStateRef.current;

    if (anonymousHash == null || accrualState == null || actionInFlightRef.current) {
      return;
    }

    actionInFlightRef.current = true;
    setAppState((prev) => ({ ...prev, isRewardAdBusy: true, bannerMessage: null }));

    try {
      await syncTimeBoxAccrual();

      const loadResult = await boostRewardAdGatewayRef.current.load();
      if (loadResult.type === 'failed') {
        showBanner('광고를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
        return;
      }

      const showResult = await boostRewardAdGatewayRef.current.show();
      if (showResult.type !== 'earnedReward') {
        showBanner('광고 시청이 완료되지 않았어요.');
        return;
      }

      const nowMs = Date.now();
      const currentAccrual = accrualStateRef.current ?? accrualState;
      const boostResult = applyBoostAfterRewardAd(currentAccrual, nowMs);

      if (boostResult.type === 'blocked') {
        showBanner('오늘 받을 수 있는 부스트를 모두 받았어요.');
        return;
      }

      await persistAccrualState(boostResult.state, anonymousHash, nowMs);
      setAppState((prev) =>
        applyHeroProgress({
          prev,
          accrualState: boostResult.state,
          nowMs,
          availableBoxCount: prev.availableBoxCount,
          opportunity: boxOpenOpportunityRef.current,
          tapState: boxOpenTapStateRef.current,
          bannerMessage: '4시간 부스트가 적용됐어요.',
        }),
      );
    } catch {
      showBanner('부스트 적용에 실패했어요. 다시 시도해 주세요.');
    } finally {
      actionInFlightRef.current = false;
      setAppState((prev) => ({ ...prev, isRewardAdBusy: false }));
    }
  }

  async function handleRequestOpportunity() {
    const anonymousHash = anonymousHashRef.current ?? appState.anonymousHash;

    if (anonymousHash == null || actionInFlightRef.current) {
      return;
    }

    if (boxOpenOpportunityRef.current != null) {
      showBanner('이미 사용할 수 있는 상자 열기 기회가 있어요.');
      return;
    }

    actionInFlightRef.current = true;
    setAppState((prev) => ({ ...prev, isRewardAdBusy: true, bannerMessage: null }));

    try {
      const loadResult = await boxOpenOpportunityRewardAdGatewayRef.current.preloadNext();
      if (loadResult.type === 'failed') {
        showBanner('광고를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
        return;
      }

      const showResult = await boxOpenOpportunityRewardAdGatewayRef.current.showPreloaded();
      if (showResult.type !== 'earnedReward') {
        showBanner('광고 시청이 완료되지 않았어요.');
        return;
      }

      if (boxOpenOpportunityRef.current != null) {
        showBanner('이미 사용할 수 있는 상자 열기 기회가 있어요.');
        return;
      }

      const nowMs = Date.now();
      const opportunity = createBoxOpenOpportunity({ anonymousHash, nowMs });
      await writeBoxOpenOpportunity(opportunity);
      boxOpenOpportunityRef.current = opportunity;
      boxOpenTapStateRef.current = createInitialBoxOpenTapState();

      setAppState((prev) => ({
        ...prev,
        hasBoxOpenOpportunity: true,
        validTapCount: 0,
        bannerMessage: '상자 열기 기회가 준비됐어요.',
      }));
    } catch {
      showBanner('상자 열기 기회를 받지 못했어요. 다시 시도해 주세요.');
    } finally {
      actionInFlightRef.current = false;
      setAppState((prev) => ({ ...prev, isRewardAdBusy: false }));
    }
  }

  async function handleBoxTap() {
    const anonymousHash = anonymousHashRef.current ?? appState.anonymousHash;
    const opportunity = boxOpenOpportunityRef.current;

    if (anonymousHash == null || opportunity == null || actionInFlightRef.current) {
      return;
    }

    if (availableBoxCountRef.current <= 0) {
      return;
    }

    const nowMs = Date.now();
    const activeOpportunity = getActiveBoxOpenOpportunity(opportunity, nowMs);

    if (activeOpportunity == null) {
      boxOpenOpportunityRef.current = null;
      boxOpenTapStateRef.current = createInitialBoxOpenTapState();
      await clearBoxOpenOpportunity();
      setAppState((prev) => ({
        ...prev,
        hasBoxOpenOpportunity: false,
        validTapCount: 0,
        bannerMessage: '상자 열기 기회가 만료됐어요. 다시 받아 주세요.',
      }));
      return;
    }

    const tapResult = applyBoxTap(boxOpenTapStateRef.current, nowMs);

    if (tapResult.type === 'ignored') {
      return;
    }

    boxOpenTapStateRef.current = tapResult.state;

    if (tapResult.type === 'accepted' || tapResult.type === 'expired') {
      setAppState((prev) => ({
        ...prev,
        validTapCount: tapResult.state.validTapCount,
      }));
      return;
    }

    // completed
    actionInFlightRef.current = true;
    setAppState((prev) => ({
      ...prev,
      isBoxOpenCrediting: true,
      validTapCount: 0,
      bannerMessage: null,
    }));

    try {
      const creditResult = await fetchCreditBoxOpenGold({
        config: renewalApiConfig,
        anonymousHash,
        idempotencyKey: activeOpportunity.idempotencyKey,
        clientSentAtMs: nowMs,
      });

      if (creditResult.type === 'failure') {
        if (creditResult.reason === 'emptyBox') {
          showBanner('열 수 있는 상자가 없어요.');
        } else if (creditResult.reason === 'network') {
          showBanner('네트워크 연결을 확인하고 다시 시도해 주세요.');
        } else {
          showBanner('상자 열기에 실패했어요. 다시 시도해 주세요.');
        }

        // 영구 거절(emptyBox 등)이 아니면 기회 유지. emptyBox면 기회는 유지하되 상자 없음 안내.
        return;
      }

      boxOpenOpportunityRef.current = null;
      boxOpenTapStateRef.current = createInitialBoxOpenTapState();
      await clearBoxOpenOpportunity();
      availableBoxCountRef.current = creditResult.availableBoxCount;

      const accrualState = accrualStateRef.current;
      setAppState((prev) => {
        const base: AppState = {
          ...prev,
          goldBalance: creditResult.goldBalance,
          availableBoxCount: creditResult.availableBoxCount,
          hasBoxOpenOpportunity: false,
          validTapCount: 0,
          bannerMessage: `${creditResult.creditedGold}골드를 받았어요.`,
        };

        if (accrualState == null) {
          return base;
        }

        return applyHeroProgress({
          prev: base,
          accrualState,
          nowMs: Date.now(),
          availableBoxCount: creditResult.availableBoxCount,
          opportunity: null,
          tapState: createInitialBoxOpenTapState(),
          bannerMessage: `${creditResult.creditedGold}골드를 받았어요.`,
        });
      });
    } finally {
      actionInFlightRef.current = false;
      setAppState((prev) => ({ ...prev, isBoxOpenCrediting: false }));
    }
  }

  function handleNicknameChange(value: string) {
    setAppState((prev) => ({ ...prev, donationNickname: value }));
  }

  async function handleConvert() {
    const anonymousHash = anonymousHashRef.current ?? appState.anonymousHash;

    if (anonymousHash == null || actionInFlightRef.current) {
      return;
    }

    actionInFlightRef.current = true;
    setAppState((prev) => ({ ...prev, isConverting: true, bannerMessage: null }));

    try {
      const result = await executePointConversion({
        anonymousHash,
        activeConversion: activeConversionRef.current,
        serverNowMs: serverNowMsRef.current,
        gateway: tossPointPromotionGatewayRef.current,
      });

      setAppState((prev) => ({
        ...prev,
        bannerMessage: result.bannerMessage,
        goldBalance: result.goldBalance ?? prev.goldBalance,
        todayConvertedTossPoint: result.todayConvertedTossPoint ?? prev.todayConvertedTossPoint,
        activeConversion:
          result.activeConversion === undefined ? prev.activeConversion : result.activeConversion,
      }));
    } finally {
      actionInFlightRef.current = false;
      setAppState((prev) => ({ ...prev, isConverting: false }));
    }
  }

  async function handleDonate() {
    const nickname = appState.donationNickname.trim();
    const anonymousHash = anonymousHashRef.current ?? appState.anonymousHash;

    if (nickname.length < 1 || anonymousHash == null || actionInFlightRef.current) {
      return;
    }

    if (nickname.length > 10) {
      showBanner('닉네임은 10자 이내로 입력해 주세요.');
      return;
    }

    if (appState.goldBalance <= 0) {
      showBanner('보유 골드가 부족해요. 골드를 모은 뒤 다시 시도해 주세요.');
      return;
    }

    actionInFlightRef.current = true;
    setAppState((prev) => ({ ...prev, isDonating: true, bannerMessage: null }));
    const clientSentAtMs = Date.now();

    try {
      const result = await fetchDonate({
        config: renewalApiConfig,
        anonymousHash,
        idempotencyKey: createDonateIdempotencyKey({ anonymousHash, clientSentAtMs }),
        clientSentAtMs,
        nickname,
      });

      if (result.type === 'failure') {
        if (result.reason === 'emptyGold') {
          showBanner('보유 골드가 부족해요. 골드를 모은 뒤 다시 시도해 주세요.');
        } else if (result.reason === 'network') {
          showBanner('네트워크 연결을 확인하고 다시 시도해 주세요.');
        } else if (result.reason === 'invalidRequest') {
          showBanner('닉네임은 10자 이내로 입력해 주세요.');
        } else if (result.reason === 'serverError') {
          showBanner('잠시 후 다시 시도해 주세요.');
        } else {
          showBanner('기부에 실패했어요. 다시 시도해 주세요.');
        }
        return;
      }

      setAppState((prev) => ({
        ...prev,
        goldBalance: result.goldBalance,
        todayDonatedGold: result.todayDonatedGold,
        donationNickname: '',
        activeCampaign: {
          id: result.activeCampaign.id,
          title: result.activeCampaign.title,
          goalGold: result.activeCampaign.goalGold,
          currentGold: result.activeCampaign.currentGold,
          status: result.activeCampaign.status,
        },
        bannerMessage: formatDonationSuccessToast(nickname, result.creditedAmount),
      }));

      await loadDonationLists(anonymousHash);
    } finally {
      actionInFlightRef.current = false;
      setAppState((prev) => ({ ...prev, isDonating: false }));
    }
  }

  async function handleAttend() {
    const anonymousHash = anonymousHashRef.current ?? appState.anonymousHash;

    if (anonymousHash == null || actionInFlightRef.current) {
      return;
    }

    if (appState.attendance.attendedDatesKst.includes(appState.attendance.todayKst)) {
      return;
    }

    actionInFlightRef.current = true;
    setAppState((prev) => ({ ...prev, isAttending: true, bannerMessage: null }));

    try {
      const result = await fetchCreditAttendanceGold({
        config: renewalApiConfig,
        anonymousHash,
        idempotencyKey: createAttendanceIdempotencyKey({
          anonymousHash,
          todayKst: appState.attendance.todayKst,
        }),
        clientSentAtMs: Date.now(),
      });

      if (result.type === 'failure') {
        if (result.reason === 'alreadyAttended') {
          showBanner('오늘 이미 출석했어요.');
        } else if (result.reason === 'network') {
          showBanner('네트워크 연결을 확인하고 다시 시도해 주세요.');
        } else {
          showBanner('출석에 실패했어요. 잠시 후 다시 시도해 주세요.');
        }
        return;
      }

      setAppState((prev) => ({
        ...prev,
        goldBalance: result.goldBalance,
        attendance: {
          ...prev.attendance,
          attendedDatesKst: prev.attendance.attendedDatesKst.includes(result.attendanceDateKst)
            ? prev.attendance.attendedDatesKst
            : [...prev.attendance.attendedDatesKst, result.attendanceDateKst],
        },
        bannerMessage: `출석 완료! ${result.creditedGold}골드를 받았어요.`,
      }));
    } finally {
      actionInFlightRef.current = false;
      setAppState((prev) => ({ ...prev, isAttending: false }));
    }
  }

  async function loadCampaignDetail(campaignId: string) {
    const anonymousHash = anonymousHashRef.current ?? appState.anonymousHash;

    setAppState((prev) => ({
      ...prev,
      currentScreen: 'donationDetail',
      selectedCampaignId: campaignId,
      donationDetailStatus: 'loading',
      bannerMessage: null,
    }));

    if (anonymousHash == null) {
      setAppState((prev) => ({
        ...prev,
        donationDetailStatus: 'failed',
        bannerMessage: '사용자 식별에 실패했어요. 앱을 다시 실행해 주세요.',
      }));
      return;
    }

    const detailResult = await fetchCampaignDetail({
      config: renewalApiConfig,
      anonymousHash,
      campaignId,
    });

    if (detailResult.type !== 'success') {
      setAppState((prev) => ({
        ...prev,
        donationDetailStatus: 'failed',
        bannerMessage:
          detailResult.reason === 'network'
            ? '네트워크 연결을 확인하고 다시 시도해 주세요.'
            : '기부 상세를 불러오지 못했어요. 다시 시도해 주세요.',
      }));
      return;
    }

    const detailCampaign: DonationCampaign = {
      id: detailResult.id,
      title: detailResult.title,
      coverImageUrl: detailResult.images.find((image) => image.isCover)?.url ?? detailResult.images[0]?.url ?? null,
      totalGold: detailResult.currentGold,
      participantNicknames: detailResult.participantNicknames,
      imageUrls: detailResult.images.map((image) => image.url),
    };

    setAppState((prev) => ({
      ...prev,
      donationDetailStatus: 'ready',
      campaigns: prev.campaigns.some((campaign) => campaign.id === detailCampaign.id)
        ? prev.campaigns.map((campaign) => (campaign.id === detailCampaign.id ? detailCampaign : campaign))
        : [...prev.campaigns, detailCampaign],
    }));
  }

  function handleBackFromDetail() {
    setAppState((prev) => ({
      ...prev,
      currentScreen: 'donation',
      selectedCampaignId: null,
      donationDetailStatus: 'idle',
    }));
  }

  async function handleRefresh() {
    await syncTimeBoxAccrual({ bannerOnEarn: true });
    const accrualState = accrualStateRef.current;
    if (accrualState == null) {
      return;
    }

    const nowMs = Date.now();
    setAppState((prev) =>
      applyHeroProgress({
        prev,
        accrualState,
        nowMs,
        availableBoxCount: prev.availableBoxCount,
        opportunity: boxOpenOpportunityRef.current,
        tapState: boxOpenTapStateRef.current,
      }),
    );
  }

  const selectedCampaign =
    appState.selectedCampaignId == null
      ? null
      : (appState.campaigns.find((campaign) => campaign.id === appState.selectedCampaignId) ?? null);

  if (appState.bootstrapStatus === 'loading') {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>하루기부를 준비하고 있어요</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {appState.bannerMessage == null ? null : (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{appState.bannerMessage}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          appState.currentScreen === 'donationDetail' ? styles.scrollContentDetail : null,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.appTitle}>하루기부</Text>
          {appState.bootstrapStatus === 'failed' ? (
            <Text style={styles.retryHint} onPress={() => void bootstrapApp()}>
              다시 시도
            </Text>
          ) : null}
        </View>

        {appState.currentScreen === 'home' ? (
          <HomeScreen
            appState={appState}
            onOpenPointScreen={() => setTab('point')}
            onBoost={() => void handleBoost()}
            onBoxTap={() => void handleBoxTap()}
            onRequestOpportunity={() => void handleRequestOpportunity()}
            onRefresh={() => void handleRefresh()}
          />
        ) : null}

        {appState.currentScreen === 'point' ? (
          <PointScreen
            appState={appState}
            onNicknameChange={handleNicknameChange}
            onConvert={() => void handleConvert()}
            onDonate={() => void handleDonate()}
            onAttend={() => void handleAttend()}
          />
        ) : null}

        {appState.currentScreen === 'donation' ? (
          <DonationScreen
            summary={appState.myDonationSummary}
            campaigns={appState.campaigns}
            listStatus={appState.donationListStatus}
            onSelectCampaign={(campaignId) => void loadCampaignDetail(campaignId)}
            onRetry={() => {
              const anonymousHash = anonymousHashRef.current ?? appState.anonymousHash;
              if (anonymousHash != null) {
                void loadDonationLists(anonymousHash);
              }
            }}
          />
        ) : null}

        {appState.currentScreen === 'donationDetail' ? (
          <DonationDetailScreen
            campaign={selectedCampaign}
            detailStatus={appState.donationDetailStatus}
            onBack={handleBackFromDetail}
            onRetry={() => {
              if (appState.selectedCampaignId != null) {
                void loadCampaignDetail(appState.selectedCampaignId);
              }
            }}
          />
        ) : null}
      </ScrollView>

      {appState.currentScreen === 'donationDetail' ? null : (
        <AppTabBar current={tabScreen} onSelect={setTab} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  banner: {
    position: 'absolute',
    top: 12,
    left: LAYOUT.screenPaddingHorizontal,
    right: LAYOUT.screenPaddingHorizontal,
    zIndex: 20,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: colors.text,
  },
  bannerText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: colors.textOnPrimary,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.screenPaddingHorizontal,
    paddingTop: LAYOUT.screenPaddingTop,
    paddingBottom: LAYOUT.screenPaddingBottom + LAYOUT.tabBarHeight,
  },
  scrollContentDetail: {
    paddingBottom: LAYOUT.screenPaddingBottom,
  },
  header: {
    marginBottom: LAYOUT.headerMarginBottom,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
  },
  retryHint: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
});
