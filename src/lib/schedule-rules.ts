import holidayJp from "@holiday-jp/holiday_jp";

/**
 * スカウト日程調整フォーム（/・/agent・/open）の日時制限ルール。
 *
 * - 日曜・祝日（振替休日を含む）は不可
 * - 開始時刻は 9:00〜20:00（20:00 開始が最後）
 * - 終了時刻は 21:00 まで
 * - 当日は「現在時刻＋3時間」以降の開始時刻のみ
 *
 * 「今日」「曜日」「現在時刻」はすべて JST（Asia/Tokyo）で明示的に判定する。
 * サーバー（Vercel=UTC）とブラウザで結果が変わらないこと。
 */

// 祝日マスタは "YYYY-MM-DD" キーの辞書。Date を経由しないので TZ の影響を受けない。
const HOLIDAYS = holidayJp.holidays as unknown as Record<string, unknown>;

/** 開始時刻の最小（分／0時起点）: 9:00 */
export const START_MIN_OF_DAY = 9 * 60;
/** 開始時刻の最大（分／0時起点）: 20:00 */
export const START_MAX_OF_DAY = 20 * 60;
/** 終了時刻の最大（分／0時起点）: 21:00 */
export const END_MAX_OF_DAY = 21 * 60;
/** 当日予約に必要なリードタイム（分）: 3時間 */
export const SAME_DAY_LEAD_MINUTES = 180;
/** 選択できる日数（当日を含む） */
export const DATE_RANGE_DAYS = 60;
/** 時刻の刻み（分） */
export const SLOT_STEP_MINUTES = 15;

export const SLOT_RULE_ERROR_MESSAGE =
  "選択された日時はご予約いただけません。お手数ですが日時を選び直してください。（日曜・祝日は不可、開始は9:00〜20:00、当日は3時間後以降の時間のみ受け付けています）";

export interface JstNow {
  /** JST の年 */
  year: number;
  /** JST の月（1-12） */
  month: number;
  /** JST の日 */
  day: number;
  /** JST の時（0-23） */
  hour: number;
  /** JST の分 */
  minute: number;
  /** JST の "YYYY-MM-DD" */
  dateStr: string;
  /** JST の 0 時起点の分 */
  minutesOfDay: number;
}

const JST_PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** 現在時刻を JST の年月日時分として取得する。 */
export function jstNow(base: Date = new Date()): JstNow {
  const parts = JST_PARTS.formatToParts(base);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "0";

  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));
  // hourCycle h23 でも環境により深夜が "24" になる場合があるため丸める
  const hour = Number(get("hour")) % 24;
  const minute = Number(get("minute"));

  return {
    year,
    month,
    day,
    hour,
    minute,
    dateStr: toDateStr(year, month, day),
    minutesOfDay: hour * 60 + minute,
  };
}

/** 年月日から "YYYY-MM-DD" を作る。 */
export function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * "YYYY-MM-DD" の曜日（0=日 〜 6=土）。
 * UTC 上で日付を組み立てて UTC の曜日を読むため、実行環境の TZ に依存しない。
 */
export function dayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** "YYYY-MM-DD" が祝日（振替休日・国民の休日を含む）か。 */
export function isHolidayDate(dateStr: string): boolean {
  return Object.prototype.hasOwnProperty.call(HOLIDAYS, dateStr);
}

/** 予約できない日（日曜 or 祝日）か。 */
export function isBlockedDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return true;
  return dayOfWeek(dateStr) === 0 || isHolidayDate(dateStr);
}

