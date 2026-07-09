import { Txt } from '@toss/tds-react-native';
import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors } from '../../constants/theme';
import { ProgressGauge } from '../ProgressGauge';
import { screenStyles } from '../layout/screenStyles';

type HeroSectionProps = {
  readonly nextBoxRemainingLabel: string;
  readonly nextBoxProgress: number;
  readonly onRefresh?: () => void;
  readonly footer?: ReactNode;
};

export function HeroSection({ nextBoxRemainingLabel, nextBoxProgress, onRefresh, footer }: HeroSectionProps) {
  return (
    <View style={screenStyles.heroCard}>
      <View style={styles.header}>
        <View style={styles.textBlock}>
          <Txt style={styles.eyebrow}>🫧 다음 상자까지</Txt>
          <Txt typography="t2" fontWeight="heavy" style={styles.title}>
            {nextBoxRemainingLabel}
          </Txt>
        </View>
        {onRefresh == null ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="화면 갱신"
            onPress={onRefresh}
            style={({ pressed }) => [styles.refreshButton, pressed ? screenStyles.pressed : null]}
          >
            <Txt style={styles.refreshButtonText}>갱신</Txt>
          </Pressable>
        )}
      </View>
      <ProgressGauge progress={nextBoxProgress} style={styles.gauge} />
      <Txt style={styles.description}>기부 상자가 차곡차곡 쌓이고 있어요</Txt>
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  textBlock: {
    alignItems: 'center',
  },
  eyebrow: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
  },
  title: {
    marginTop: 8,
    color: colors.text,
    textAlign: 'center',
  },
  gauge: {
    marginTop: 14,
  },
  description: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  refreshButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.surface,
  },
  refreshButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
});
