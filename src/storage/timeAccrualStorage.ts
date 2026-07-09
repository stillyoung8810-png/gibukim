import { Storage } from '@apps-in-toss/framework';

import type { StoredLocalTimeAccrualState } from '../domain/timeBoxAccrual';

export const TIME_ACCRUAL_STORAGE_KEY = 'gibukim:v1:time-accrual';

type StringStorage = {
  readonly getItem: (key: string) => Promise<string | null>;
  readonly setItem: (key: string, value: string) => Promise<void>;
  readonly removeItem?: (key: string) => Promise<void>;
};

export type TimeAccrualStorageGateway = {
  readonly read: () => Promise<unknown | null>;
  readonly write: (state: StoredLocalTimeAccrualState) => Promise<void>;
  readonly clear: () => Promise<void>;
};

export function createTimeAccrualStorageGateway(
  storage: StringStorage,
  storageKey: string = TIME_ACCRUAL_STORAGE_KEY,
): TimeAccrualStorageGateway {
  return {
    async read(): Promise<unknown | null> {
      const rawValue = await storage.getItem(storageKey);

      if (rawValue == null || rawValue === '') {
        return null;
      }

      try {
        return JSON.parse(rawValue) as unknown;
      } catch {
        return null;
      }
    },
    async write(state: StoredLocalTimeAccrualState): Promise<void> {
      await storage.setItem(storageKey, JSON.stringify(state));
    },
    async clear(): Promise<void> {
      if (storage.removeItem == null) {
        await storage.setItem(storageKey, '');
        return;
      }

      await storage.removeItem(storageKey);
    },
  };
}

const timeAccrualStorageGateway = createTimeAccrualStorageGateway(Storage);

export async function readTimeAccrualState(): Promise<unknown | null> {
  return timeAccrualStorageGateway.read();
}

export async function writeTimeAccrualState(state: StoredLocalTimeAccrualState): Promise<void> {
  await timeAccrualStorageGateway.write(state);
}

export async function clearTimeAccrualState(): Promise<void> {
  await timeAccrualStorageGateway.clear();
}
