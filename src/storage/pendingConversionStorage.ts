import { Storage } from '@apps-in-toss/framework';

export type PendingFinalizeRecord = {
  readonly conversionId: string;
  readonly anonymousHash: string;
  readonly tossSuccessKey: string;
  readonly pointAmount: number;
  readonly savedAtMs: number;
};

type StringStorage = {
  readonly getItem: (key: string) => Promise<string | null>;
  readonly setItem: (key: string, value: string) => Promise<void>;
  readonly removeItem?: (key: string) => Promise<void>;
};

export const PENDING_FINALIZE_STORAGE_KEY = 'gibukim:v1:pending-finalize';

export type PendingFinalizeStorageGateway = {
  readonly read: () => Promise<PendingFinalizeRecord | null>;
  readonly write: (record: PendingFinalizeRecord) => Promise<void>;
  readonly clear: () => Promise<void>;
  readonly assertWritable: () => Promise<void>;
};

export function createPendingFinalizeStorageGateway(
  storage: StringStorage,
  storageKey: string = PENDING_FINALIZE_STORAGE_KEY,
): PendingFinalizeStorageGateway {
  return {
    async read(): Promise<PendingFinalizeRecord | null> {
      const rawValue = await storage.getItem(storageKey);

      if (rawValue == null || rawValue === '') {
        return null;
      }

      try {
        return toPendingFinalizeRecord(JSON.parse(rawValue) as unknown);
      } catch {
        return null;
      }
    },
    async write(record: PendingFinalizeRecord): Promise<void> {
      await storage.setItem(storageKey, JSON.stringify(record));
    },
    async clear(): Promise<void> {
      if (storage.removeItem == null) {
        await storage.setItem(storageKey, '');
        return;
      }

      await storage.removeItem(storageKey);
    },
    async assertWritable(): Promise<void> {
      const probeRecord: PendingFinalizeRecord = {
        conversionId: 'probe',
        anonymousHash: 'probe',
        tossSuccessKey: 'probe',
        pointAmount: 1,
        savedAtMs: 0,
      };
      await storage.setItem(`${storageKey}:probe`, JSON.stringify(probeRecord));

      if (storage.removeItem != null) {
        await storage.removeItem(`${storageKey}:probe`);
      }
    },
  };
}

const pendingFinalizeStorageGateway = createPendingFinalizeStorageGateway(Storage);

export async function readPendingFinalizeRecord(): Promise<PendingFinalizeRecord | null> {
  return pendingFinalizeStorageGateway.read();
}

export async function writePendingFinalizeRecord(record: PendingFinalizeRecord): Promise<void> {
  await pendingFinalizeStorageGateway.write(record);
}

export async function clearPendingFinalizeRecord(): Promise<void> {
  await pendingFinalizeStorageGateway.clear();
}

export async function assertPendingFinalizeStorageWritable(): Promise<void> {
  await pendingFinalizeStorageGateway.assertWritable();
}

function toPendingFinalizeRecord(value: unknown): PendingFinalizeRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.conversionId !== 'string' ||
    typeof value.anonymousHash !== 'string' ||
    typeof value.tossSuccessKey !== 'string' ||
    typeof value.pointAmount !== 'number' ||
    typeof value.savedAtMs !== 'number'
  ) {
    return null;
  }

  return {
    conversionId: value.conversionId,
    anonymousHash: value.anonymousHash,
    tossSuccessKey: value.tossSuccessKey,
    pointAmount: value.pointAmount,
    savedAtMs: value.savedAtMs,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
