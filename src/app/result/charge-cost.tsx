import { router } from 'expo-router';

import { Button } from '@/components/button';
import { InfoBox } from '@/components/info-box';
import { StatRow, StatTile } from '@/components/link-row';
import { Screen, Section } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { perMonth } from '@/analysis/ev';
import { formatYen } from '@/lib/format';
import { useRecording } from '@/recording/recording-context';
import { useAnalysis } from '@/recording/use-analysis';

/** E3：あなたの充電代（EVに乗っている人） */
export default function ChargeCostScreen() {
  const result = useAnalysis();
  const { answers } = useRecording();
  if (!result) {
    return (
      <Screen title="あなたの充電代" back>
        <ThemedText color="sub">まだ記録がありません。</ThemedText>
      </Screen>
    );
  }
  const { own, evInput } = result;
  const a = result.analysis;
  const unanswered = a.chargerStops.filter((c) => answers.charges?.[c.stop.id] == null).length;

  return (
    <Screen title="あなたの充電代" lead={`${a.ev.ev.name}で、1週間に${Math.round(a.carKm)}km走りました。`} back>
      <StatRow>
        <StatTile label="1週間" value={formatYen(own.weekYen)} />
        <StatTile label="1か月にすると" value={formatYen(own.monthYen)} />
        <StatTile label="1kmあたり" value={`${own.perKmYen.toFixed(1)}円`} />
      </StatRow>

      <Section title="家と外の内訳（1週間）">
        <StatRow>
          <StatTile label="家" value={formatYen(own.homeYen)} note={`約${own.homeKwh.toFixed(1)}kWh・${evInput.homePrice}円/kWh`} />
          <StatTile label="外" value={formatYen(own.publicYen)} note={`${own.publicCount}回・約${own.publicKwh.toFixed(1)}kWh`} />
        </StatRow>
        <ThemedText type="note" color="sub">
          走った距離と電費から使った電気（約{own.usedKwh.toFixed(1)}kWh）を出し、外で入れた分の残りを家で入れたと推定しています。
          {own.paidKnown ? ` 外の充電のうち${own.paidKnown}回は、入れた金額で計算しています。` : ''}
        </ThemedText>
        {unanswered > 0 ? (
          <InfoBox>{`充電スポットに止まったのに、まだ答えていない記録が${unanswered}件あります。1日の記録で「ここで充電しましたか？」に答えると、外の充電代に入ります。`}</InfoBox>
        ) : null}
      </Section>

      <Section title="ガソリン車だった場合と比べると">
        <StatRow>
          <StatTile label="ガソリン車（1か月）" value={formatYen(perMonth(own.gasYen))} note={a.ev.gasName} />
          <StatTile label="あなたの充電代（1か月）" value={formatYen(own.monthYen)} />
        </StatRow>
      </Section>

      <Section title="もっと安くするなら">
        {own.nightPlanYen != null && own.nightPlanYen < own.weekYen ? (
          <ThemedText>
            ・夜が安いプランにすると、1か月 約{formatYen(perMonth(own.weekYen - own.nightPlanYen))}安くなる見込みです（目安）。
          </ThemedText>
        ) : null}
        {own.publicYen > 0 && evInput.homeEnv !== 'none' ? (
          <ThemedText>・外での充電を家での充電に変えると、1回あたりの単価が下がります。</ThemedText>
        ) : null}
        {evInput.homeEnv === 'none' ? (
          <ThemedText>・お店の無料充電や、家に充電設備を付ける相談もできます。</ThemedText>
        ) : null}
        <Button label="設定（電気料金・充電サービス）を変える" variant="secondary" onPress={() => router.push('/settings')} />
      </Section>
    </Screen>
  );
}
