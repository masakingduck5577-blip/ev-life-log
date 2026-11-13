import { Platform } from 'react-native';

import {
  createRealClock,
  createSimClock,
  DAY_MS,
  type Clock,
  type PlaybackSpeed,
  type SimClock,
} from '@/lib/clock';
import { jstDayNumber, jstMidnight } from '@/lib/format';
import { createReplaySource, type ReplaySource } from '@/location/replay';
import { createDeviceSource, type LocationPoint, type LocationSource } from '@/location/source';
import { getStore } from '@/storage/store';

import { DEVICE_DATASET, testDataset } from './datasets';
import { DEFAULT_SCENARIO, getScenario, type ScenarioId } from './scenarios';

/**
 * 記録の中心。時計・位置の取得元・保存をまとめて動かす。
 * 画面は useRecording()（recording-context.tsx）からこの状態を読む。
 *
 * - device：スマホで本当に記録する（本当の時計＋expo-location）
 * - test：テストデータを流す（早送りできる時計＋replay）。Web では常にこちら。
 */

export type RecordingMode = 'device' | 'test';
/** どの車で記録するか（はじめに の画面で選ぶ） */
export type CarType = 'gas' | 'loanerEv' | 'ownEv';

export const RECORDING_DAYS = 7;
/** テストデータの「最初から」「○日目へ」で始める時刻（朝6時） */
const DAY_START_OFFSET = 6 * 60 * 60 * 1000;

export type RecordingSnapshot = {
  ready: boolean;
  onboarded: boolean;
  carType: CarType | null;
  mode: RecordingMode;
  /** スマホで「テストデータで試す」に切り替えられるか（Web は常にテストデータ） */
  canUseDevice: boolean;
  scenarioId: ScenarioId;
  speed: PlaybackSpeed;
  clock: Clock;
  /** 記録の始まりと終わり（ミリ秒）。まだ始めていなければ null */
  startedAt: number | null;
  endsAt: number | null;
  /** 途中で止めた時刻 */
  stoppedAt: number | null;
  pointCount: number;
  lastPoint: LocationPoint | null;
  /** 1日目〜7日目の点の数 */
  dayCounts: number[];
  error: string | null;
};

const KEYS = {
  onboarded: 'onboarding.done',
  carType: 'onboarding.carType',
  mode: 'mode',
  scenario: 'test.scenario',
  testClock: 'test.clock',
  deviceStartedAt: 'device.startedAt',
  deviceStoppedAt: 'device.stoppedAt',
} as const;

type SavedTestClock = { scenarioId: ScenarioId; simTime: number; speed: PlaybackSpeed };

const IS_WEB = Platform.OS === 'web';

function endOfRecording(startedAt: number) {
  return jstMidnight(startedAt) + RECORDING_DAYS * DAY_MS;
}

function countByDay(points: LocationPoint[], startedAt: number | null): number[] {
  const counts = new Array(RECORDING_DAYS).fill(0);
  if (startedAt == null) return counts;
  const first = jstDayNumber(startedAt);
  for (const p of points) {
    const i = jstDayNumber(Date.parse(p.t)) - first;
    if (i >= 0 && i < RECORDING_DAYS) counts[i]++;
  }
  return counts;
}

class RecordingEngine {
  private store = getStore();
  private listeners = new Set<() => void>();
  private realClock = createRealClock();
  private snapshot: RecordingSnapshot = {
    ready: false,
    onboarded: false,
    carType: null,
    mode: IS_WEB ? 'test' : 'device',
    canUseDevice: !IS_WEB,
    scenarioId: DEFAULT_SCENARIO,
    speed: 60,
    clock: this.realClock,
    startedAt: null,
    endsAt: null,
    stoppedAt: null,
    pointCount: 0,
    lastPoint: null,
    dayCounts: new Array(RECORDING_DAYS).fill(0),
    error: null,
  };

  private initPromise: Promise<void> | null = null;
  private source: LocationSource | null = null;
  private unsubscribeSource: (() => void) | null = null;
  private unsubscribeClock: (() => void) | null = null;
  // テストデータのとき
  private simClock: SimClock | null = null;
  private replay: ReplaySource | null = null;
  private data: LocationPoint[] = [];
  private lastClockSave = 0;

  /** 読み込む前の状態。サーバーで作った HTML と、ブラウザでの最初の表示をそろえるために使う */
  private readonly initialSnapshot = this.snapshot;

  /* ---------- 読む ---------- */
  getSnapshot = () => this.snapshot;
  getServerSnapshot = () => this.initialSnapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  private set(patch: Partial<RecordingSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((l) => l());
  }

  private get dataset() {
    return this.snapshot.mode === 'test' ? testDataset(this.snapshot.scenarioId) : DEVICE_DATASET;
  }

  /* ---------- はじめ ---------- */
  init() {
    if (!this.initPromise) this.initPromise = this.doInit();
    return this.initPromise;
  }

