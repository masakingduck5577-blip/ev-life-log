/**
 * Web 版シミュレーターから取り込んだデータ（scripts/import-simulator-data.mjs で作る）。
 * 計算の式と値はシミュレーターに合わせる。
 */
import raw from './simulator-data.json';

export type EvSpec = {
  name: string;
  category: string;
  kei: boolean;
  rival: string;
  photo: string;
  rangeKm: number;
  whPerKm: number;
  batteryKwh: number;
  acKw: number;
  quickKw: number;
  price: number;
  /** カタログ値を公式で確かめたか（false は仮置き） */
  verified: boolean;
  subsidy: number;
  subsidy2027: number;
};

export type GasSpec = {
  name: string;
  category: string;
  type: 'gas' | 'hv';
  photo: string;
  kmPerL: number;
  price: number;
};

export type Charger = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'quick' | 'normal';
  kw: number | null;
  network: string | null;
  hours: string | null;
  category: string | null;
  source: string;
  sourceUrl: string | null;
  checkedAt: string;
};

export type LocalSubsidy = {
  id: string;
  name: string;
  amount: number;
  amountKei: number | null;
  /** open：受付中 / soon：残りわずか / closed：終了 / none：なし / check：確認中 */
  status: 'open' | 'soon' | 'closed' | 'none' | 'check';
  until: string;
  note: string;
  url: string | null;
  checkedAt: string;
};

export type NationalSubsidy = {
  name: string;
  amountAsOf: string;
  cutDate: string;
  endText: string;
  closed?: boolean;
  checkedAt: string | null;
  url: string;
  sources: { page?: string; notice?: string; table?: string };
};

type Data = {
  source: { repo: string; commit: string | null };
  evs: Record<string, EvSpec>;
  gases: Record<string, GasSpec>;
  params: {
    gasPrice: number;
    homeKwhPrice: number;
    publicKwhPrice: number;
    chargerInstall: number;
    summerFactor: number;
    winterFactor: number;
    gasRealFactor: number;
    evRealFactor: number;
    usablePercent: number;
    homeSharePercent: number;
  };
  subsidy: { national: NationalSubsidy; local: LocalSubsidy[] };
  chargers: Charger[];
};

export const SIM = raw as unknown as Data;
export const EVS = SIM.evs;
export const GASES = SIM.gases;
export const PARAMS = SIM.params;
export const CHARGERS = SIM.chargers;
export const DEFAULT_EV = 'n-one-e';

export const isHondaCharge = (c: Charger) => c.network === 'Honda Charge';
