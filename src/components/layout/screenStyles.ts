import { StyleSheet } from 'react-native';

import { LAYOUT, colors } from '../../constants/theme';

const softCardShadow = {
  shadowColor: colors.text,
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.08,
  shadowRadius: 18,
  elevation: 3,
};

export const screenStyles = StyleSheet.create({
  section: {
    gap: LAYOUT.sectionGap,
  },
  cardShadow: softCardShadow,
  card: {
    padding: LAYOUT.cardPadding,
    borderRadius: LAYOUT.cardBorderRadius,
    backgroundColor: colors.surfaceTranslucent,
    ...softCardShadow,
  },
  heroCard: {
    padding: LAYOUT.cardPadding + 2,
    borderRadius: LAYOUT.heroBorderRadius,
    backgroundColor: colors.backgroundMuted,
    ...softCardShadow,
  },
  adCardShadow: {
    borderRadius: LAYOUT.adCardBorderRadius,
    ...softCardShadow,
  },
  adCard: {
    borderRadius: LAYOUT.adCardBorderRadius,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceTranslucent,
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
    ...softCardShadow,
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
