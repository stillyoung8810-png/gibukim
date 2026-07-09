import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../constants/theme';
import { getRatioProgress } from '../ProgressGauge';
import { ProgressGauge } from '../ProgressGauge';
import { screenStyles } from '../layout/screenStyles';

type DonationGoalCardProps = {
  readonly title: string;
  readonly goalGold: number;
  readonly currentGold: number;
};

export function DonationGoalCard({ title, goalGold, currentGold }: DonationGoalCardProps) {
  const progress = getRatioProgress(currentGold, goalGold);
  const displayTitle = title.trim().length > 0 ? title : '다음 기부';

  return (
    <View style={screenStyles.card}>
      <Text style={styles.eyebrow}>오늘의 기부 목표</Text>
      <Text style={styles.title}>{displayTitle}</Text>
      <View style={styles.gaugeRow}>
        <ProgressGauge progress={progress} style={styles.gauge} />
        <Text style={styles.goalLabel}>{goalGold.toLocaleString()}골드</Text>
      </View>
      <Text style={styles.currentLabel}>모인 골드 {currentGold.toLocaleString()}골드</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.primary,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
  },
  gaugeRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  gauge: {
    flex: 1,
  },
  goalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.accent,
  },
  currentLabel: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
});
