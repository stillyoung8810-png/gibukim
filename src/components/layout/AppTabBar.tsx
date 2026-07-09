import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LAYOUT, colors } from '../../constants/theme';
import type { TabScreen } from '../../types/appState';
import { screenStyles } from '../layout/screenStyles';

type AppTabBarProps = {
  readonly current: TabScreen;
  readonly onSelect: (screen: TabScreen) => void;
};

const TABS: readonly { readonly key: TabScreen; readonly label: string }[] = [
  { key: 'home', label: '홈' },
  { key: 'point', label: '포인트' },
  { key: 'donation', label: '기부' },
];

export function AppTabBar({ current, onSelect }: AppTabBarProps) {
  return (
    <View style={styles.bar}>
      {TABS.map((tab) => {
        const isActive = tab.key === current;

        return (
          <Pressable
            key={tab.key}
            accessibilityRole="button"
            accessibilityLabel={`${tab.label} 탭`}
            accessibilityState={{ selected: isActive }}
            onPress={() => onSelect(tab.key)}
            style={({ pressed }) => [styles.tab, pressed ? screenStyles.pressed : null]}
          >
            <Text style={[styles.label, isActive ? styles.labelActive : null]}>{tab.label}</Text>
            {isActive ? <View style={styles.activeDot} /> : <View style={styles.activeDotPlaceholder} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: LAYOUT.tabBarHeight,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingBottom: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textTertiary,
  },
  labelActive: {
    color: colors.primary,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  activeDotPlaceholder: {
    width: 5,
    height: 5,
  },
});
