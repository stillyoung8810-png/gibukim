import React, { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BOX_TAP_REQUIRED_COUNT, GOLD_PER_BOX_OPEN } from '../../mock/mockAppState';
import { colors } from '../../constants/theme';
import { screenStyles } from '../layout/screenStyles';
import { RewardBox, type RewardBoxHandle } from './RewardBox';

type RewardBoxCardProps = {
  readonly goldBalance: number;
  readonly availableBoxCount: number;
  readonly hasBoxOpenOpportunity: boolean;
  readonly validTapCount: number;
  readonly isBusy?: boolean;
  readonly onOpenPointScreen: () => void;
  readonly onBoxTap: () => void;
  readonly onRequestOpportunity: () => void;
};

function getGuideLabel(params: {
  readonly availableBoxCount: number;
  readonly hasBoxOpenOpportunity: boolean;
  readonly validTapCount: number;
}): string {
  if (!params.hasBoxOpenOpportunity) {
    return '상자 열기 기회를 받아주세요';
  }
  if (params.availableBoxCount === 0) {
    return '상자를 모은 뒤 열어보세요';
  }
  if (params.validTapCount > 0) {
    return `상자 열기 ${params.validTapCount}/${BOX_TAP_REQUIRED_COUNT}`;
  }
  return `상자를 ${BOX_TAP_REQUIRED_COUNT}번 탭하면 열려요`;
}

export function RewardBoxCard({
  goldBalance,
  availableBoxCount,
  hasBoxOpenOpportunity,
  validTapCount,
  isBusy = false,
  onOpenPointScreen,
  onBoxTap,
  onRequestOpportunity,
}: RewardBoxCardProps) {
  const rewardBoxRef = useRef<RewardBoxHandle>(null);
  const isBoxDisabled = !hasBoxOpenOpportunity || availableBoxCount === 0 || isBusy;
  const isOpportunityDisabled = hasBoxOpenOpportunity || isBusy;

  function handleBoxPress() {
    rewardBoxRef.current?.animateBoxTap();
    onBoxTap();
  }

  return (
    <View style={screenStyles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>기부 상자</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`골드 지갑 ${goldBalance}골드, 포인트 화면으로 이동`}
          onPress={onOpenPointScreen}
          style={({ pressed }) => [styles.goldWalletButton, pressed ? screenStyles.pressed : null]}
        >
          <Text style={styles.goldWalletButtonText}>골드 지갑 {goldBalance}골드</Text>
        </Pressable>
      </View>

      <View style={styles.panel}>
        <RewardBox
          ref={rewardBoxRef}
          disabled={isBoxDisabled}
          showPing={hasBoxOpenOpportunity && availableBoxCount > 0}
          onPress={handleBoxPress}
        />
        <Text style={styles.count}>x{availableBoxCount}</Text>
        <Text style={styles.boxLabel}>일반 상자 ({GOLD_PER_BOX_OPEN}골드)</Text>
        <View style={[styles.guideBoard, isBoxDisabled ? styles.guideBoardDisabled : null]}>
          <View style={[styles.guideSignal, isBoxDisabled ? styles.guideSignalDisabled : null]} />
          <Text style={[styles.guideText, isBoxDisabled ? styles.guideTextDisabled : null]}>
            {getGuideLabel({ availableBoxCount, hasBoxOpenOpportunity, validTapCount })}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="상자 열기 기회 받기"
          accessibilityState={{ disabled: isOpportunityDisabled }}
          disabled={isOpportunityDisabled}
          onPress={onRequestOpportunity}
          style={({ pressed }) => [
            styles.opportunityButton,
            isOpportunityDisabled ? styles.opportunityButtonDisabled : null,
            pressed && !isOpportunityDisabled ? screenStyles.pressed : null,
          ]}
        >
          <Text
            style={[
              styles.opportunityButtonText,
              isOpportunityDisabled ? styles.opportunityButtonTextDisabled : null,
            ]}
          >
            {hasBoxOpenOpportunity ? '상자 열기 기회 보유 중' : '상자 열기 기회 받기'}
          </Text>
        </Pressable>
        <Text style={styles.touchGuide}>상자를 눌러 골드를 모아요</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  cardTitle: {
    flexShrink: 1,
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  goldWalletButton: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
  },
  goldWalletButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.primaryPressed,
    textAlign: 'center',
  },
  panel: {
    alignItems: 'center',
    paddingTop: 8,
    paddingHorizontal: 12,
    paddingBottom: 2,
  },
  count: {
    marginTop: 10,
    fontSize: 20,
    fontWeight: '900',
    color: colors.accent,
  },
  boxLabel: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  guideBoard: {
    marginTop: 14,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
  },
  guideBoardDisabled: {
    backgroundColor: colors.surfaceMuted,
  },
  guideSignal: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  guideSignalDisabled: {
    backgroundColor: colors.textTertiary,
  },
  guideText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  guideTextDisabled: {
    color: colors.textTertiary,
  },
  opportunityButton: {
    marginTop: 14,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 18,
    backgroundColor: colors.primary,
  },
  opportunityButtonDisabled: {
    backgroundColor: colors.border,
  },
  opportunityButtonText: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textOnPrimary,
  },
  opportunityButtonTextDisabled: {
    color: colors.textTertiary,
  },
  touchGuide: {
    marginTop: 10,
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
