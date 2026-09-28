import React, { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { useTheme } from '@/theme';
import { T } from './ui';

export interface BarDatum {
  label: string;
  value: number;
  highlight?: boolean;
}

export function BarChart({
  data,
  goal,
  color,
  height = 160,
  format = (n: number) => String(Math.round(n)),
}: {
  data: BarDatum[];
  goal?: number;
  color: string;
  height?: number;
  format?: (n: number) => string;
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const labelH = 18;
  const topPad = 14;
  const chartH = height - labelH - topPad;
  const max = Math.max(goal ?? 0, ...data.map((d) => d.value), 1) * 1.1;
  const slot = data.length ? width / data.length : 0;
  const barW = Math.max(2, Math.min(28, slot * 0.6));
  const showEvery = data.length > 14 ? Math.ceil(data.length / 7) : 1;
  const y = (v: number) => topPad + chartH - (v / max) * chartH;

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {data.map((d, i) => {
            const h = (d.value / max) * chartH;
            const over = goal !== undefined && d.value > goal * 1.05;
            return (
              <React.Fragment key={i}>
                <Rect
                  x={i * slot + (slot - barW) / 2}
                  y={topPad + chartH - h}
                  width={barW}
                  height={Math.max(0, h)}
                  rx={Math.min(6, barW / 2)}
                  fill={over ? colors.warning : color}
                  opacity={d.highlight === false ? 0.5 : 1}
                />
                {i % showEvery === 0 && (
                  <SvgText x={i * slot + slot / 2} y={height - 4} fontSize={11} fill={colors.textMuted} textAnchor="middle">
                    {d.label}
                  </SvgText>
                )}
              </React.Fragment>
            );
          })}
          {goal !== undefined && goal > 0 && (
            <>
              <Line x1={0} x2={width} y1={y(goal)} y2={y(goal)} stroke={colors.textMuted} strokeDasharray="4 4" strokeWidth={1} />
              <SvgText x={width - 2} y={y(goal) - 4} fontSize={10} fill={colors.textMuted} textAnchor="end">
                {`Goal ${format(goal)}`}
              </SvgText>
            </>
          )}
        </Svg>
      )}
    </View>
  );
}

export function LineChart({
  points,
  color,
  height = 170,
  format = (n: number) => n.toFixed(1),
}: {
  points: { label: string; value: number }[];
  color: string;
  height?: number;
  format?: (n: number) => string;
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  if (points.length === 0) {
    return (
      <T muted center style={{ paddingVertical: 24 }}>
        No weigh-ins in this period yet.
      </T>
    );
  }
  const padX = 34;
  const padTop = 12;
  const padBottom = 22;
  const vals = points.map((p) => p.value);
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  if (max - min < 1) {
    min -= 1;
    max += 1;
  }
  const w = width - padX - 8;
  const h = height - padTop - padBottom;
  const x = (i: number) => padX + (points.length === 1 ? w / 2 : (i / (points.length - 1)) * w);
  const y = (v: number) => padTop + h - ((v - min) / (max - min)) * h;
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.value)}`).join(' ');
  const every = Math.max(1, Math.ceil(points.length / 5));

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {[max, (max + min) / 2, min].map((v, i) => (
            <React.Fragment key={i}>
              <Line x1={padX} x2={width - 8} y1={y(v)} y2={y(v)} stroke={colors.border} strokeWidth={1} />
              <SvgText x={padX - 6} y={y(v) + 4} fontSize={10} fill={colors.textMuted} textAnchor="end">
                {format(v)}
              </SvgText>
            </React.Fragment>
          ))}
          <Path d={d} stroke={color} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          {points.map((p, i) => (
            <React.Fragment key={i}>
              <Circle cx={x(i)} cy={y(p.value)} r={3.5} fill={color} />
              {i % every === 0 && (
                <SvgText x={x(i)} y={height - 4} fontSize={10} fill={colors.textMuted} textAnchor="middle">
                  {p.label}
                </SvgText>
              )}
            </React.Fragment>
          ))}
        </Svg>
      )}
    </View>
  );
}
