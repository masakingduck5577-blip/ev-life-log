import type { LocationPoint } from '@/location/source';

/**
 * テストデータのシナリオ（栃木県宇都宮市周辺の架空の1週間）。
 * データは scripts/make-test-data.mjs で作る。詳しくは assets/test/README.md。
 */

export type ScenarioId = 'A' | 'B' | 'C' | 'D' | 'E';

export type Scenario = {
  id: ScenarioId;
  title: string;
  description: string;
  /** 家で充電できるか（結果の計算で使う予定） */
  homeCharging: 'yes' | 'no';
  /** 記録の始まり（日本時間 2026-11-16（月）0:00） */
  start: string;
  /** データがあるか。false はまだ準備中 */
  available: boolean;
  load?: () => LocationPoint[];
};

const WEEK_START = '2026-11-16T00:00:00+09:00';

export const SCENARIOS: Scenario[] = [
  {
    id: 'A',
    title: '通勤＋買い物（家で充電できる）',
    description: '平日は車で通勤し、帰りにスーパーへ。土曜はバスと電車、日曜は車で買い物。',
    homeCharging: 'yes',
    start: WEEK_START,
    available: true,
    load: () => require('../../assets/test/scenario-a.json') as LocationPoint[],
  },
  {
    id: 'B',
    title: '同じ移動（家で充電できない）',
    description: 'Aと同じ移動で、家に充電設備がない場合。',
    homeCharging: 'no',
    start: WEEK_START,
    available: false,
  },
  {
    id: 'C',
    title: '週末に遠出（日光・那須）',
    description: '平日は通勤、週末に日光か那須へ車で出かける。',
    homeCharging: 'yes',
    start: WEEK_START,
    available: false,
  },
  {
    id: 'D',
    title: 'お迎えが多い',
    description: '駅で10〜20分待つことが多い1週間。',
    homeCharging: 'yes',
    start: WEEK_START,
    available: false,
  },
  {
    id: 'E',
    title: 'EVに乗っている人',
    description: '充電スポットに止まることがある1週間。',
    homeCharging: 'yes',
    start: WEEK_START,
    available: false,
  },
];

export const DEFAULT_SCENARIO: ScenarioId = 'A';

export function getScenario(id: ScenarioId): Scenario {
  return SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];
}
