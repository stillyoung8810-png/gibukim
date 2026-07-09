export const conversionMessages = {
  emptyGold: '받을 수 있는 골드가 없어요.',
  pointAmountTooSmall: '받을 수 있는 토스 포인트가 아직 1P 미만이에요.',
  dailyLimitReached: '오늘 받을 수 있는 토스 포인트 한도에 도달했어요.',
  reservationLimitReached: '오늘 받을 수 있는 요청 횟수에 도달했어요. 내일 다시 시도해 주세요.',
  pendingExists: '이전 토스 포인트 지급을 먼저 확인하고 있어요.',
  rateLimited: '토스 포인트 지급 요청이 잠시 많아요. 잠시 후 다시 시도해 주세요.',
  unavailable: '토스 포인트 지급 요청을 찾을 수 없어요. 화면을 새로고침해 주세요.',
  invalidRequest: '토스 포인트 지급 요청 정보가 올바르지 않아요.',
  invalidFinancialArgs: '토스 포인트 지급 금액을 계산하지 못했어요.',
  tossSdkFailed: '토스 포인트 지급을 시작하지 못했어요. 예약 차감은 복구됩니다.',
  manualReviewRequired:
    '토스 포인트 지급 결과를 확인하고 있어요. 확인이 끝날 때까지 예약 골드는 유지됩니다.',
  manualReviewQueued: '토스 포인트 지급 확인이 필요해 운영 검토 상태로 전환했어요.',
  pendingRecovery: '이전 토스 포인트 받기 요청을 확인하고 있어요. 잠시 후 다시 시도해 주세요.',
  pendingExpiredRecovered: '만료된 토스 포인트 받기 요청을 정리하고 예약 골드를 복구했어요.',
  completed: '토스 포인트 받기가 완료되었어요.',
  networkFailed: '네트워크 상태가 불안정해요. 잠시 후 다시 시도해 주세요.',
  storageUnavailable: '지급 결과를 안전하게 저장할 수 없어 지금은 진행할 수 없어요.',
  userBlocked: '비정상적인 이용이 확인되어 토스 포인트 받기가 제한되었어요.',
  userSuspended: '토스 포인트 받기가 일시적으로 제한되었어요.',
  unconfigured: '토스 포인트 지급 설정이 아직 준비되지 않았어요.',
} as const;

export const CONVERSION_POLICY = {
  sdkStartedManualReviewAfterMs: 30 * 60 * 1_000,
} as const;
