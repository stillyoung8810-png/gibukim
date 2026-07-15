import React from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { donationMessages } from '../../constants/donationMessages';
import { LAYOUT, colors } from '../../constants/theme';
import type { DonationCampaign, LoadStatus } from '../../types/appState';
import { ScreenSection } from '../layout/ScreenSection';
import { screenStyles } from '../layout/screenStyles';

type DonationDetailScreenProps = {
  readonly campaign: DonationCampaign | null;
  readonly detailStatus: LoadStatus;
  readonly onBack: () => void;
  readonly onRetry?: () => void;
};

export function DonationDetailScreen({
  campaign,
  detailStatus,
  onBack,
  onRetry,
}: DonationDetailScreenProps) {
  return (
    <ScreenSection>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="기부 목록으로 돌아가기"
        onPress={onBack}
        style={({ pressed }) => [styles.backButton, pressed ? screenStyles.pressed : null]}
      >
        <Text style={styles.backButtonText}>← 목록</Text>
      </Pressable>

      {detailStatus === 'loading' || (detailStatus === 'idle' && campaign == null) ? (
        <View style={[styles.stateBlock, screenStyles.cardShadow]}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.stateText}>{donationMessages.detailLoading}</Text>
        </View>
      ) : null}

      {detailStatus === 'failed' ? (
        <View style={[styles.stateBlock, screenStyles.cardShadow]}>
          <Text style={styles.stateEmoji}>💛</Text>
          <Text style={styles.stateTitle}>{donationMessages.detailLoadFailed}</Text>
          {onRetry == null ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={donationMessages.retry}
              onPress={onRetry}
              style={({ pressed }) => [styles.retryButton, pressed ? screenStyles.pressed : null]}
            >
              <Text style={styles.retryButtonText}>{donationMessages.retry}</Text>
            </Pressable>
          )}
        </View>
      ) : null}

      {campaign != null && detailStatus !== 'failed' ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageRow}>
            {campaign.imageUrls.length === 0 ? (
              <View style={[styles.heroImage, styles.heroImagePlaceholder]}>
                <Text style={styles.placeholderEmoji}>🤲</Text>
                <Text style={styles.placeholderText}>{donationMessages.imagesEmpty}</Text>
              </View>
            ) : (
              campaign.imageUrls.map((imageUrl, index) => (
                <Image key={`${campaign.id}-${index}`} source={{ uri: imageUrl }} style={styles.heroImage} />
              ))
            )}
          </ScrollView>

          <View style={screenStyles.card}>
            <Text style={styles.title}>{campaign.title}</Text>
            <Text style={styles.totalGold}>총 기부금액 {campaign.totalGold.toLocaleString()}골드</Text>
          </View>

          <View style={screenStyles.card}>
            <Text style={styles.sectionTitle}>참여자</Text>
            {campaign.participantNicknames.length === 0 ? (
              <Text style={styles.emptyParticipants}>{donationMessages.participantsEmpty}</Text>
            ) : (
              <View style={styles.nicknameList}>
                {campaign.participantNicknames.map((nickname, index) => (
                  <View key={`${nickname}-${index}`} style={styles.nicknameChip}>
                    <Text style={styles.nicknameText}>{nickname}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </>
      ) : null}
    </ScreenSection>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.surface,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  imageRow: {
    gap: 10,
  },
  heroImage: {
    width: 280,
    height: 180,
    borderRadius: LAYOUT.cardBorderRadius,
    backgroundColor: colors.surfaceMuted,
  },
  heroImagePlaceholder: {
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  placeholderEmoji: {
    fontSize: 28,
  },
  placeholderText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textTertiary,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
  },
  totalGold: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '800',
    color: colors.accent,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
  },
  emptyParticipants: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  nicknameList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  nicknameChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
  },
  nicknameText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  stateBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 40,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: colors.surfaceTranslucent,
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
