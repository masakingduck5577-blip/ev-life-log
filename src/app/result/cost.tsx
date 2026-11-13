import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { perMonth } from '@/analysis/ev';
import { Button } from '@/components/button';
import { InfoBox } from '@/components/info-box';
import { StatRow, StatTile } from '@/components/link-row';
import { Screen, Section } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { RENTAL_URL } from '@/constants/links';
import { Colors, MinTouch, Spacing } from '@/constants/theme';
import { PARAMS, SIM, type LocalSubsidy } from '@/data/simulator';
import { formatIsoDate, formatMan, formatYen } from '@/lib/format';
import { useAnalysis } from '@/recording/use-analysis';

const STATUS_LABEL: Record<LocalSubsidy['status'], string> = {
  open: '受付中',
  soon: '残りわずか',
  closed: '受付終了',
  none: 'なし',
  check: '確認中',
};

/** 9. 費用・補助金と相談メモ */
export default function CostScreen() {
  const result = useAnalysis();
  const [showCities, setShowCities] = useState(false);
  if (!result) {
    return (
      <Screen title="費用・補助金" back>
        <ThemedText color="sub">まだ記録がありません。</ThemedText>
      </Screen>
    );
  }
  const { ev } = result.analysis;
  const { cost } = ev;
  const input = result.evInput;
  const national = SIM.subsidy.national;
  const utsunomiya = SIM.subsidy.local.find((l) => l.id === 'utsunomiya');
  const others = SIM.subsidy.local.filter((l) => l.id !== 'utsunomiya');

  return (
    <Screen title="費用・補助金" lead={`${ev.ev.name}と、${ev.gasName}（燃費 ${ev.gasKmPerL}km/L）を比べています。`} back>
      <Section title="燃料・電気代">
        <StatRow>
          <StatTile label="ガソリン代（1週間）" value={formatYen(cost.gas)} note={`1か月 ${formatYen(perMonth(cost.gas))}`} />
          <StatTile label="電気代（1週間）" value={formatYen(cost.ev)} note={`1か月 ${formatYen(perMonth(cost.ev))}`} />
        </StatRow>
        <ThemedText type="heading" color={cost.gas >= cost.ev ? 'ev' : 'warn'}>
          {cost.gas >= cost.ev
            ? `1か月で約${formatYen(perMonth(cost.gas - cost.ev))}安くなります`
            : `1か月で約${formatYen(perMonth(cost.ev - cost.gas))}高くなります`}
        </ThemedText>
        <ThemedText type="note" color="sub">
          ガソリン {PARAMS.gasPrice}円/L（燃費はカタログ値の{Math.round(PARAMS.gasRealFactor * 100)}%）・家の電気 {input.homePrice}円/kWh・外の充電 {input.publicPrice}円/kWh で計算。
          {input.homeEnv === 'none' ? '家で充電できないので、すべて外の充電で計算しています。' : `家で ${formatYen(cost.evHome)}、外で ${formatYen(cost.evPublic)}。`}
        </ThemedText>
      </Section>

      <Section title="国の補助金（EV）">
        <ThemedText type="bold">{national.name}</ThemedText>
        <StatRow>
          <StatTile label="2026年12月までに登録" value={formatMan(ev.ev.subsidy)} />
          <StatTile label="2027年1月以降に登録" value={formatMan(ev.ev.subsidy2027)} />
        </StatRow>
        <ThemedText>
          {national.closed ? '受付は終了しています。' : `受付終了の見込みは${national.endText}。予算がなくなりしだい終わります。`}
        </ThemedText>
        <ThemedText type="note" color="sub">
          出典：次世代自動車振興センター（金額は{formatIsoDate(national.amountAsOf)}時点
          {national.checkedAt ? `、${formatIsoDate(national.checkedAt)}に確認` : ''}）
        </ThemedText>
        <Button label="出典のページを開く" variant="secondary" onPress={() => void Linking.openURL(national.sources.page ?? national.url)} />
      </Section>

      <Section title="市町の補助金（EV）">
        {utsunomiya ? <CityRow city={utsunomiya} /> : null}
        <Pressable
          role="button"
          aria-expanded={showCities}
          onPress={() => setShowCities((v) => !v)}
          style={styles.toggle}>
          <ThemedText color="ev" style={{ fontWeight: 700 }}>
            {showCities ? 'ほかの市町を閉じる' : `栃木県のほかの市町（${others.length}）を見る`}
          </ThemedText>
        </Pressable>
        {showCities ? others.map((c) => <CityRow key={c.id} city={c} />) : null}
        <ThemedText type="note" color="sub">
          市町のページで確かめた金額だけを出しています。「確認中」の市町は、計算に入れていません。
        </ThemedText>
      </Section>

      <Section title="自宅の充電設備">
        {input.homeEnv === 'install' ? (
          <ThemedText>充電器の設置費 約{formatMan(PARAMS.chargerInstall)}（目安）がかかります。</ThemedText>
        ) : input.homeEnv === 'have' ? (
          <ThemedText>充電設備がある設定です。設置費はかかりません。</ThemedText>
        ) : (
          <ThemedText>家で充電できない設定です。外の充電スポットで計算しています。</ThemedText>
        )}
        <InfoBox tone="warn" title="充電設備の補助金：確認中">
          金額を公式のページで確かめられていないので、計算に入れていません。
        </InfoBox>
      </Section>

      <Section title="次にできること">
        <Button label="相談メモにまとめる" onPress={() => router.navigate('/memo')} />
        <Button label="EVレンタカーで試す" variant="secondary" onPress={() => void Linking.openURL(RENTAL_URL)} />
      </Section>
    </Screen>
  );
}

function CityRow({ city }: { city: LocalSubsidy }) {
  const counted = city.status === 'open';
  return (
    <View style={styles.city}>
      <View style={styles.cityHead}>
        <ThemedText type="bold" style={{ flex: 1 }}>
          {city.name}
        </ThemedText>
        <ThemedText type="note" color={counted ? 'ok' : 'sub'} style={{ fontWeight: 700 }}>
          {STATUS_LABEL[city.status]}
        </ThemedText>
      </View>
      {city.amount > 0 && city.status !== 'check' ? (
        <ThemedText>
          {formatMan(city.amount)}
          {city.amountKei ? `（軽EVは${formatMan(city.amountKei)}）` : ''}
        </ThemedText>
      ) : null}
      <ThemedText type="note" color="sub">
        {[city.note, city.until !== '―' ? city.until : null].filter(Boolean).join('。')}（{formatIsoDate(city.checkedAt)}確認）
      </ThemedText>
      {city.url ? (
        <Pressable role="link" onPress={() => void Linking.openURL(city.url!)} style={styles.link}>
          <ThemedText type="note" color="ev" style={{ fontWeight: 700 }}>
            {city.name}のページ
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: {
    minHeight: MinTouch,
    justifyContent: 'center',
  },
  city: {
    gap: Spacing.half,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderColor: Colors.line,
  },
  cityHead: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  link: {
    minHeight: MinTouch,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
});
