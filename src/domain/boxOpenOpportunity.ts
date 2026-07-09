import { GIBUKIM_POLICY } from './gibukimPolicy';

export type BoxOpenOpportunity = {
  readonly anonymousHash: string;
  readonly idempotencyKey: string;
  readonly earnedAtMs: number;
  readonly expiresAtMs: number;
};

export type BoxOpenTapState = {
  readonly validTapCount: number;
  readonly firstTapAtMs: number | null;
  readonly lastAcceptedTapAtMs: number | null;
};

export type BoxOpenTapResult =
  | { readonly type: 'accepted'; readonly state: BoxOpenTapState }
  | {
      readonly type: 'ignored';
      readonly reason: 'tooFast';
      readonly state: BoxOpenTapState;
    }
  | { readonly type: 'expired'; readonly state: BoxOpenTapState }
  | { readonly type: 'completed'; readonly state: BoxOpenTapState };

export function createInitialBoxOpenTapState(): BoxOpenTapState {
  return {
    validTapCount: 0,
    firstTapAtMs: null,
    lastAcceptedTapAtMs: null,
  };
}

export function applyBoxTap(state: BoxOpenTapState, tappedAtMs: number): BoxOpenTapResult {
  if (!Number.isFinite(tappedAtMs)) {
    return { type: 'ignored', reason: 'tooFast', state };
  }

  const resetState = createInitialBoxOpenTapState();
  const hasStarted = state.firstTapAtMs != null;

  if (
    hasStarted &&
    tappedAtMs - (state.firstTapAtMs as number) >= GIBUKIM_POLICY.boxTapSessionExpiresInMs
  ) {
    return {
      type: 'expired',
      state: {
        ...resetState,
        validTapCount: 1,
        firstTapAtMs: tappedAtMs,
        lastAcceptedTapAtMs: tappedAtMs,
      },
    };
  }

  if (
    state.lastAcceptedTapAtMs != null &&
    tappedAtMs - state.lastAcceptedTapAtMs < GIBUKIM_POLICY.boxTapMinIntervalMs
  ) {
    return { type: 'ignored', reason: 'tooFast', state };
  }

  const nextTapCount = state.validTapCount + 1;
  const nextState = {
    validTapCount: nextTapCount,
    firstTapAtMs: state.firstTapAtMs ?? tappedAtMs,
    lastAcceptedTapAtMs: tappedAtMs,
  };

  if (nextTapCount >= GIBUKIM_POLICY.boxTapRequiredCount) {
    return { type: 'completed', state: resetState };
  }

  return { type: 'accepted', state: nextState };
}

export function createBoxOpenOpportunity(params: {
  readonly anonymousHash: string;
  readonly nowMs: number;
}): BoxOpenOpportunity {
  return {
    anonymousHash: params.anonymousHash,
    idempotencyKey: `gibukim:box-open:${params.anonymousHash}:${params.nowMs}`,
    earnedAtMs: params.nowMs,
    expiresAtMs: params.nowMs + GIBUKIM_POLICY.boxOpenOpportunityExpiresInMs,
  };
}

export function isBoxOpenOpportunityExpired(opportunity: BoxOpenOpportunity, nowMs: number): boolean {
  return !Number.isFinite(nowMs) || opportunity.expiresAtMs <= nowMs;
}

export function getActiveBoxOpenOpportunity(
  opportunity: BoxOpenOpportunity | null,
  nowMs: number,
): BoxOpenOpportunity | null {
  if (opportunity == null) {
    return null;
  }

  if (isBoxOpenOpportunityExpired(opportunity, nowMs)) {
    return null;
  }

  return opportunity;
}

export function restoreBoxOpenOpportunity(rawValue: unknown): BoxOpenOpportunity | null {
  if (rawValue == null || typeof rawValue !== 'object' || Array.isArray(rawValue)) {
    return null;
  }

  const record = rawValue as Record<string, unknown>;

  if (
    typeof record.anonymousHash !== 'string' ||
    typeof record.idempotencyKey !== 'string' ||
    typeof record.earnedAtMs !== 'number' ||
    typeof record.expiresAtMs !== 'number'
  ) {
    return null;
  }

  return {
    anonymousHash: record.anonymousHash,
    idempotencyKey: record.idempotencyKey,
    earnedAtMs: record.earnedAtMs,
    expiresAtMs: record.expiresAtMs,
  };
}
