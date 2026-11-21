import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import Svg, { Line, Polyline } from 'react-native-svg';

import { SAFE_SOC, type SocPoint } from '@/analysis/ev';
import { Colors, Spacing } from '@/constants/theme';
import { DAY_MS } from '@/lib/clock';
import { formatShortDate } from '@/lib/format';

import { ThemedText } from './themed-text';

/** グラフの高さ（0〜100%の部分） */
const H = 180;
const PAD_TOP = 10;
/** 左の目盛りの幅 */
const AXIS_W = 40;
/** 一度に見せる日数（これより多いと横に送って見る） */
const VISIBLE_DAYS = 7;
const TICKS = [100, 50, SAFE_SOC, 0];

type Props = {
  /** 1日目の 0:00 */
  start: number;
  days: number;
  normal: SocPoint[];
};

/**
 * 電池の残りの移り変わり（折れ線）。運転で下がり、家で充電すると上がる。
 * 安心ライン（20%）に線を引く。
 * 日数が多いときは横に送って見る（最初は新しい日を見せる）。
 */
export function SocChart({ start, days, normal }: Props) {
  const [width, setWidth] = useState(0);
  const scroll = useRef<ScrollViewInstance>(null);
  const dayW = width > 0 ? (width - AXIS_W) / Math.min(days, VISIBLE_DAYS) : 0;
  const plotW = dayW * days;
  const x = (t: number) => ((t - start) / DAY_MS) * dayW;
  const y = (soc: number) => PAD_TOP + (1 - Math.max(0, Math.min(100, soc)) / 100) * H;
  const toPoints = (trace: SocPoint[]) => trace.map((p) => `${x(p.t).toFixed(1)},${y(p.soc).toFixed(1)}`).join(' ');
  const minOf = (trace: SocPoint[]) => Math.round(Math.min(...trace.map((p) => p.soc)));

  return (
    <View style={{ gap: Spacing.two }}>
      <View style={styles.legend}>
        <LegendLine color={Colors.ev} text="電池の残り" width={3} />
        <LegendLine color={Colors.warn} text={`安心ライン ${SAFE_SOC}%`} dashed width={2} />
      </View>

      <View
        style={styles.chartRow}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        accessible
        accessibilityLabel={`電池の残りのグラフ。いちばん少ないとき${minOf(normal)}%`}>
        {/* 目盛り（%） */}
        <View style={[styles.axis, { height: PAD_TOP + H + 30 }]}>
          {TICKS.map((v) => (
            <ThemedText
              key={v}
              type="note"
              color={v === SAFE_SOC ? 'warn' : 'sub'}
              style={[styles.tick, { top: y(v) - 10 }]}>
              {v}%
            </ThemedText>
          ))}
        </View>

        {dayW > 0 ? (
          <ScrollView
            ref={scroll}
            horizontal
            showsHorizontalScrollIndicator={days > VISIBLE_DAYS}
            onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
            <View style={{ width: plotW }}>
              <Svg width={plotW} height={PAD_TOP + H + 1}>
                {/* 横の線（100%・50%・0%） */}
                {[100, 50, 0].map((v) => (
                  <Line key={v} x1={0} x2={plotW} y1={y(v)} y2={y(v)} stroke={Colors.line} strokeWidth={1} />
                ))}
                {/* 日の区切り */}
                {Array.from({ length: days + 1 }, (_, i) => (
                  <Line key={i} x1={i * dayW} x2={i * dayW} y1={PAD_TOP} y2={PAD_TOP + H} stroke={Colors.line} strokeWidth={1} />
                ))}
                {/* 安心ライン */}
                <Line
                  x1={0}
                  x2={plotW}
                  y1={y(SAFE_SOC)}
                  y2={y(SAFE_SOC)}
                  stroke={Colors.warn}
                  strokeWidth={2}
                  strokeDasharray="6 4"
                />
                <Polyline points={toPoints(normal)} fill="none" stroke={Colors.ev} strokeWidth={3} strokeLinejoin="round" />
              </Svg>
              {/* 日付 */}
              <View style={styles.dates}>
                {Array.from({ length: days }, (_, i) => (
                  <ThemedText key={i} type="note" color="sub" style={[styles.date, { width: dayW }]} numberOfLines={1}>
                    {formatShortDate(start + i * DAY_MS + DAY_MS / 2).replace(/（.）/, '')}
                  </ThemedText>
                ))}
              </View>
            </View>
          </ScrollView>
        ) : null}
      </View>
      {days > VISIBLE_DAYS ? (
        <ThemedText type="note" color="sub">
          グラフを横に動かすと、前の日も見られます。
        </ThemedText>
      ) : null}
    </View>
  );
}

function LegendLine({ color, text, dashed, width }: { color: string; text: string; dashed?: boolean; width: number }) {
  return (
    <View style={styles.legendItem}>
      <Svg width={24} height={10}>
        <Line x1={0} x2={24} y1={5} y2={5} stroke={color} strokeWidth={width} strokeDasharray={dashed ? '5 3' : undefined} />
      </Svg>
      <ThemedText type="note" color="sub">
        {text}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: Spacing.three,
    rowGap: Spacing.one,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  chartRow: {
    flexDirection: 'row',
  },
  axis: {
    width: AXIS_W,
    position: 'relative',
  },
  tick: {
    position: 'absolute',
    right: Spacing.one,
    lineHeight: 20,
  },
  dates: {
    flexDirection: 'row',
    height: 30,
  },
  date: {
    textAlign: 'center',
    lineHeight: 30,
  },
});

/** from〜to の分を切り出す（境目の残りも足して、線が途切れないようにする） */
export function sliceTrace(trace: SocPoint[], from: number, to: number): SocPoint[] {
  const before = [...trace].reverse().find((p) => p.t <= from);
  const inside = trace.filter((p) => p.t > from && p.t < to);
  const out: SocPoint[] = [{ t: from, soc: before?.soc ?? trace[0]?.soc ?? 0 }, ...inside];
  const last = trace[trace.length - 1];
  if (last && last.t >= to) out.push({ t: to, soc: out[out.length - 1].soc });
  return out;
}
