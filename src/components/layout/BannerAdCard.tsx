import { InlineAd } from '@apps-in-toss/framework';
import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { screenStyles } from './screenStyles';

type BannerAdCardProps = {
  readonly adGroupId: string;
  readonly slotStyle?: StyleProp<ViewStyle>;
};

export function BannerAdCard({ adGroupId, slotStyle }: BannerAdCardProps) {
  return (
    <View style={screenStyles.adCard}>
      <View style={[screenStyles.adSlot, slotStyle]}>
        <InlineAd adGroupId={adGroupId} variant="card" impressFallbackOnMount={true} />
      </View>
    </View>
  );
}
