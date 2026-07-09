import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  HOME_MIDDLE_IMAGE_BANNER_AD_GROUP_ID,
  HOME_TOP_PHRASE_BANNER_AD_GROUP_ID,
} from '../../constants/bannerAds';
import { LAYOUT } from '../../constants/theme';
import type { AppState } from '../../types/appState';
import { BannerAdCard } from '../layout/BannerAdCard';
import { ScreenSection } from '../layout/ScreenSection';
import { screenStyles } from '../layout/screenStyles';
import { BoostButton } from './BoostButton';
import { DonationGoalCard } from './DonationGoalCard';
import { HeroSection } from './HeroSection';
import { RewardBoxCard } from './RewardBoxCard';

type HomeScreenProps = {
  readonly appState: AppState;
  readonly onOpenPointScreen: () => void;
  readonly onBoost: () => void;
  readonly onBoxTap: () => void;
  readonly onRequestOpportunity: () => void;
  readonly onRefresh?: () => void;
};

export function HomeScreen({
  appState,
  onOpenPointScreen,
  onBoost,
  onBoxTap,
  onRequestOpportunity,
  onRefresh,
}: HomeScreenProps) {
  const isAdBusy = appState.isRewardAdBusy || appState.isBoxOpenCrediting;

  return (
    <ScreenSection>
      <DonationGoalCard
        title={appState.activeCampaign?.title ?? '다음 기부'}
        goalGold={appState.activeCampaign?.goalGold ?? 10000}
        currentGold={appState.activeCampaign?.currentGold ?? 0}
      />

      <HeroSection
        nextBoxRemainingLabel={appState.nextBoxRemainingLabel}
        nextBoxProgress={appState.nextBoxProgress}
        onRefresh={onRefresh}
        footer={
          <BoostButton
            isBoostActive={appState.isBoostActive}
            boostRemainingLabel={appState.boostRemainingLabel}
            disabled={isAdBusy}
            onPress={onBoost}
          />
        }
      />

      <BannerAdCard adGroupId={HOME_TOP_PHRASE_BANNER_AD_GROUP_ID} />

      <RewardBoxCard
        goldBalance={appState.goldBalance}
        availableBoxCount={appState.availableBoxCount}
        hasBoxOpenOpportunity={appState.hasBoxOpenOpportunity}
        validTapCount={appState.validTapCount}
        isBusy={isAdBusy}
        onOpenPointScreen={onOpenPointScreen}
        onBoxTap={onBoxTap}
        onRequestOpportunity={onRequestOpportunity}
      />

      <BannerAdCard
        adGroupId={HOME_MIDDLE_IMAGE_BANNER_AD_GROUP_ID}
        slotStyle={styles.imageBannerSlot}
      />

      <View style={screenStyles.noticeCard}>
        <Text style={screenStyles.noticeText}>
          상자는 시간이 지나면 쌓이고, 부스트를 받으면 더 빨리 모을 수 있어요.
        </Text>
        <Text style={[screenStyles.noticeText, styles.noticeGap]}>
          모은 골드는 기부하거나 토스 포인트로 받을 수 있어요.
        </Text>
        <Text style={[screenStyles.noticeText, styles.noticeGap]}>
          기부 탭에서 참여 이력과 공개된 기부 이야기를 볼 수 있어요.
        </Text>
      </View>
    </ScreenSection>
  );
}

const styles = StyleSheet.create({
  imageBannerSlot: {
    height: LAYOUT.imageBannerHeight,
  },
  noticeGap: {
    marginTop: 6,
  },
});
