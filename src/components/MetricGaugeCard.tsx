import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../constants/theme';
import { ProgressGauge } from './ProgressGauge';
import { screenStyles } from './layout/screenStyles';

type MetricGaugeCardProps = {
  readonly title: string;
  readonly value: string;
  readonly description: string;
  readonly progress: number;
};

export function MetricGaugeCard({ title, value, description, progress }: MetricGaugeCardProps) {
  return (
    <View style={screenStyles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value}>{value}</Text>
      <ProgressGauge progress={progress} style={styles.gauge} />
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
  },
  value: {
    marginTop: 10,
    fontSize: 28,
    fontWeight: '900',
    color: colors.accent,
  },
  gauge: {
    marginTop: 14,
  },
  description: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSecondary,
  },
});
