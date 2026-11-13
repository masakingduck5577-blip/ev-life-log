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
  /** このシナリオに合わせる設定（シナリオを選んだときに変える） */
  homeEnv: 'have' | 'none';
  carType: 'gas' | 'ownEv';
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
    homeEnv: 'have',
    carType: 'gas',
    start: WEEK_START,
    available: true,
    load: () => require('../../assets/test/scenario-a.json') as LocationPoint[],
  },
  {
    id: 'B',
    title: '同じ移動（家で充電できない）',
    description: 'Aと同じ移動で、家に充電設備がない場合。',
    homeEnv: 'none',
    carType: 'gas',
    start: WEEK_START,
    available: true,
    load: () => require('../../assets/test/scenario-a.json') as LocationPoint[],
  },
  {
    id: 'C',
    title: '週末に遠出（日光）',
    description: '平日は通勤、土曜に日光へ車で出かける（片道約50km）。日曜はバスと電車。',
    homeEnv: 'have',
    carType: 'gas',
    start: WEEK_START,
    available: true,
    load: () => require('../../assets/test/scenario-c.json') as LocationPoint[],
  },
  {
    id: 'D',
    title: 'お迎えが多い',
    description: '夕方に駅へお迎え（車の中で10〜20分待つ）が週5回。水曜はバスで通勤。',
    homeEnv: 'have',
    carType: 'gas',
    start: WEEK_START,
    available: true,
    load: () => require('../../assets/test/scenario-d.json') as LocationPoint[],
  },
  {
    id: 'E',
    title: 'EVに乗っている人',
    description: '金曜の帰りに充電スポットで急速充電。ふだんは家で充電。土曜は電車。',
    homeEnv: 'have',
    carType: 'ownEv',
    start: WEEK_START,
    available: true,
    load: () => require('../../assets/test/scenario-e.json') as LocationPoint[],
  },
];

export const DEFAULT_SCENARIO: ScenarioId = 'A';

export function getScenario(id: ScenarioId): Scenario {
  return SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];
}
