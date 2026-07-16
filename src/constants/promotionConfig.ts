export const GIBUKIM_PROMOTION_CODE_PLACEHOLDER = 'REPLACE_WITH_TOSS_PROMOTION_CODE';

export const gibukimPromotionConfig = {
  promotionCode: '01KXM95FGFB00TXX98NHZ1KM2M',
  // QR 테스트 중에는 TEST_{promotionCode}로 호출하고, 운영 전환 시 false로 변경합니다.
  useTestPromotionCode: false,
} as const;

export function createGibukimTestPromotionCode(promotionCode: string): string {
  return `TEST_${promotionCode}`;
}

export function isGibukimPromotionCodeConfigured(promotionCode: string): boolean {
  return (
    promotionCode.trim() !== '' &&
    promotionCode !== GIBUKIM_PROMOTION_CODE_PLACEHOLDER &&
    !promotionCode.startsWith('REPLACE_WITH')
  );
}

export function getGibukimRuntimePromotionCode(params: {
  readonly promotionCode: string;
  readonly useTestPromotionCode: boolean;
}): string | null {
  if (!isGibukimPromotionCodeConfigured(params.promotionCode)) {
    return null;
  }

  return params.useTestPromotionCode
    ? createGibukimTestPromotionCode(params.promotionCode)
    : params.promotionCode;
}
