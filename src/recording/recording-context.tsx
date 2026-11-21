import { useEffect, useSyncExternalStore, type ReactNode } from 'react';

import type { Clock } from '@/lib/clock';
import { jstDayNumber } from '@/lib/format';

import { getRecordingEngine, type RecordingSnapshot } from './engine';

const engine = getRecordingEngine();

/** アプリの一番外側に置く。保存してある設定を読み込み、記録を動かす。 */
export function RecordingProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    void engine.init();
  }, []);
  return <>{children}</>;
}

/** 記録の状態 */
export function useRecording(): RecordingSnapshot {
  // 3つ目は、サーバーで HTML を作るときと、ブラウザで最初に表示を合わせるときに使う（いつも「読み込む前」）
  return useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getServerSnapshot);
}

/** 記録の操作 */
export function useRecordingActions() {
  return engine;
}

/** 時計の今の時刻。時計が進むと画面も変わる（1秒より細かくは変えない） */
export function useNow(clock: Clock): number {
  const get = () => Math.floor(clock.now() / 1000) * 1000;
  return useSyncExternalStore(clock.subscribe, get, get);
}

export type RecordingStatus = 'notStarted' | 'recording' | 'stopped';

export type RecordingProgress = {
  status: RecordingStatus;
  /** 記録した日数（始めた日から今日まで、または止めた日まで）。始めていなければ 0 */
  days: number;
  /** 結果に入れる最後の時刻（今、止めた時刻、テストデータの終わりのうち早いもの） */
  until: number;
};

/** 記録の状態と、記録した日数 */
export function getProgress(snapshot: RecordingSnapshot, now: number): RecordingProgress {
  const { startedAt, endsAt, stoppedAt } = snapshot;
  if (startedAt == null) return { status: 'notStarted', days: 0, until: now };
  const until = Math.min(now, stoppedAt ?? Infinity, endsAt != null ? endsAt - 1 : Infinity);
  const days = Math.max(1, jstDayNumber(until) - jstDayNumber(startedAt) + 1);
  return { status: stoppedAt != null ? 'stopped' : 'recording', days, until };
}
