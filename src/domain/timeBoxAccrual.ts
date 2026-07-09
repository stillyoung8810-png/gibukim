import { GIBUKIM_POLICY } from './gibukimPolicy';

const KST_OFFSET_MS = 9 * 60 * 60 * 1_000;

export type LocalTimeAccrualState = {
  readonly stateDateKst: string;
  readonly dailyBoostUsedCount: number;
  readonly lastAccruedAtMs: number;
  readonly boostEndsAtMs: number | null;
  readonly accrualRemainderBoxUnits: number;
};

export type StoredLocalTimeAccrualState = LocalTimeAccrualState & {
  readonly anonymousHash: string;
  readonly lastSavedAt: string;
};

export type TimeBoxAccrualComputation = {
  readonly earnedBoxCount: number;
  readonly nextRemainderBoxUnits: number;
  readonly nextLastAccruedAtMs: number;
};

export type BoostApplyResult =
  | { readonly type: 'applied'; readonly state: LocalTimeAccrualState }
  | { readonly type: 'blocked'; readonly reason: 'dailyLimitReached' };

export function getKstDateString(nowMs: number = Date.now()): string {
  return new Date(nowMs + KST_OFFSET_MS).toISOString().slice(0, 10);
}

export function createInitialLocalTimeAccrualState(
  nowMs: number = Date.now(),
): LocalTimeAccrualState {
  return {
    stateDateKst: getKstDateString(nowMs),
    dailyBoostUsedCount: 0,
    lastAccruedAtMs: nowMs,
    boostEndsAtMs: null,
    accrualRemainderBoxUnits: 0,
  };
}

export function rolloverDailyAccrualState(
  state: LocalTimeAccrualState,
  currentDateKst: string,
): LocalTimeAccrualState {
  if (state.stateDateKst === currentDateKst) {
    return state;
  }

  return {
    ...state,
    stateDateKst: currentDateKst,
    dailyBoostUsedCount: 0,
  };
}

/** 서버 availableBoxCount와 분리된 후보 적립 계산. */
export function computeTimeBoxAccrual(params: {
  readonly state: LocalTimeAccrualState;
  readonly nowMs: number;
  readonly availableBoxCount: number;
}): TimeBoxAccrualComputation {
  const { state, nowMs, availableBoxCount } = params;

  if (!Number.isFinite(nowMs) || nowMs <= state.lastAccruedAtMs) {
    return {
      earnedBoxCount: 0,
      nextRemainderBoxUnits: state.accrualRemainderBoxUnits,
      nextLastAccruedAtMs: state.lastAccruedAtMs,
    };
  }

  const cappedNowMs = Math.min(nowMs, state.lastAccruedAtMs + GIBUKIM_POLICY.maxOfflineAccrualMs);
  const elapsedMs = Math.max(0, cappedNowMs - state.lastAccruedAtMs);
  const boostEndsAtMs = state.boostEndsAtMs ?? 0;
  const boostedMs = Math.max(0, Math.min(cappedNowMs, boostEndsAtMs) - state.lastAccruedAtMs);
  const normalMs = Math.max(0, elapsedMs - boostedMs);
  const earnedBoxUnits =
    normalMs / GIBUKIM_POLICY.boxAccrualIntervalMs +
    (boostedMs / GIBUKIM_POLICY.boxAccrualIntervalMs) * GIBUKIM_POLICY.boostMultiplier +
    state.accrualRemainderBoxUnits;
  const rawEarnedBoxCount = Math.floor(earnedBoxUnits);
  const remainingCapacity = Math.max(0, GIBUKIM_POLICY.maxStoredBoxCount - availableBoxCount);
  const earnedBoxCount = Math.min(rawEarnedBoxCount, remainingCapacity);
  const isBoxStorageFull = availableBoxCount + earnedBoxCount >= GIBUKIM_POLICY.maxStoredBoxCount;

  return {
    earnedBoxCount,
    nextRemainderBoxUnits: isBoxStorageFull ? 0 : earnedBoxUnits - rawEarnedBoxCount,
    nextLastAccruedAtMs: nowMs,
  };
}

