import { grantPromotionReward } from '@apps-in-toss/framework';

export type TossPointPromotionGateway = {
  readonly grantTossPoint: (pointAmount: number) => Promise<TossPointGrantResult>;
};

export type TossPointGrantResult =
  | { readonly type: 'success'; readonly tossSuccessKey: string }
  | { readonly type: 'failed'; readonly reason: TossPointGrantFailureReason };

export type TossPointGrantFailureReason =
  | 'unsupportedVersion'
  | 'promotionError'
  | 'budgetExhausted'
  | 'ambiguousUnknown';

export function createTossPointPromotionGateway(params: {
  readonly promotionCode: string;
}): TossPointPromotionGateway {
  return {
    async grantTossPoint(pointAmount: number): Promise<TossPointGrantResult> {
      if (!Number.isFinite(pointAmount) || !Number.isInteger(pointAmount) || pointAmount <= 0) {
        return { type: 'failed', reason: 'promotionError' };
      }

      try {
        const rawResult = await Promise.resolve(
          grantPromotionReward({
            params: {
              promotionCode: params.promotionCode,
              amount: pointAmount,
            },
          }),
        );

        return toTossPointGrantResult(rawResult);
      } catch {
        return { type: 'failed', reason: 'ambiguousUnknown' };
      }
    },
  };
}

export function canReleaseHoldAfterGrantFailure(reason: TossPointGrantFailureReason): boolean {
  switch (reason) {
    case 'unsupportedVersion':
    case 'promotionError':
    case 'budgetExhausted':
      return true;
    case 'ambiguousUnknown':
      return false;
    default:
      return assertNever(reason);
  }
}

function toTossPointGrantResult(input: unknown): TossPointGrantResult {
  if (input == null) {
    return { type: 'failed', reason: 'unsupportedVersion' };
  }

  if (input === 'ERROR') {
    return { type: 'failed', reason: 'ambiguousUnknown' };
  }

  if (!isRecord(input)) {
    return { type: 'failed', reason: 'ambiguousUnknown' };
  }

  const successKey = typeof input.successKey === 'string' ? input.successKey : input.key;

  if (typeof successKey === 'string' && successKey !== '') {
    return { type: 'success', tossSuccessKey: successKey };
  }

  if (typeof input.errorCode === 'string') {
    if (input.errorCode === '4109' || input.errorCode === '4112') {
      return { type: 'failed', reason: 'budgetExhausted' };
    }

    return { type: 'failed', reason: 'promotionError' };
  }

  return { type: 'failed', reason: 'ambiguousUnknown' };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${String(value)}`);
}
