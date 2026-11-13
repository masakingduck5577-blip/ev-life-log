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
