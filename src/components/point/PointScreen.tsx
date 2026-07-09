import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  POINT_BOTTOM_IMAGE_BANNER_AD_GROUP_ID,
  POINT_TOP_PHRASE_BANNER_AD_GROUP_ID,
} from '../../constants/bannerAds';
import { LAYOUT, colors } from '../../constants/theme';
import type { AppState } from '../../types/appState';
import { BannerAdCard } from '../layout/BannerAdCard';
import { ScreenSection } from '../layout/ScreenSection';
import { screenStyles } from '../layout/screenStyles';
import { AttendanceCard } from './AttendanceCard';
import { GoldDonationCard } from './GoldDonationCard';

type PointScreenProps = {
  readonly appState: AppState;
  readonly onNicknameChange: (value: string) => void;
  readonly onConvert: () => void;
  readonly onDonate: () => void;
  readonly onAttend: () => void;
};

export function PointScreen({
  appState,
  onNicknameChange,
  onConvert,
  onDonate,
  onAttend,
}: PointScreenProps) {
  return (
    <ScreenSection>
      <View style={screenStyles.card}>
        <Text style={styles.eyebrow}>골드 · 출석</Text>
        <Text style={styles.title}>포인트</Text>
        <Text style={styles.description}>골드를 기부하거나 토스 포인트로 받아보세요.</Text>
      </View>

      <BannerAdCard adGroupId={POINT_TOP_PHRASE_BANNER_AD_GROUP_ID} />

      <GoldDonationCard
        goldBalance={appState.goldBalance}
        todayDonatedGold={appState.todayDonatedGold}
        nickname={appState.donationNickname}
        isConverting={appState.isConverting}
        isDonating={appState.isDonating}
        onNicknameChange={onNicknameChange}
        onConvert={onConvert}
        onDonate={onDonate}
      />

      <AttendanceCard
        attendance={appState.attendance}
        isAttending={appState.isAttending}
        onAttend={onAttend}
      />

      <BannerAdCard
        adGroupId={POINT_BOTTOM_IMAGE_BANNER_AD_GROUP_ID}
        slotStyle={styles.imageBannerSlot}
      />
    </ScreenSection>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.primary,
  },
  title: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
  },
  description: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  imageBannerSlot: {
    height: LAYOUT.imageBannerHeight,
  },
});
