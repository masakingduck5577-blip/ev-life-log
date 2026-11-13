import {
  analyze,
  NIGHT_PLAN_PRICE,
  ownChargeCost,
  type Analysis,
  type Answers,
  type OwnChargeCost,
} from '@/analysis/analyze';
import type { EvInput } from '@/analysis/ev';
import { PARAMS } from '@/data/simulator';
import type { LocationPoint } from '@/location/source';

import { getRecordingEngine, RECORDING_DAYS, type UserSettings } from './engine';
import { useRecording } from './recording-context';

export type AnalysisResult = {
  analysis: Analysis;
  evInput: EvInput;
  own: OwnChargeCost;
};

/** 設定から、計算に使う単価などを決める */
export function toEvInput(s: UserSettings): EvInput {
  const homePrice =
    s.elecPlan === 'night' ? NIGHT_PLAN_PRICE : s.elecPlan === 'custom' && s.elecPrice > 0 ? s.elecPrice : PARAMS.homeKwhPrice;
  const publicPrice = s.publicService === 'dealerFree' ? 0 : PARAMS.publicKwhPrice;
  return { evKey: s.evKey, homeEnv: s.homeEnv, gasKmPerL: s.gasKmPerL, homePrice, publicPrice };
}

// いくつもの画面で使うので、同じ条件なら計算をくり返さない
let cache: { key: unknown[]; value: AnalysisResult | null } | null = null;
const same = (a: unknown[], b: unknown[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/** 記録の分析（運転・止まった場所・EVの計算）。記録を始めていなければ null */
export function useAnalysis(): AnalysisResult | null {
  const s = useRecording();
  return computeAnalysis(s.pointCount, s.settings, s.answers, s.startedAt, s.lastPoint, s.ready);
}

function computeAnalysis(
  pointCount: number,
  settings: UserSettings,
  answers: Answers,
  startedAt: number | null,
  lastPoint: LocationPoint | null,
  ready: boolean,
): AnalysisResult | null {
  const key = [pointCount, settings, answers, startedAt, lastPoint, ready];
  if (cache && same(cache.key, key)) return cache.value;

  let value: AnalysisResult | null = null;
  if (ready && startedAt != null) {
    const points = getRecordingEngine().getPoints();
    const evInput = toEvInput(settings);
    const until = lastPoint ? Date.parse(lastPoint.t) : startedAt;
    const analysis = analyze(points, { startedAt, days: RECORDING_DAYS, until, evInput, answers });
    value = { analysis, evInput, own: ownChargeCost(analysis, evInput, answers) };
  }
  cache = { key, value };
  return value;
}
