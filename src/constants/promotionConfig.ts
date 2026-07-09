export const GIBUKIM_PROMOTION_CODE_PLACEHOLDER = 'REPLACE_WITH_TOSS_PROMOTION_CODE';

export const gibukimPromotionConfig = {
  // 배포 전 Apps in Toss 콘솔의 하루기부 프로모션 코드로 교체하세요.
  promotionCode: GIBUKIM_PROMOTION_CODE_PLACEHOLDER,
  // QR 테스트 중에는 TEST_{promotionCode}로 호출하고, 운영 전환 시 false로 변경합니다.
  useTestPromotionCode: true,
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