export function applyAccrualComputation(
  state: LocalTimeAccrualState,
  computation: TimeBoxAccrualComputation,
): LocalTimeAccrualState {
  return {
    ...state,
    lastAccruedAtMs: computation.nextLastAccruedAtMs,
    accrualRemainderBoxUnits: computation.nextRemainderBoxUnits,
  };
}

export function getNextBoxAccrualIntervalMs(
  state: LocalTimeAccrualState,
  nowMs: number,
  availableBoxCount: number,
): number | null {
  if (availableBoxCount >= GIBUKIM_POLICY.maxStoredBoxCount) {
    return null;
  }

  const isBoosted = state.boostEndsAtMs != null && state.boostEndsAtMs > nowMs;
  return isBoosted
    ? GIBUKIM_POLICY.boxAccrualIntervalMs / GIBUKIM_POLICY.boostMultiplier
    : GIBUKIM_POLICY.boxAccrualIntervalMs;
}

/** 다음 상자까지 남은 시간. lastAccruedAt 이후 경과분·부스트를 실시간 반영합니다. */
export function getNextBoxRemainingMs(
  state: LocalTimeAccrualState,
  nowMs: number,
  availableBoxCount: number,
): number {
  const intervalMs = getNextBoxAccrualIntervalMs(state, nowMs, availableBoxCount);
  if (intervalMs == null) {
    return 0;
  }

  const fractionalTowardNext = getFractionalBoxUnitsTowardNext(state, nowMs);
  return Math.max(0, (1 - fractionalTowardNext) * intervalMs);
}

export function getNextBoxAccrualProgress(
  state: LocalTimeAccrualState,
  nowMs: number,
  availableBoxCount: number,
): number {
  const intervalMs = getNextBoxAccrualIntervalMs(state, nowMs, availableBoxCount);
  if (intervalMs == null) {
    return 1;
  }

  return getFractionalBoxUnitsTowardNext(state, nowMs);
}

function getFractionalBoxUnitsTowardNext(state: LocalTimeAccrualState, nowMs: number): number {
  if (!Number.isFinite(nowMs) || nowMs <= state.lastAccruedAtMs) {
    const remainder = state.accrualRemainderBoxUnits;
    return Math.min(1, Math.max(0, remainder - Math.floor(remainder)));
  }

  const cappedNowMs = Math.min(nowMs, state.lastAccruedAtMs + GIBUKIM_POLICY.maxOfflineAccrualMs);
  const elapsedMs = Math.max(0, cappedNowMs - state.lastAccruedAtMs);
  const boostEndsAtMs = state.boostEndsAtMs ?? 0;
  const boostedMs = Math.max(0, Math.min(cappedNowMs, boostEndsAtMs) - state.lastAccruedAtMs);
  const normalMs = Math.max(0, elapsedMs - boostedMs);
  const earnedBoxUnits =
    normalMs / GIBUKIM_POLICY.boxAccrualIntervalMs +
    (boostedMs / GIBUKIM_POLICY.boxAccrualIntervalMs) * GIBUKIM_POLICY.boostMultiplier +
    state.accrualRemainderBoxUnits;

  return Math.min(1, Math.max(0, earnedBoxUnits - Math.floor(earnedBoxUnits)));
}

export function applyBoostAfterRewardAd(
  state: LocalTimeAccrualState,
  nowMs: number,
): BoostApplyResult {
  const rolledOverState = rolloverDailyAccrualState(state, getKstDateString(nowMs));

  if (rolledOverState.dailyBoostUsedCount >= GIBUKIM_POLICY.maxDailyBoostUseCount) {
    return { type: 'blocked', reason: 'dailyLimitReached' };
  }

  const currentBoostEnd = rolledOverState.boostEndsAtMs ?? nowMs;
  const extensionBaseMs = Math.max(nowMs, currentBoostEnd);

  return {
    type: 'applied',
    state: {
      ...rolledOverState,
      boostEndsAtMs: extensionBaseMs + GIBUKIM_POLICY.boostDurationMs,
      dailyBoostUsedCount: rolledOverState.dailyBoostUsedCount + 1,
      lastAccruedAtMs: Math.max(rolledOverState.lastAccruedAtMs, nowMs),
    },
  };
}

