import { StyleSheet } from 'react-native';

import { LAYOUT, colors } from '../../constants/theme';

export const screenStyles = StyleSheet.create({
  section: {
    gap: LAYOUT.sectionGap,
  },
  card: {
    padding: LAYOUT.cardPadding,
    borderRadius: LAYOUT.cardBorderRadius,
    backgroundColor: colors.surface,
  },
  heroCard: {
    padding: LAYOUT.cardPadding + 2,
    borderRadius: LAYOUT.heroBorderRadius,
    backgroundColor: colors.backgroundMuted,
  },
  adCard: {
    borderRadius: LAYOUT.adCardBorderRadius,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  adSlot: {
    width: '100%',
  },
  imageBannerSlot: {
    height: LAYOUT.imageBannerHeight,
  },
  noticeCard: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
  },
  noticeText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
  },
  cardDescription: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.78,
  },
});