  private async doInit() {
    try {
      const s = this.store;
      const onboarded = (await s.getSetting<boolean>(KEYS.onboarded)) ?? false;
      const carType = await s.getSetting<CarType>(KEYS.carType);
      const mode: RecordingMode = IS_WEB
        ? 'test'
        : ((await s.getSetting<RecordingMode>(KEYS.mode)) ?? 'device');
      const scenarioId = (await s.getSetting<ScenarioId>(KEYS.scenario)) ?? DEFAULT_SCENARIO;
      this.set({ onboarded, carType, mode, scenarioId });
      await this.setUp();
      this.set({ ready: true });
    } catch (e) {
      this.set({ ready: true, error: String(e) });
    }
  }

  private async setUp() {
    if (this.snapshot.mode === 'test') await this.setUpTest();
    else await this.setUpDevice();
  }

  private async tearDown() {
    this.unsubscribeSource?.();
    this.unsubscribeSource = null;
    this.unsubscribeClock?.();
    this.unsubscribeClock = null;
    // スマホの記録は、テストデータに切り替えても止めない（裏で動き続ける）
    if (this.source?.kind === 'test') await this.source.stop();
    this.source = null;
    this.replay = null;
    this.simClock?.dispose();
    this.simClock = null;
    this.data = [];
  }

  /* ---------- テストデータ ---------- */
  private async setUpTest() {
    let scenario = getScenario(this.snapshot.scenarioId);
    if (!scenario.available || !scenario.load) scenario = getScenario(DEFAULT_SCENARIO);
    this.data = scenario.load!();

    const start = Date.parse(scenario.start);
    const end = endOfRecording(start);
    const saved = await this.store.getSetting<SavedTestClock>(KEYS.testClock);
    const resume = saved && saved.scenarioId === scenario.id ? saved : null;
    const speed: PlaybackSpeed = resume?.speed ?? 60;
    const simTime = resume?.simTime ?? start + DAY_START_OFFSET;

    const clock = createSimClock({ start, end, rate: 0 });
    this.simClock = clock;
    this.replay = createReplaySource(this.data, clock);
    this.source = this.replay;
    this.unsubscribeSource = this.replay.subscribe((batch) => void this.onPoints(batch, true));
    this.unsubscribeClock = clock.subscribe(() => this.saveTestClock(false));

    this.set({
      scenarioId: scenario.id,
      speed,
      clock,
      startedAt: start,
      endsAt: end,
      stoppedAt: null,
    });
    await this.rebuildTestPoints(simTime);
    if (this.snapshot.onboarded) await this.play();
  }

  /** 時計を target に合わせ、保存してある点を「target までのテストデータ」と同じにする */
  private async rebuildTestPoints(target: number) {
    const clock = this.simClock;
    const replay = this.replay;
    if (!clock || !replay) return;
    await replay.stop();
    clock.jumpTo(target);
    const now = clock.now();
    const upTo = this.data.filter((p) => Date.parse(p.t) <= now);
    const dataset = this.dataset;
    const stored = await this.store.countPoints(dataset);
    if (stored !== upTo.length) {
      await this.store.clearPoints(dataset);
      await this.store.addPoints(dataset, upTo);
    }
    replay.resumeAfter(now);
    this.set({
      pointCount: upTo.length,
      lastPoint: upTo.length ? upTo[upTo.length - 1] : null,
      dayCounts: countByDay(upTo, this.snapshot.startedAt),
    });
    this.saveTestClock(true);
  }

  private async play() {
    const { speed } = this.snapshot;
    this.simClock?.setRate(speed === 'instant' ? 0 : speed);
    await this.replay?.start();
  }

  private saveTestClock(force: boolean) {
    const clock = this.simClock;
    if (!clock) return;
    const now = Date.now();
    if (!force && now - this.lastClockSave < 2000) return;
    this.lastClockSave = now;
    void this.store.setSetting<SavedTestClock>(KEYS.testClock, {
      scenarioId: this.snapshot.scenarioId,
      simTime: clock.now(),
      speed: this.snapshot.speed,
    });
  }

  /* ---------- スマホの記録 ---------- */
  private async setUpDevice() {
    const startedAt = await this.store.getSetting<number>(KEYS.deviceStartedAt);
    const stoppedAt = await this.store.getSetting<number>(KEYS.deviceStoppedAt);
    this.source = createDeviceSource();
    this.unsubscribeSource =
      this.source?.subscribe((batch) => void this.onPoints(batch, false)) ?? null;
    this.unsubscribeClock = this.realClock.subscribe(() => void this.checkDeviceEnd());

    const points = await this.store.getPoints(DEVICE_DATASET);
    this.set({
      clock: this.realClock,
      speed: 1,
      startedAt,
      endsAt: startedAt != null ? endOfRecording(startedAt) : null,
      stoppedAt,
      pointCount: points.length,
      lastPoint: points.length ? points[points.length - 1] : null,
      dayCounts: countByDay(points, startedAt),
    });
    // 記録中なら、取得が動いているか確かめる（アプリを入れ直したときなど）
    if (startedAt != null && stoppedAt == null && Date.now() < endOfRecording(startedAt)) {
      await this.source?.start().catch((e) => this.set({ error: String(e) }));
    }
  }

