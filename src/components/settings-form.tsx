import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { NIGHT_PLAN_PRICE } from '@/analysis/analyze';
import type { HomeEnv } from '@/analysis/ev';
import { EVS, GASES, PARAMS } from '@/data/simulator';
import { Colors, MinTouch, Radius, Spacing } from '@/constants/theme';
import type { CarType, UserSettings } from '@/recording/engine';

import { Choice } from './button';
import { ThemedText } from './themed-text';

const HOME_ENV: { value: HomeEnv; title: string; description: string }[] = [
  { value: 'have', title: 'できる（充電設備がある）', description: '家の電気で充電します。' },
  {
    value: 'install',
    title: '設備を付ければできそう',
    description: `戸建て・駐車場あり。充電器の設置費 約${PARAMS.chargerInstall / 10000}万円がかかります。`,
  },
  { value: 'none', title: 'できない', description: '集合住宅・駐車場がないなど。外の充電スポットで計算します。' },
];

const SERVICES: { value: UserSettings['publicService']; title: string }[] = [
  { value: 'hondaCharge', title: 'Honda Charge' },
  { value: 'emp', title: 'e-Mobility Power' },
  { value: 'dealerFree', title: 'お店の無料充電' },
  { value: 'none', title: '使わない' },
];

type Props = {
  carType: CarType;
  value: UserSettings;
  onChange: (patch: Partial<UserSettings>) => void;
};

/** 初期設定（はじめての画面の2つ目）と、EVに乗っている人の設定（E1） */
export function SettingsForm({ carType, value, onChange }: Props) {
  const ev = EVS[value.evKey];
  const rival = ev ? GASES[ev.rival] : undefined;
  const ownEv = carType === 'ownEv';

  return (
    <View style={styles.form}>
      <Group
        title={ownEv ? '乗っているEV' : carType === 'loanerEv' ? '借りているEV' : '検討中のEV'}
        hint={ownEv ? undefined : '分からなければ、そのままでかまいません。'}>
        {Object.entries(EVS).map(([key, e]) => (
          <Choice
            key={key}
            title={e.name}
            description={`${e.category}・電池 ${e.batteryKwh}kWh・カタログで約${e.rangeKm}km${e.verified ? '' : '（値は仮）'}`}
            selected={value.evKey === key}
            onPress={() => onChange({ evKey: key })}
          />
        ))}
      </Group>

      {!ownEv ? (
        <Group title="今の車の燃費" hint="分からなければ、同じクラスの車のカタログ値で計算します。">
          <Choice
            title="分からない"
            description={rival ? `${rival.name}のカタログ値 ${rival.kmPerL}km/L で計算` : undefined}
            selected={value.gasKmPerL == null}
            onPress={() => onChange({ gasKmPerL: null })}
          />
          <NumberField
            label="燃費（km/L）"
            value={value.gasKmPerL}
            placeholder="例：15"
            onChange={(n) => onChange({ gasKmPerL: n })}
          />
        </Group>
      ) : null}

      <Group title="自宅で充電できますか">
        {HOME_ENV.map((h) => (
          <Choice
            key={h.value}
            title={h.title}
            description={h.description}
            selected={value.homeEnv === h.value}
            onPress={() => onChange({ homeEnv: h.value })}
          />
        ))}
      </Group>

      {ownEv ? (
        <>
          <Group title="家の電気料金" hint="分からなければ「ふつうのプラン」で計算します。検針票に単価が書いてあります。">
            <Choice
              title="ふつうのプラン"
              description={`約${PARAMS.homeKwhPrice}円/kWh`}
              selected={value.elecPlan === 'normal'}
              onPress={() => onChange({ elecPlan: 'normal' })}
            />
            <Choice
              title="夜が安いプラン"
              description={`夜の単価 約${NIGHT_PLAN_PRICE}円/kWh（目安。プランによって違います）`}
              selected={value.elecPlan === 'night'}
              onPress={() => onChange({ elecPlan: 'night' })}
            />
            <Choice
              title="単価を入れる"
              selected={value.elecPlan === 'custom'}
              onPress={() => onChange({ elecPlan: 'custom' })}
            />
            {value.elecPlan === 'custom' ? (
              <NumberField
                label="単価（円/kWh）"
                value={value.elecPrice}
                placeholder="例：31"
                onChange={(n) => onChange({ elecPrice: n ?? PARAMS.homeKwhPrice })}
              />
            ) : null}
          </Group>
          <Group title="外で使う充電サービス" hint={`外の充電の単価は、目安の${PARAMS.publicKwhPrice}円/kWhで計算します（お店の無料充電は0円）。`}>
            {SERVICES.map((s) => (
              <Choice
                key={s.value}
                title={s.title}
                selected={value.publicService === s.value}
                onPress={() => onChange({ publicService: s.value })}
              />
            ))}
          </Group>
        </>
      ) : null}
    </View>
  );
}

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={styles.group} role="radiogroup" aria-label={title}>
      <ThemedText type="heading">{title}</ThemedText>
      {hint ? (
        <ThemedText type="note" color="sub">
          {hint}
        </ThemedText>
      ) : null}
      {children}
    </View>
  );
}

function NumberField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: number | null;
  placeholder: string;
  onChange: (n: number | null) => void;
}) {
  const [text, setText] = useState(value != null ? String(value) : '');
  return (
    <View style={styles.field}>
      <ThemedText type="note" color="sub">
        {label}
      </ThemedText>
      <TextInput
        value={text}
        onChangeText={(t) => {
          setText(t);
          const n = parseFloat(t.replace(/[^\d.]/g, ''));
          onChange(Number.isFinite(n) && n > 0 ? n : null);
        }}
        inputMode="decimal"
        keyboardType="decimal-pad"
        placeholder={placeholder}
        placeholderTextColor={Colors.sub}
        aria-label={label}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.four,
  },
  group: {
    gap: Spacing.two,
  },
  field: {
    gap: Spacing.one,
  },
  input: {
    minHeight: Math.max(MinTouch, 48),
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
    color: Colors.ink,
    backgroundColor: Colors.panel,
  },
});
