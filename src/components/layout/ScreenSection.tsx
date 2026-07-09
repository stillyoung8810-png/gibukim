import React from 'react';
import { View, type ViewProps } from 'react-native';

import { screenStyles } from './screenStyles';

type ScreenSectionProps = ViewProps;

export function ScreenSection({ style, ...props }: ScreenSectionProps) {
  return <View style={[screenStyles.section, style]} {...props} />;
}
