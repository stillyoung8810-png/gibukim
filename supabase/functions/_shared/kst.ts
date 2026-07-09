const KST_OFFSET_MS = 9 * 60 * 60 * 1_000;

export type UtcRange = {
  readonly startIso: string;
  readonly endIso: string;
};

export function getKstDateString(date = new Date()): string {
  const kstDate = new Date(date.getTime() + KST_OFFSET_MS);
  const year = kstDate.getUTCFullYear();
  const month = String(kstDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(kstDate.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getKstDayUtcRange(dateKst: string): UtcRange {
  const [yearText, monthText, dayText] = dateKst.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    throw new Error("Invalid KST date string");
  }

  const startUtcMs = Date.UTC(year, month - 1, day) - KST_OFFSET_MS;
  const endUtcMs = startUtcMs + 24 * 60 * 60 * 1_000;

  return {
    startIso: new Date(startUtcMs).toISOString(),
    endIso: new Date(endUtcMs).toISOString(),
  };
}
