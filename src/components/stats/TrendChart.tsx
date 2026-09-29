import React, { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { fromKey } from '@/lib/dates';
import { FONTS, useTheme } from '@/theme';
import { useTween } from '../motion';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * A time-scaled line with a soft fill: points sit where their dates fall, so
 * gaps in training show as gaps in time. Month ticks along the bottom.
 */
export function TrendChart({
  points,
  from,
  to,
  color,
  height = 180,
  format = (n: number) => String(Math.round(n)),
}: {
  points: { date: string; value: number }[];
  from: string;
  to: string;
  color: string;
  height?: number;
  format?: (n: number) => string;
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const grow = useTween(width > 0 ? 1 : 0, 900);
  const padL = 36;
  const padR = 10;
  const padTop = 12;
  const padBottom = 22;
  const t0 = fromKey(from).getTime();
  const t1 = Math.max(t0 + 1, fromKey(to).getTime());
  const vals = points.map((p) => p.value);
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  const span = Math.max(max - min, max * 0.06, 2);
  min = Math.max(0, min - span * 0.25);
  max = max + span * 0.2;
  const w = Math.max(1, width - padL - padR);
  const h = height - padTop - padBottom;
  const x = (d: string) => padL + ((fromKey(d).getTime() - t0) / (t1 - t0)) * w;
  const y = (v: number) => padTop + h - ((v - min) / (max - min)) * h * grow;
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = points.length > 1 ? `${line} L${x(points[points.length - 1].date).toFixed(1)},${padTop + h} L${x(points[0].date).toFixed(1)},${padTop + h} Z` : '';

  // Month ticks: first of each month in range, thinned to about five.
  const ticks: { date: string; label: string }[] = [];
  const start = fromKey(from);
  const d = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  while (d.getTime() <= t1) {
    ticks.push({ date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`, label: MONTHS[d.getMonth()] });
    d.setMonth(d.getMonth() + 1);
  }
  const every = Math.max(1, Math.ceil(ticks.length / 6));
  const last = points[points.length - 1];

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
      {width > 0 && points.length > 0 && (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.22} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {[max, (max + min) / 2, min].map((v, i) => (
            <React.Fragment key={i}>
              <Line x1={padL} x2={width - padR} y1={padTop + (h * i) / 2} y2={padTop + (h * i) / 2} stroke={colors.border} strokeWidth={1} strokeDasharray={i === 2 ? undefined : '2 4'} />
              <SvgText fontFamily={FONTS.medium} x={padL - 6} y={padTop + (h * i) / 2 + 4} fontSize={10} fill={colors.textMuted} textAnchor="end">
                {format(v)}
              </SvgText>
            </React.Fragment>
          ))}
          {ticks.map((t, i) =>
            i % every === 0 ? (
              <SvgText key={t.date} fontFamily={FONTS.medium} x={x(t.date)} y={height - 5} fontSize={10} fill={colors.textMuted} textAnchor="middle">
                {t.label}
              </SvgText>
            ) : null,
          )}
          {area ? <Path d={area} fill="url(#trendFill)" opacity={grow} /> : null}
          <Path d={line} stroke={color} strokeWidth={2.4} fill="none" strokeLinejoin="round" strokeLinecap="round" opacity={grow} />
          {points.length <= 26 && points.map((p) => <Circle key={p.date} cx={x(p.date)} cy={y(p.value)} r={2.4} fill={colors.card} stroke={color} strokeWidth={1.6} opacity={grow} />)}
          {last && (
            <>
              <Circle cx={x(last.date)} cy={y(last.value)} r={7} fill={color} opacity={0.18 * grow} />
              <Circle cx={x(last.date)} cy={y(last.value)} r={3.6} fill={color} opacity={grow} />
            </>
          )}
        </Svg>
      )}
    </View>
  );
}
