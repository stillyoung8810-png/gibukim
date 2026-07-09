import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BONUS_GOLD_PHRASE_BANNER_AD_GROUP_ID } from '../../constants/bannerAds';
import { colors } from '../../constants/theme';
import { NICKNAME_MAX_LENGTH } from '../../mock/mockAppState';
import { BannerAdCard } from '../layout/BannerAdCard';
import { screenStyles } from '../layout/screenStyles';

type GoldDonationCardProps = {
  readonly goldBalance: number;
  readonly todayDonatedGold: number;
  readonly nickname: string;
  readonly isConverting?: boolean;
  readonly isDonating?: boolean;
  readonly onNicknameChange: (value: string) => void;
  readonly onConvert: () => void;
  readonly onDonate: () => void;
};

export function GoldDonationCard({
  goldBalance,
  todayDonatedGold,
  nickname,
  isConverting = false,
  isDonating = false,
  onNicknameChange,
  onConvert,
  onDonate,
}: GoldDonationCardProps) {
  const trimmedNickname = nickname.trim();
  const canDonate = trimmedNickname.length >= 1 && goldBalance > 0 && !isDonating && !isConverting;
  const canConvert = goldBalance > 0 && !isConverting && !isDonating;

  return (
    <View style={screenStyles.card}>
      <Text style={styles.cardTitle}>골드·기부</Text>

      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>보유 골드</Text>
          <Text style={styles.summaryValue}>{goldBalance}골드</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>오늘 기부 골드</Text>
          <Text style={styles.summaryValue}>{todayDonatedGold}골드</Text>
        </View>
      </View>

      <View style={styles.adWrap}>
        <BannerAdCard adGroupId={BONUS_GOLD_PHRASE_BANNER_AD_GROUP_ID} />
      </View>

      <View style={styles.buttonRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="토스 포인트로 받기"
          accessibilityState={{ disabled: !canConvert }}
          disabled={!canConvert}
          onPress={onConvert}
          style={({ pressed }) => [
            styles.actionButton,
            canConvert ? styles.convertEnabled : styles.actionDisabled,
            pressed && canConvert ? screenStyles.pressed : null,
          ]}
        >
          <Text style={[styles.actionButtonText, !canConvert ? styles.actionButtonTextDisabled : null]}>
            {isConverting ? '처리 중…' : '토스 포인트로 받기'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="기부하기"
          accessibilityState={{ disabled: !canDonate }}
          disabled={!canDonate}
          onPress={onDonate}
          style={({ pressed }) => [
            styles.actionButton,
            canDonate ? styles.donateEnabled : styles.actionDisabled,
            pressed && canDonate ? screenStyles.pressed : null,
          ]}
        >
          <Text style={[styles.actionButtonText, !canDonate ? styles.actionButtonTextDisabled : null]}>
            {isDonating ? '기부 중…' : '기부하기'}
          </Text>
        </Pressable>
      </View>

      <TextInput
        value={nickname}
        onChangeText={(value) => onNicknameChange(value.slice(0, NICKNAME_MAX_LENGTH))}
        placeholder="기부 닉네임"
        placeholderTextColor={colors.textPlaceholder}
        maxLength={NICKNAME_MAX_LENGTH}
        style={styles.nicknameInput}
      />

      <View style={styles.noticeBox}>
        <Text style={styles.noticeText}>
          · 기부 닉네임을 입력한 뒤 기부하기를 눌러주세요. (최대 {NICKNAME_MAX_LENGTH}자)
        </Text>
        <Text style={styles.noticeText}>· 목표 골드가 달성되면 실제 기부로 이어집니다.</Text>
        <Text style={styles.noticeText}>
          · 기부는 하루기부의 두리여유법인을 통해 진행되는 법인 기부입니다.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 14,
  },
  summaryRow: {
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
  buttonRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderRadius: 18,
    paddingHorizontal: 8,
  },
  convertEnabled: {
    backgroundColor: colors.text,
  },
  donateEnabled: {
    backgroundColor: colors.primary,
  },
  actionDisabled: {
    backgroundColor: colors.border,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textOnPrimary,
    textAlign: 'center',
  },
  actionButtonTextDisabled: {
    color: colors.textTertiary,
  },
  nicknameInput: {
    marginTop: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  noticeBox: {
    gap: 4,
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
  },
  noticeText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textTertiary,
  },
});