export function isBoostActive(state: LocalTimeAccrualState, nowMs: number): boolean {
  return state.boostEndsAtMs != null && state.boostEndsAtMs > nowMs;
}

export function getBoostRemainingMs(state: LocalTimeAccrualState, nowMs: number): number {
  if (state.boostEndsAtMs == null) {
    return 0;
  }

  return Math.max(0, state.boostEndsAtMs - nowMs);
}

export function formatDurationLabel(durationMs: number): string {
  if (durationMs <= 0) {
    return '0분';
  }

  const totalMinutes = Math.ceil(durationMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes}분`;
  }

  if (minutes === 0) {
    return `${hours}시간`;
  }

  return `${hours}시간 ${minutes}분`;
}

export function restoreLocalTimeAccrualState(params: {
  readonly rawValue: unknown;
  readonly anonymousHash: string;
  readonly nowMs: number;
}): StoredLocalTimeAccrualState {
  const initial = createInitialLocalTimeAccrualState(params.nowMs);
  const fallback: StoredLocalTimeAccrualState = {
    ...initial,
    anonymousHash: params.anonymousHash,
    lastSavedAt: new Date(params.nowMs).toISOString(),
  };

  if (params.rawValue == null || typeof params.rawValue !== 'object' || Array.isArray(params.rawValue)) {
    return fallback;
  }

  const record = params.rawValue as Record<string, unknown>;

  if (typeof record.anonymousHash === 'string' && record.anonymousHash !== params.anonymousHash) {
    return fallback;
  }

  const lastAccruedAtMs =
    typeof record.lastAccruedAtMs === 'number' && Number.isFinite(record.lastAccruedAtMs)
      ? record.lastAccruedAtMs
      : params.nowMs;
  const boostEndsAtMs =
    typeof record.boostEndsAtMs === 'number' && Number.isFinite(record.boostEndsAtMs)
      ? record.boostEndsAtMs
      : null;
  const accrualRemainderBoxUnits =
    typeof record.accrualRemainderBoxUnits === 'number' &&
    Number.isFinite(record.accrualRemainderBoxUnits) &&
    record.accrualRemainderBoxUnits >= 0
      ? record.accrualRemainderBoxUnits
      : 0;
  const dailyBoostUsedCount =
    typeof record.dailyBoostUsedCount === 'number' &&
    Number.isInteger(record.dailyBoostUsedCount) &&
    record.dailyBoostUsedCount >= 0
      ? record.dailyBoostUsedCount
      : 0;
  const stateDateKst =
    typeof record.stateDateKst === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(record.stateDateKst)
      ? record.stateDateKst
      : getKstDateString(params.nowMs);

  const rolled = rolloverDailyAccrualState(
    {
      stateDateKst,
      dailyBoostUsedCount,
      lastAccruedAtMs,
      boostEndsAtMs,
      accrualRemainderBoxUnits,
    },
    getKstDateString(params.nowMs),
  );

  return {
    ...rolled,
    anonymousHash: params.anonymousHash,
    lastSavedAt:
      typeof record.lastSavedAt === 'string'
        ? record.lastSavedAt
        : new Date(params.nowMs).toISOString(),
  };
}

export function toStoredLocalTimeAccrualState(params: {
  readonly state: LocalTimeAccrualState;
  readonly anonymousHash: string;
  readonly nowMs: number;
}): StoredLocalTimeAccrualState {
  return {
    ...params.state,
    anonymousHash: params.anonymousHash,
    lastSavedAt: new Date(params.nowMs).toISOString(),
  };
}
