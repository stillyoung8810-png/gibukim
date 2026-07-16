import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  DONATION_BOTTOM_IMAGE_BANNER_AD_GROUP_ID,
  DONATION_SUMMARY_PHRASE_BANNER_AD_GROUP_ID,
} from '../../constants/bannerAds';
import { donationMessages } from '../../constants/donationMessages';
import { LAYOUT, colors } from '../../constants/theme';
import type { DonationCampaign, LoadStatus, MyDonationSummary } from '../../types/appState';
import { BannerAdCard } from '../layout/BannerAdCard';
import { ScreenSection } from '../layout/ScreenSection';
import { screenStyles } from '../layout/screenStyles';
import { DonationListItem } from './DonationListItem';

type DonationScreenProps = {
  readonly summary: MyDonationSummary;
  readonly campaigns: readonly DonationCampaign[];
  readonly listStatus: LoadStatus;
  readonly onSelectCampaign: (campaignId: string) => void;
  readonly onRetry?: () => void;
};

export function DonationScreen({
  summary,
  campaigns,
  listStatus,
  onSelectCampaign,
  onRetry,
}: DonationScreenProps) {
  return (
    <ScreenSection>
      <View style={screenStyles.card}>
        <Text style={styles.eyebrow}>내 기부</Text>
        <Text style={styles.title}>기부 이력</Text>
        <Text style={styles.summaryHint}>{donationMessages.summaryHint}</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>참여한 기부</Text>
            <Text style={styles.summaryValue}>{summary.participatedCount}개</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>총 기부 골드</Text>
            <Text style={styles.summaryValue}>{summary.totalDonatedGold}골드</Text>
          </View>
        </View>

        <View style={styles.adWrap}>
          <BannerAdCard adGroupId={DONATION_SUMMARY_PHRASE_BANNER_AD_GROUP_ID} />
        </View>
      </View>

      <View style={[styles.listCard, screenStyles.cardShadow]}>
        <Text style={styles.listTitle}>기부 목록</Text>
        {renderListBody({
          listStatus,
          campaigns,
          onSelectCampaign,
          onRetry,
        })}
      </View>

      <BannerAdCard
        adGroupId={DONATION_BOTTOM_IMAGE_BANNER_AD_GROUP_ID}
        slotStyle={styles.imageBannerSlot}
      />
    </ScreenSection>
  );
}

function renderListBody(params: {
  readonly listStatus: LoadStatus;
  readonly campaigns: readonly DonationCampaign[];
  readonly onSelectCampaign: (campaignId: string) => void;
  readonly onRetry?: () => void;
}) {
  if (params.listStatus === 'loading' || params.listStatus === 'idle') {
    return (
      <View style={styles.stateBlock}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.stateText}>{donationMessages.listLoading}</Text>
      </View>
    );
  }

  if (params.listStatus === 'failed') {
    return (
      <View style={styles.stateBlock}>
        <Text style={styles.stateEmoji}>💛</Text>
        <Text style={styles.stateTitle}>{donationMessages.listLoadFailed}</Text>
        {params.onRetry == null ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={donationMessages.retry}
            onPress={params.onRetry}
            style={({ pressed }) => [styles.retryButton, pressed ? screenStyles.pressed : null]}
          >
            <Text style={styles.retryButtonText}>{donationMessages.retry}</Text>
          </Pressable>
        )}
      </View>
    );
  }

  if (params.campaigns.length === 0) {
    return (
      <View style={styles.stateBlock}>
        <Text style={styles.stateEmoji}>🤲</Text>
        <Text style={styles.stateTitle}>{donationMessages.listEmptyTitle}</Text>
        <Text style={styles.stateText}>{donationMessages.listEmptyBody}</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {params.campaigns.map((campaign) => (
        <DonationListItem
          key={campaign.id}
          title={campaign.title}
          coverImageUrl={campaign.coverImageUrl}
          onPress={() => params.onSelectCampaign(campaign.id)}
        />
      ))}
    </View>
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
  summaryHint: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textTertiary,
  },
  summaryRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
  },
  summaryItem: {
    flex: 1,
  },
  summaryDivider: {
    width: 1,
    height: 38,
    marginHorizontal: 12,
    backgroundColor: colors.border,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.textTertiary,
    fontWeight: '700',
  },
  summaryValue: {
    marginTop: 6,
    fontSize: 22,
    color: colors.accent,
    fontWeight: '900',
  },
  adWrap: {
    marginTop: 14,
  },
  imageBannerSlot: {
    height: LAYOUT.imageBannerHeight,
  },
  listCard: {
    padding: 18,
    borderRadius: 24,
    backgroundColor: colors.surfaceTranslucent,
  },
  listTitle: {
    marginBottom: 12,
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  list: {
    gap: 10,
  },
  stateBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 28,
    paddingHorizontal: 12,
  },
  stateEmoji: {
    fontSize: 28,
  },
  stateTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  stateText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    color: colors.textTertiary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
});
