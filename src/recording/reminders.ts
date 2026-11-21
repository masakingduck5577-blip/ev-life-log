/**
 * 記録のお知らせ（スマホだけ。ブラウザでは何もしない）。
 *
 * - 結果のお知らせ：記録を始めた翌日・3日目・7日目の20時
 * - 記録がない日のお知らせ：記録のある日が7日たまるまで、移動の記録がない日の20時
 *   （点を受け取るたびに「次の日の20時」に予約し直す。その日に点が来れば、また先へ延びる）
 */

import { DAY_MS } from '@/lib/clock';
import { jstDayNumber, jstMidnight } from '@/lib/format';
import { cancelNotification, scheduleNotificationAt } from '@/lib/notifications';
import { getStore } from '@/storage/store';

/** お知らせの時刻（20時） */
const NOTIFY_HOUR_MS = 20 * 60 * 60 * 1000;
/** 結果を知らせる日（1日目＝記録を始めた日） */
export const RESULT_DAYS = [2, 3, 7];
/** 記録のある日がこの日数たまるまで、記録がない日を知らせる */
export const ENOUGH_RECORDED_DAYS = 7;

const MISSING_ID = 'missing-day';
const resultId = (day: number) => `result-day-${day}`;
/** 記録のある日（日本時間の日の通し番号）の一覧を保存するキー */
const ACTIVE_DAYS_KEY = 'device.activeDays';

const at20 = (dayMs: number) => jstMidnight(dayMs) + NOTIFY_HOUR_MS;

/** 記録を始めたとき：結果のお知らせを予約し、記録がない日の見張りを始める */
export async function startReminders(startedAt: number) {
  await getStore().setSetting<number[]>(ACTIVE_DAYS_KEY, []);
  for (const day of RESULT_DAYS) {
    await scheduleNotificationAt(
      resultId(day),
      at20(startedAt + (day - 1) * DAY_MS),
      `記録した${day}日間の結果を見てみましょう`,
      'あなたの毎日がEVだったら、EVのバッテリー残量がどうなるかを見られます。',
    );
  }
  await scheduleMissing(startedAt);
}

/** 記録を止めた・消したとき */
export async function stopReminders() {
  await cancelNotification(MISSING_ID);
  for (const day of RESULT_DAYS) await cancelNotification(resultId(day));
}

/** 位置の点を保存したとき（バックグラウンドのタスクからも呼ぶ） */
export async function onPointsRecorded(lastPointMs: number) {
  const store = getStore();
  const today = jstDayNumber(lastPointMs);
  const days = (await store.getSetting<number[]>(ACTIVE_DAYS_KEY)) ?? [];
  if (days.includes(today)) return; // その日の分は、もう予約し直してある
  const next = [...days, today];
  await store.setSetting(ACTIVE_DAYS_KEY, next);
  if (next.length >= ENOUGH_RECORDED_DAYS) await cancelNotification(MISSING_ID);
  else await scheduleMissing(lastPointMs);
}

/** 次の日の20時に「今日は記録がありません」を予約する */
function scheduleMissing(lastActiveMs: number) {
  return scheduleNotificationAt(
    MISSING_ID,
    at20(lastActiveMs + DAY_MS),
    '今日は移動の記録がありません',
    '出かけた日なら、位置の使用が「常に」になっているか確かめてください。家にいた日なら、このままで大丈夫です。',
  );
}
