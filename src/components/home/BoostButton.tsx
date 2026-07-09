import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '../../constants/theme';
import { screenStyles } from '../layout/screenStyles';

type BoostButtonProps = {
  readonly isBoostActive: boolean;
  readonly boostRemainingLabel: string | null;
  readonly disabled?: boolean;
  readonly onPress: () => void;
};

export function BoostButton({
  isBoostActive,
  boostRemainingLabel,
  disabled = false,
  onPress,
}: BoostButtonProps) {
  const label =
    isBoostActive && boostRemainingLabel != null
      ? `부스트 2배 · ${boostRemainingLabel} 남음`
      : '부스트 받기';
  const isDisabled = disabled;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isBoostActive ? styles.buttonActive : null,
        isDisabled && !isBoostActive ? styles.buttonDisabled : null,
        pressed && !isDisabled ? screenStyles.pressed : null,
      ]}
    >
      <Text
        style={[
          styles.text,
          isBoostActive ? styles.textActive : null,
          isDisabled && !isBoostActive ? styles.textDisabled : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: 12,
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 15,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  buttonActive: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
  },
  buttonDisabled: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
  },
  text: {
    color: colors.primary,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  textActive: {
    color: colors.success,
  },
  textDisabled: {
    color: colors.textTertiary,
  },
});
