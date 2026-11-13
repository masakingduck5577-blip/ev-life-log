import { perMonth, TANK_L } from '@/analysis/ev';
import { InfoBox } from '@/components/info-box';
import { StatRow, StatTile } from '@/components/link-row';
import { Screen, Section } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { formatDuration } from '@/lib/format';
import { useAnalysis } from '@/recording/use-analysis';

/** 6. あなたの1週間で見るEVの違い */
export default function DifferenceScreen() {
  const result = useAnalysis();
  if (!result) {
    return (
      <Screen title="EVの違い" back>
        <ThemedText color="sub">まだ記録がありません。</ThemedText>
      </Screen>
    );
  }
  const a = result.analysis;
  const waits = a.days.flatMap((d) => d.waits);
  const litersMonth = perMonth(a.ev.cost.gasLiters);
  const visitsMonth = litersMonth / TANK_L;
  const homeCharge = result.evInput.homeEnv !== 'none';

  return (
    <Screen title="あなたの1週間で見るEVの違い" back>
      <Section title="止まって待っていた時間">
        <StatRow>
          <StatTile label="1週間で" value={formatDuration(a.waitMin)} note={`${waits.length}回`} />
        </StatRow>
        <ThemedText>
          {waits.length
            ? 'お迎えなどで待っている間、EVならエンジンをかけずにエアコンが使えて、音も静かです。'
            : 'この1週間は、車の中で待っていた時間はありませんでした。'}
        </ThemedText>
        <ThemedText type="note" color="sub">
          車で来て、歩かずに5〜30分止まっていたところを数えています。
        </ThemedText>
      </Section>

      <Section title="ガソリンスタンドに行く回数">
        <StatRow>
          <StatTile
            label="今の車（1か月）"
            value={`約${visitsMonth < 1 ? visitsMonth.toFixed(1) : Math.round(visitsMonth)}回`}
            note={`ガソリン 約${Math.round(litersMonth)}L`}
          />
          <StatTile label="EVなら" value={homeCharge ? '0回' : '外で充電'} note={homeCharge ? '家で充電' : `週に約${result.analysis.ev.publicPerWeek.normal.toFixed(1)}回`} />
        </StatRow>
        <ThemedText type="note" color="sub">
          タンク{TANK_L}Lを満タンにするとして計算した目安です。
        </ThemedText>
      </Section>

      <Section title="メンテナンス">
        <ThemedText>エンジンオイルの交換がいらないなど、手入れが少なくなります。</ThemedText>
        <InfoBox>販売店の声：「維持費が約2割安い」</InfoBox>
      </Section>
    </Screen>
  );
}