  private async checkDeviceEnd() {
    const { endsAt, stoppedAt, mode } = this.snapshot;
    if (mode !== 'device' || endsAt == null || stoppedAt != null) return;
    if (this.realClock.now() >= endsAt) await this.source?.stop();
  }

  private async startDeviceRecording() {
    const startedAt = Date.now();
    await this.store.clearPoints(DEVICE_DATASET);
    await this.store.setSetting(KEYS.deviceStartedAt, startedAt);
    await this.store.removeSetting(KEYS.deviceStoppedAt);
    this.set({
      startedAt,
      endsAt: endOfRecording(startedAt),
      stoppedAt: null,
      pointCount: 0,
      lastPoint: null,
      dayCounts: countByDay([], startedAt),
    });
    try {
      await this.source?.start();
    } catch (e) {
      this.set({ error: String(e) });
    }
  }

  /* ---------- 点を受け取る ---------- */
  private async onPoints(batch: LocationPoint[], save: boolean) {
    // スマホの点は、バックグラウンドのタスクがすでに保存している
    if (save) await this.store.addPoints(this.dataset, batch);
    const { startedAt, dayCounts, pointCount } = this.snapshot;
    const added = countByDay(batch, startedAt);
    this.set({
      pointCount: pointCount + batch.length,
      lastPoint: batch[batch.length - 1],
      dayCounts: dayCounts.map((n, i) => n + added[i]),
    });
  }

  /* ---------- 操作 ---------- */
  async completeOnboarding(carType: CarType) {
    await this.init();
    await this.store.setSetting(KEYS.onboarded, true);
    await this.store.setSetting(KEYS.carType, carType);
    this.set({ onboarded: true, carType });
    if (this.snapshot.mode === 'test') await this.play();
    else if (this.snapshot.startedAt == null || this.snapshot.stoppedAt != null) {
      await this.startDeviceRecording();
    }
  }

  /** はじめの画面からやり直す（記録も消す） */
  async resetOnboarding() {
    await this.init();
    await this.store.setSetting(KEYS.onboarded, false);
    this.set({ onboarded: false });
    if (this.snapshot.mode === 'test') {
      this.simClock?.setRate(0);
      await this.rebuildTestPoints(Date.parse(getScenario(this.snapshot.scenarioId).start) + DAY_START_OFFSET);
    } else {
      await this.source?.stop();
      await this.store.removeSetting(KEYS.deviceStartedAt);
      await this.store.removeSetting(KEYS.deviceStoppedAt);
      await this.store.clearPoints(DEVICE_DATASET);
      this.set({ startedAt: null, endsAt: null, stoppedAt: null, pointCount: 0, lastPoint: null, dayCounts: countByDay([], null) });
    }
  }

  async stopDeviceRecording() {
    if (this.snapshot.mode !== 'device') return;
    await this.source?.stop();
    const stoppedAt = Date.now();
    await this.store.setSetting(KEYS.deviceStoppedAt, stoppedAt);
    this.set({ stoppedAt });
  }

  /** スマホだけ：本当の記録 ⇔ テストデータ */
  async setMode(mode: RecordingMode) {
    if (IS_WEB || mode === this.snapshot.mode) return;
    await this.init();
    await this.tearDown();
    await this.store.setSetting(KEYS.mode, mode);
    this.set({ mode, pointCount: 0, lastPoint: null });
    await this.setUp();
  }

  async setScenario(id: ScenarioId) {
    const scenario = getScenario(id);
    if (!scenario.available || id === this.snapshot.scenarioId) return;
    await this.tearDown();
    await this.store.setSetting(KEYS.scenario, id);
    this.set({ scenarioId: id });
    await this.setUpTest();
  }

  async setSpeed(speed: PlaybackSpeed) {
    if (!this.simClock) return;
    this.set({ speed });
    if (speed === 'instant') {
      await this.rebuildTestPoints(this.snapshot.endsAt ?? this.simClock.now());
      return;
    }
    if (this.snapshot.onboarded) this.simClock.setRate(speed);
    this.saveTestClock(true);
  }

  /** ○日目（1〜7）の朝6時へ */
  async jumpToDay(day: number) {
    const { startedAt } = this.snapshot;
    if (!this.simClock || startedAt == null) return;
    if (this.snapshot.speed === 'instant') this.set({ speed: 60 });
    await this.rebuildTestPoints(jstMidnight(startedAt) + (day - 1) * DAY_MS + DAY_START_OFFSET);
    if (this.snapshot.onboarded) await this.play();
  }

  /** 7日目の終わりへ（結果が出る状態にする） */
  async jumpToEnd() {
    const { endsAt } = this.snapshot;
    if (!this.simClock || endsAt == null) return;
    await this.rebuildTestPoints(endsAt);
  }

  /** 最初から（1日目の朝6時から） */
  async restart() {
    await this.jumpToDay(1);
  }
}

let engine: RecordingEngine | null = null;
export function getRecordingEngine() {
  if (!engine) engine = new RecordingEngine();
  return engine;
}
export type { RecordingEngine };
