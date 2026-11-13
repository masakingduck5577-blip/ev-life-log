/**
 * 時計。画面の「あと○日」などは、すべてこの時計から計算する。
 * - 本当の時計（スマホで実際に記録するとき）
 * - 早送りできる時計（Web とテストデータのとき）
 */

export type Clock = {
  /** 今の時刻（ミリ秒） */
  now(): number;
  /** 時刻が進んだら呼ばれる。戻り値を呼ぶと止める。 */
  subscribe(listener: () => void): () => void;
};

/** 再生の速さ。'instant' は「一気に」（終わりまで飛ぶ） */
export type PlaybackSpeed = 1 | 60 | 'instant';

export type SimClock = Clock & {
  readonly kind: 'sim';
  /** 速さ（倍）。0 は止まっている */
  getRate(): number;
  setRate(rate: number): void;
  /** その時刻へ飛ぶ */
  jumpTo(ms: number): void;
  /** 時計を止める（後片付け） */
  dispose(): void;
};

const TICK_MS = 250;

function createTicker(listeners: Set<() => void>) {
  let timer: ReturnType<typeof setInterval> | null = null;
  return {
    ensure() {
      if (timer == null && listeners.size > 0) {
        timer = setInterval(() => listeners.forEach((l) => l()), TICK_MS);
      }
    },
    stopIfIdle() {
      if (timer != null && listeners.size === 0) {
        clearInterval(timer);
        timer = null;
      }
    },
    dispose() {
      if (timer != null) clearInterval(timer);
      timer = null;
    },
  };
}

export function createRealClock(): Clock {
  const listeners = new Set<() => void>();
  const ticker = createTicker(listeners);
  return {
    now: () => Date.now(),
    subscribe(listener) {
      listeners.add(listener);
      ticker.ensure();
      return () => {
        listeners.delete(listener);
        ticker.stopIfIdle();
      };
    },
  };
}

/**
 * 早送りできる時計。
 * 時刻 = 基準の時刻 + （本当の経過時間 × 速さ）。上限（end）より先へは進まない。
 */
export function createSimClock(options: { start: number; end: number; rate: number }): SimClock {
  const listeners = new Set<() => void>();
  const ticker = createTicker(listeners);
  let baseSim = options.start;
  let baseReal = Date.now();
  let rate = options.rate;

  const now = () => Math.min(options.end, baseSim + (Date.now() - baseReal) * rate);
  const rebase = () => {
    baseSim = now();
    baseReal = Date.now();
  };
  const notify = () => listeners.forEach((l) => l());

  return {
    kind: 'sim',
    now,
    subscribe(listener) {
      listeners.add(listener);
      ticker.ensure();
      return () => {
        listeners.delete(listener);
        ticker.stopIfIdle();
      };
    },
    getRate: () => rate,
    setRate(next) {
      rebase();
      rate = next;
      notify();
    },
    jumpTo(ms) {
      baseSim = Math.max(options.start, Math.min(options.end, ms));
      baseReal = Date.now();
      notify();
    },
    dispose: () => ticker.dispose(),
  };
}

export const DAY_MS = 24 * 60 * 60 * 1000;