/** "YYYY-MM-DD" から n 日後の "YYYY-MM-DD"（TZ 非依存）。 */
export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return toDateStr(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

function toNumber(v: string | number): number {
  return typeof v === "number" ? v : parseInt(v, 10);
}

/**
 * その日付で選択できる開始時刻（0時起点の分）の一覧。
 * ブロック日・過去日は空配列。当日は「現在＋3時間」以降のみ。
 */
export function allowedStartMinutesOfDay(
  dateStr: string,
  now: JstNow = jstNow(),
): number[] {
  if (isBlockedDate(dateStr)) return [];
  if (dateStr < now.dateStr) return [];

  const earliest =
    dateStr === now.dateStr
      ? Math.max(START_MIN_OF_DAY, now.minutesOfDay + SAME_DAY_LEAD_MINUTES)
      : START_MIN_OF_DAY;

  const result: number[] = [];
  for (
    let t = START_MIN_OF_DAY;
    t <= START_MAX_OF_DAY;
    t += SLOT_STEP_MINUTES
  ) {
    if (t >= earliest) result.push(t);
  }
  return result;
}

/** その日付が予約可能か（選択できる開始時刻が1つ以上あるか）。 */
export function isSelectableDate(
  dateStr: string,
  now: JstNow = jstNow(),
): boolean {
  return allowedStartMinutesOfDay(dateStr, now).length > 0;
}

/**
 * 日時枠がルールを満たすか。
 * ブロック日でない かつ 開始 9:00〜20:00 かつ 終了 ≤ 21:00 かつ 終了 > 開始
 * かつ 当日なら開始 ≥ 現在＋3時間。
 */
export function isSlotAllowed(
  dateStr: string,
  startHour: string | number,
  startMinute: string | number,
  endHour: string | number,
  endMinute: string | number,
  now: JstNow = jstNow(),
): boolean {
  const sh = toNumber(startHour);
  const sm = toNumber(startMinute);
  const eh = toNumber(endHour);
  const em = toNumber(endMinute);
  if ([sh, sm, eh, em].some((n) => !Number.isFinite(n))) return false;

  const start = sh * 60 + sm;
  const end = eh * 60 + em;

  if (end <= start) return false;
  if (end > END_MAX_OF_DAY) return false;
  if (start % SLOT_STEP_MINUTES !== 0 || end % SLOT_STEP_MINUTES !== 0) {
    return false;
  }

  return allowedStartMinutesOfDay(dateStr, now).includes(start);
}

const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

/** 選択できる日付の一覧（当日から60日先まで、日曜・祝日・当日枠切れを除く）。 */
export function selectableDateOptions(
  now: JstNow = jstNow(),
): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  for (let i = 0; i < DATE_RANGE_DAYS; i++) {
    const value = addDays(now.dateStr, i);
    if (!isSelectableDate(value, now)) continue;
    const [, m, d] = value.split("-").map(Number);
    options.push({
      value,
      label: `${m}月${d}日（${DAY_NAMES[dayOfWeek(value)]}）`,
    });
  }
  return options;
}

/** 開始「時」の選択肢（文字列）。 */
export function allowedStartHours(
  dateStr: string,
  now: JstNow = jstNow(),
): string[] {
  const hours = new Set<number>();
  for (const t of allowedStartMinutesOfDay(dateStr, now)) {
    hours.add(Math.floor(t / 60));
  }
  return [...hours].sort((a, b) => a - b).map(String);
}

/** 選択中の「時」に対する開始「分」の選択肢（文字列・2桁）。 */
export function allowedStartMinutes(
  dateStr: string,
  hour: string | number,
  now: JstNow = jstNow(),
): string[] {
  const h = toNumber(hour);
  if (!Number.isFinite(h)) return [];
  return allowedStartMinutesOfDay(dateStr, now)
    .filter((t) => Math.floor(t / 60) === h)
    .map((t) => String(t % 60).padStart(2, "0"));
}

/** 終了「時」の選択肢（9〜21）。 */
export function allowedEndHours(): string[] {
  const hours: string[] = [];
  for (let h = START_MIN_OF_DAY / 60; h <= END_MAX_OF_DAY / 60; h++) {
    hours.push(String(h));
  }
  return hours;
}

/** 選択中の「時」に対する終了「分」の選択肢（21時台は 00 のみ）。 */
export function allowedEndMinutes(hour: string | number): string[] {
  const h = toNumber(hour);
  if (!Number.isFinite(h)) return [];
  const minutes: string[] = [];
  for (let m = 0; m < 60; m += SLOT_STEP_MINUTES) {
    if (h * 60 + m > END_MAX_OF_DAY) break;
    minutes.push(String(m).padStart(2, "0"));
  }
  return minutes;
}
