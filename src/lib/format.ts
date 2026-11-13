/** 日本時間での表示。端末の時間帯に関係なく、日本時間で出す。 */

const JST = 9 * 60 * 60 * 1000;
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

const jst = (ms: number) => new Date(ms + JST);

/** 日本時間の「日」の通し番号（日付の差を数えるため） */
export function jstDayNumber(ms: number): number {
  return Math.floor((ms + JST) / 86400000);
}

/** その日の 0:00（日本時間）のミリ秒 */
export function jstMidnight(ms: number): number {
  return jstDayNumber(ms) * 86400000 - JST;
}

/** 11月18日（水） */
export function formatDate(ms: number): string {
  const d = jst(ms);
  return `${d.getUTCMonth() + 1}月${d.getUTCDate()}日（${WEEKDAYS[d.getUTCDay()]}）`;
}

/** 11/18（水） */
export function formatShortDate(ms: number): string {
  const d = jst(ms);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}（${WEEKDAYS[d.getUTCDay()]}）`;
}

/** 8:05 */
export function formatTime(ms: number): string {
  const d = jst(ms);
  return `${d.getUTCHours()}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString('ja-JP');
}

/** 1,234円（10円単位に丸める） */
export function formatYen(n: number): string {
  const v = Math.round(n / 10) * 10;
  return `${v < 0 ? '−' : ''}${Math.abs(v).toLocaleString('ja-JP')}円`;
}

/** 1.2万円 */
export function formatMan(n: number): string {
  return `${(n / 10000).toFixed(1).replace(/\.0$/, '')}万円`;
}

/** 12.3km（10km以上は整数） */
export function formatKm(km: number): string {
  return km >= 10 ? `${Math.round(km)}km` : `${km.toFixed(1)}km`;
}

/** 1時間20分 */
export function formatDuration(min: number): string {
  const m = Math.round(min);
  if (m < 60) return `${m}分`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h}時間${m % 60}分` : `${h}時間`;
}

/** 2026-11-18（日本時間の日付。URL に使う） */
export function dateKey(ms: number): string {
  return jst(ms).toISOString().slice(0, 10);
}

/** 2026-11-18 → その日の 0:00（日本時間） */
export function fromDateKey(key: string): number {
  return Date.parse(`${key}T00:00:00+09:00`);
}

/** 2026年11月8日 */
export function formatIsoDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${y}年${m}月${d}日`;
}
