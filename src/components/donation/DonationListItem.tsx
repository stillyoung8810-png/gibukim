import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { LAYOUT, colors } from '../../constants/theme';
import { screenStyles } from '../layout/screenStyles';

type DonationListItemProps = {
  readonly title: string;
  readonly coverImageUrl: string | null;
  readonly onPress: () => void;
};

export function DonationListItem({ title, coverImageUrl, onPress }: DonationListItemProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title} 상세 보기`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed ? screenStyles.pressed : null]}
    >
      {coverImageUrl == null ? (
        <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
          <Text style={styles.thumbnailEmoji}>🤲</Text>
        </View>
      ) : (
        <Image source={{ uri: coverImageUrl }} style={styles.thumbnail} />
      )}
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: colors.surface,
  },
  thumbnail: {
    width: LAYOUT.donationThumbnailSize,
    height: LAYOUT.donationThumbnailSize,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
  },
  thumbnailPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbnailEmoji: {
    fontSize: 20,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
});
