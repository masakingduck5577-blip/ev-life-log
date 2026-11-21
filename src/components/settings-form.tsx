import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import type { HomeEnv } from '@/analysis/ev';
import { EVS, PARAMS } from '@/data/simulator';
import { Colors, MinTouch, Radius, Spacing } from '@/constants/theme';
import type { CarType, UserSettings } from '@/recording/engine';

import { Choice } from './button';
import { ThemedText } from './themed-text';

const HOME_ENV: { value: HomeEnv; title: string }[] = [
  { value: 'have', title: 'できる（充電設備がある）' },
  { value: 'install', title: '設備を付ければできそう' },
  { value: 'none', title: 'できない' },
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
  /** はじめの入力：燃費と自宅の充電だけにする（EVや電気料金は、あとで設定画面で選ぶ） */
  compact?: boolean;
};

/** 初期設定（はじめの2つ目の画面）と、設定画面（EVに乗っている人の E1 を含む） */
export function SettingsForm({ carType, value, onChange, compact }: Props) {
  const ownEv = carType === 'ownEv';

  return (
    <View style={styles.form}>
      {!compact ? (
        <Group
          title={ownEv ? '乗っているEV' : carType === 'loanerEv' ? '借りているEV' : '検討中のEV'}>
          {Object.entries(EVS).map(([key, e]) => (
            <Choice
              key={key}
              title={e.name}
              image={e.photo}
              selected={value.evKey === key}
              onPress={() => onChange({ evKey: key })}
            />
          ))}
        </Group>
      ) : null}

      {!ownEv ? (
        <Group title="今の車の燃費">
          <Choice
            title="分からない"
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
            selected={value.homeEnv === h.value}
            onPress={() => onChange({ homeEnv: h.value })}
          />
        ))}
      </Group>

      {ownEv && !compact ? (
        <>
          <Group title="家の電気料金">
            <Choice
              title="ふつうのプラン"
              selected={value.elecPlan === 'normal'}
              onPress={() => onChange({ elecPlan: 'normal' })}
            />
            <Choice
              title="夜が安いプラン"
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
          <Group title="外で使う充電サービス">
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
