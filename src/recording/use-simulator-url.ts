import { EVS } from '@/data/simulator';
import { buildSimulatorUrl, type SimulatorScreen } from '@/lib/simulator';

import { useRecording } from './recording-context';
import { useAnalysis } from './use-analysis';

/** 記録の結果（1年の走行距離・EV・自宅の充電）を入れた、シミュレーターの URL */
export function useSimulatorUrl(screen: SimulatorScreen = 'gas'): string {
  const { settings } = useRecording();
  const result = useAnalysis();
  const yearKm = result && result.analysis.carKm > 0 ? result.analysis.ev.yearKm : undefined;
  return buildSimulatorUrl(
    {
      annualKm: yearKm,
      evKey: settings.evKey,
      gasKey: EVS[settings.evKey]?.rival,
      gasKmPerL: settings.gasKmPerL,
      homeEnv: settings.homeEnv,
    },
    screen,
  );
}
