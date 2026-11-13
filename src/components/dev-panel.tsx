import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabInset, Colors, MaxContentWidth, MinTouch, Radius, Spacing } from '@/constants/theme';
import type { PlaybackSpeed } from '@/lib/clock';
import { DAY_MS } from '@/lib/clock';
import { formatDate, formatShortDate, formatTime, jstMidnight } from '@/lib/format';
import { RECORDING_DAYS } from '@/recording/engine';
import {
  getProgress,
  useNow,
  useRecording,
  useRecordingActions,
} from '@/recording/recording-context';
import { getScenario, SCENARIOS } from '@/recording/scenarios';

import { Icon } from './icon';
import { ThemedText } from './themed-text';

const IS_WEB = Platform.OS === 'web';
const SPEEDS: { value: PlaybackSpeed; label: string }[] = [
  { value: 1, label: '1倍' },
  { value: 60, label: '60倍' },
  { value: 'instant', label: '一気に' },
];

/**
 * テストデータの操作パネル（Web とテストデータのときだけ）。
 * Web は画面の下に並べ、スマホはタブの上に重ねて出す。
 */
export function DevPanel() {
  const snapshot = useRecording();
  const actions = useRecordingActions();
  const now = useNow(snapshot.clock);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // 広い画面（パソコンのブラウザ）では開いておく。スマホの幅では閉じておく
  const [open, setOpen] = useState(IS_WEB && width >= 700);

  if (!snapshot.ready || snapshot.mode !== 'test') return null;
  const progress = getProgress(snapshot, now);
  const scenario = getScenario(snapshot.scenarioId);
  const dayStarts = Array.from({ length: RECORDING_DAYS }, (_, i) =>
    snapshot.startedAt != null ? jstMidnight(snapshot.startedAt) + i * DAY_MS : 0,
  );

  return (
    <View
      style={[
        IS_WEB ? styles.inline : [styles.floating, { bottom: BottomTabInset + insets.bottom + Spacing.two }],
      ]}
      pointerEvents="box-none">
      <View style={styles.panel} role="region" aria-label="テストデータの操作">
        <Pressable
          role="button"
          aria-expanded={open}
          onPress={() => setOpen((v) => !v)}
          style={styles.header}>
          <Icon sf="slider.horizontal.3" md="tune" size={18} color={Colors.navy} />
          <ThemedText type="note" style={styles.headerTitle}>
            テスト操作
          </ThemedText>
          <ThemedText type="note" color="sub" style={styles.headerTime} numberOfLines={1}>
            {progress.status === 'finished' ? '記録の終わり' : `${formatShortDate(now)} ${formatTime(now)}`}
          </ThemedText>
          <ThemedText type="note" color="ev" style={styles.toggle}>
            {open ? '閉じる' : '開く'}
          </ThemedText>
        </Pressable>

        {open ? (
          <View style={styles.body}>
            <Row label="シナリオ">
              {SCENARIOS.map((s) => (
                <Chip
                  key={s.id}
                  label={s.id}
                  a11yLabel={`シナリオ${s.id}：${s.title}${s.available ? '' : '（準備中）'}`}
                  selected={s.id === snapshot.scenarioId}
                  disabled={!s.available}
                  onPress={() => void actions.setScenario(s.id)}
                />
              ))}
            </Row>
            <ThemedText type="note" color="sub" style={styles.hint}>
              {scenario.title}
            </ThemedText>

            <Row label="速さ">
              {SPEEDS.map((s) => (
                <Chip
                  key={String(s.value)}
                  label={s.label}
                  selected={snapshot.speed === s.value}
                  onPress={() => void actions.setSpeed(s.value)}
                />
              ))}
            </Row>

            <Row label="日付へ">
              {dayStarts.map((ms, i) => (
                <Chip
                  key={ms}
                  label={formatShortDate(ms).replace(/（.）/, '')}
                  a11yLabel={`${formatDate(ms)}の朝6時へ`}
                  selected={progress.status === 'recording' && progress.day === i + 1}
                  onPress={() => void actions.jumpToDay(i + 1)}
                />
              ))}
            </Row>

            <View style={styles.actions}>
              <Chip
                label="結果へ"
                wide
                onPress={() => {
                  void actions.jumpToEnd();
                  router.navigate('/');
                }}
              />
              <Chip label="最初から" wide onPress={() => void actions.restart()} />
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row} role="group" aria-label={label}>
      <ThemedText type="note" color="sub" style={styles.rowLabel}>
        {label}
      </ThemedText>
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

type ChipProps = {
  label: string;
  a11yLabel?: string;
  selected?: boolean;
  disabled?: boolean;
  wide?: boolean;
  onPress: () => void;
};

function Chip({ label, a11yLabel, selected, disabled, wide, onPress }: ChipProps) {
  return (
    <Pressable
      role="button"
      aria-label={a11yLabel ?? label}
      aria-pressed={selected}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        wide && styles.chipWide,
        selected && styles.chipSelected,
        disabled && styles.chipDisabled,
        pressed && styles.pressed,
      ]}>
      <ThemedText
        type="note"
        style={[
          styles.chipText,
          { color: selected ? Colors.onEv : disabled ? Colors.sub : Colors.ink },
          disabled && styles.chipTextDisabled,
        ]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  inline: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: Colors.bg,
    borderTopWidth: 1,
    borderColor: Colors.line,
  },
  floating: {
    position: 'absolute',
    left: Spacing.two,
    right: Spacing.two,
  },
  panel: {
    width: '100%',
    maxWidth: MaxContentWidth,
    backgroundColor: Colors.panel2,
    borderRadius: IS_WEB ? 0 : Radius.md,
    borderWidth: IS_WEB ? 0 : 1,
    borderColor: Colors.line,
  },
  header: {
    minHeight: MinTouch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  headerTitle: {
    fontWeight: 700,
    color: Colors.navy,
  },
  headerTime: {
    flex: 1,
  },
  toggle: {
    fontWeight: 700,
  },
  body: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  rowLabel: {
    width: 64,
  },
  chips: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  hint: {
    marginLeft: 64 + Spacing.two,
    marginTop: -Spacing.one,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  chip: {
    minWidth: MinTouch,
    minHeight: MinTouch,
    paddingHorizontal: Spacing.two + 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.line,
    backgroundColor: Colors.panel,
  },
  chipWide: {
    flex: 1,
  },
  chipSelected: {
    backgroundColor: Colors.ev,
    borderColor: Colors.ev,
  },
  chipDisabled: {
    backgroundColor: Colors.bg,
  },
  chipText: {
    fontWeight: 700,
  },
  chipTextDisabled: {
    fontWeight: 400,
    textDecorationLine: 'line-through',
  },
  pressed: {
    opacity: 0.75,
  },
});
