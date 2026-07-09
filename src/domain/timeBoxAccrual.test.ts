import { GIBUKIM_POLICY } from './gibukimPolicy';
import {
  applyBoostAfterRewardAd,
  computeTimeBoxAccrual,
  createInitialLocalTimeAccrualState,
  getNextBoxAccrualProgress,
  getNextBoxRemainingMs,
} from './timeBoxAccrual';

const HOUR_MS = 60 * 60 * 1_000;

describe('timeBoxAccrual', () => {
  it('earns one box after one hour without boost', () => {
    const state = createInitialLocalTimeAccrualState(0);
    const result = computeTimeBoxAccrual({
      state,
      nowMs: HOUR_MS,
      availableBoxCount: 0,
    });

    expect(result.earnedBoxCount).toBe(1);
    expect(result.nextRemainderBoxUnits).toBeCloseTo(0);
  });

  it('earns two boxes in one hour while boost is active', () => {
    const boosted = applyBoostAfterRewardAd(createInitialLocalTimeAccrualState(0), 0);
    expect(boosted.type).toBe('applied');
    if (boosted.type !== 'applied') {
      return;
    }

    const result = computeTimeBoxAccrual({
      state: boosted.state,
      nowMs: HOUR_MS,
      availableBoxCount: 0,
    });

    expect(result.earnedBoxCount).toBe(2);
  });

  it('halves remaining time while boost is active', () => {
    const boosted = applyBoostAfterRewardAd(createInitialLocalTimeAccrualState(0), 0);
    expect(boosted.type).toBe('applied');
    if (boosted.type !== 'applied') {
      return;
    }

    expect(getNextBoxRemainingMs(boosted.state, 0, 0)).toBe(
      GIBUKIM_POLICY.boxAccrualIntervalMs / GIBUKIM_POLICY.boostMultiplier,
    );
    expect(getNextBoxAccrualProgress(boosted.state, HOUR_MS / 4, 0)).toBe(0.5);
  });

  it('extends boost from the current end when already active', () => {
    const first = applyBoostAfterRewardAd(createInitialLocalTimeAccrualState(0), 0);
    expect(first.type).toBe('applied');
    if (first.type !== 'applied') {
      return;
    }

    const second = applyBoostAfterRewardAd(first.state, HOUR_MS);
    expect(second.type).toBe('applied');
    if (second.type !== 'applied') {
      return;
    }

    expect(second.state.boostEndsAtMs).toBe(
      (first.state.boostEndsAtMs as number) + GIBUKIM_POLICY.boostDurationMs,
    );
    expect(second.state.dailyBoostUsedCount).toBe(2);
  });
});
