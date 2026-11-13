import { useEffect, useSyncExternalStore, type ReactNode } from 'react';

import { DAY_MS, type Clock } from '@/lib/clock';
import { jstDayNumber } from '@/lib/format';

import { getRecordingEngine, RECORDING_DAYS, type RecordingSnapshot } from './engine';

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

export type RecordingStatus = 'notStarted' | 'recording' | 'finished' | 'stopped';

export type RecordingProgress = {
  status: RecordingStatus;
  /** 今日が何日目か（1〜7）。始めていなければ 0 */
  day: number;
  /** 結果が出るまであと何日 */
  daysLeft: number;
};

/** 時計から「何日目」「あと○日」を計算する */
export function getProgress(snapshot: RecordingSnapshot, now: number): RecordingProgress {
  const { startedAt, endsAt, stoppedAt } = snapshot;
  if (startedAt == null || endsAt == null) return { status: 'notStarted', day: 0, daysLeft: RECORDING_DAYS };
  if (stoppedAt != null) return { status: 'stopped', day: 0, daysLeft: 0 };
  if (now >= endsAt) return { status: 'finished', day: RECORDING_DAYS, daysLeft: 0 };
  const day = Math.min(RECORDING_DAYS, Math.max(1, jstDayNumber(now) - jstDayNumber(startedAt) + 1));
  const daysLeft = Math.max(1, Math.ceil((endsAt - now) / DAY_MS));
  return { status: 'recording', day, daysLeft };
}
