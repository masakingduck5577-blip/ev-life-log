import type { Clock } from '@/lib/clock';

import type { LocationPoint, LocationSource, PointsListener } from './source';

/**
 * テストデータを、時計に合わせて時刻の順に流す取得元。
 * Web では常にこれを使う。スマホでも開発用の設定で「テストデータで試す」にすると使う。
 *
 * 時計が進むたびに、「前に流した時刻」より後で「今の時刻」までの点をまとめて流す。
 * 時計が戻ったとき（「最初から」）は、`resumeAfter` で流し始める位置を決め直す。
 */
export type ReplaySource = LocationSource & {
  /** この時刻より後の点から流す（すでに保存してある点を二重に流さないため） */
  resumeAfter(ms: number): void;
};

export function createReplaySource(points: LocationPoint[], clock: Clock): ReplaySource {
  const times = points.map((p) => Date.parse(p.t));
  const listeners = new Set<PointsListener>();
  let index = 0; // 次に流す点
  let unsubscribeClock: (() => void) | null = null;

  const seek = (ms: number) => {
    // ms より後の最初の点（二分探索）
    let lo = 0;
    let hi = times.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (times[mid] <= ms) lo = mid + 1;
      else hi = mid;
    }
    index = lo;
  };

  const flush = () => {
    const now = clock.now();
    const start = index;
    while (index < points.length && times[index] <= now) index++;
    if (index > start) {
      const batch = points.slice(start, index);
      listeners.forEach((l) => l(batch));
    }
  };

  return {
    kind: 'test',
    async start() {
      if (unsubscribeClock) return;
      unsubscribeClock = clock.subscribe(flush);
      flush();
    },
    async stop() {
      unsubscribeClock?.();
      unsubscribeClock = null;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    resumeAfter(ms) {
      seek(ms);
    },
  };
}
