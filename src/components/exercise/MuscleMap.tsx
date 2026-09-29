import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Ellipse, G, Path } from 'react-native-svg';
import type { MuscleRegion } from '@/lib/exerciseInfo';
import { useTheme, type Colors } from '@/theme';
import { T } from '../ui';

/** Blend two #RRGGBB colors; t = share of `a`. */
export function mix(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [ra, ga, ba] = p(a);
  const [rb, gb, bb] = p(b);
  const m = (x: number, y: number) => Math.round(x * t + y * (1 - t)).toString(16).padStart(2, '0');
  return `#${m(ra, rb)}${m(ga, gb)}${m(ba, bb)}`;
}

/** The warm highlight used for worked muscles, built from the theme's warm tones. */
export function muscleAccent(colors: Colors): string {
  return mix(colors.warning, colors.danger, 0.5);
}

type Shape = { r?: MuscleRegion; d: string };

/*
 * Both figures are drawn on a 100 × 220 grid, left half only (x ≤ 50); the
 * right half is the same shapes mirrored. Muscles sit on a slightly darker
 * silhouette with thin gaps between them, which read as separation lines.
 */

const SILHOUETTE =
  'M50.5 21 L45.6 21 C45.8 25 45.7 28 44.6 30.5 C40.5 32.5 35.5 33.5 31 35.5 C26.4 37.3 24.1 41.6 24.2 47 ' +
  'C23.3 55 22.4 63 22.5 71 C22.5 74 22.1 77 21.5 80 C20.1 88 19.2 99 19.3 110 C18.2 116 18.3 122 19.7 126.4 ' +
  'C20.9 128.6 23.6 128.2 24.5 124.6 C25.3 120.5 25 115 24.1 110.5 C25.8 101 28.2 90 28.9 80.5 ' +
  'C29.8 73 31.2 62 31.7 53 C32.7 60 34.2 68 35 76 C35.6 82 35.8 86 35.2 90 C34 95 32.6 99 32.3 104 ' +
  'C31.3 116 31.9 130 34.5 145 C35.3 150 35.1 154 35.5 158 C33.7 167 33.9 177 36.5 189 C37.2 193 37.9 197 38.2 200.5 ' +
  'C37.4 204 36.4 208 38.2 210.4 L45.9 210.8 C46.8 208.6 45.4 204 44.4 200.5 C45.2 192 47.7 181 47.7 170 ' +
  'C47.7 165 46.9 161 46.5 158 C47.3 150 48.7 138 49.1 128 C49.3 125 49.7 123 50.5 122.4 Z';

const FRONT: Shape[] = [
  // neck (sternocleidomastoid) and collarbone area
  { d: 'M46.2 22.5 C46.6 25.5 47.6 28.6 49.2 31.6 L47.6 32 C46.6 29.4 45.8 26.4 45.8 23 Z' },
  { r: 'traps', d: 'M44.9 30.6 C41 32.4 36.6 33.6 32.8 35.1 C36.8 35.8 41.4 35.4 45.4 33.9 C45.6 32.8 45.4 31.6 44.9 30.6 Z' },
  { r: 'front-delts', d: 'M35.4 37.1 C33.4 36.4 31.4 36.4 30.1 36.8 C28.6 40 27.6 44 27.4 48.4 C27.2 51 26.6 53.4 26 55.4 C28.2 54.2 29.8 52.4 30.6 50 C31.6 45.2 33.2 40.6 35.4 37.1 Z' },
  { r: 'side-delts', d: 'M29.3 37 C26.2 38.4 24.8 41.8 24.8 46.4 C24.6 49.6 24.9 52.8 25.4 55.2 C26.2 52.6 26.6 50 26.7 47.6 C26.9 43.6 27.8 40 29.3 37 Z' },
  { r: 'chest', d: 'M49.6 37.8 L49.6 55.4 C45.2 57.6 39 57.4 35 55 C33.1 53.8 31.9 52.2 31.2 50.2 C32.3 45.2 33.8 40.9 36.2 37.6 C40.8 37 45.2 37.2 49.6 37.8 Z' },
  { r: 'biceps', d: 'M28.1 53.6 C25.9 58.4 24.8 64.4 25 70.2 C25.4 73.8 26.4 76.2 27.6 77.8 C28.9 75 30.3 68.4 30.6 61.6 C30.7 58 29.9 55.4 28.1 53.6 Z' },
  { r: 'triceps', d: 'M24.8 51.5 C23.8 57 23.2 63.4 23.4 69.6 C23.8 64.2 24.4 58.6 25.8 54.2 Z' },
  { r: 'forearms', d: 'M22.4 80.4 C20.9 87 20.1 96 20.1 107.6 L21.7 108 C22.6 99 24.2 90.2 26.8 82.6 C25.4 80.9 23.8 80.2 22.4 80.4 Z' },
  { r: 'forearms', d: 'M27.8 82.2 C25.8 90.4 24 99.6 23 108.6 L23.8 108.8 C25.4 100 27.2 90.8 28.5 81.6 Z' },
  // serratus fingers
  { d: 'M33.4 56.8 C35 57.4 36.6 58.2 37.8 59.2 C36.4 59.8 34.8 59.6 33.6 59.2 Z' },
  { d: 'M33.9 60.6 C35.5 61.2 37.1 62 38.3 63 C36.9 63.6 35.3 63.4 34.1 63 Z' },
  { r: 'obliques', d: 'M34.6 65.2 C37.2 65.2 40.4 64.6 42.7 63.2 L42.8 94.2 C40.4 95.8 37.3 96.8 34.2 97.6 C35.1 93.6 35.6 89 35.4 84.6 C35.1 77.4 34.6 71 34.6 65.2 Z' },
  { r: 'abs', d: 'M49.4 58 L49.4 66.4 L44.8 66.6 C44 66.6 43.6 66 43.6 65.2 L43.6 60.2 C43.6 59.2 44.4 58.4 45.4 58.2 Z' },
  { r: 'abs', d: 'M49.4 67.8 L49.4 76.2 L44.8 76.4 C44 76.4 43.8 75.8 43.8 75 L43.8 69.2 C43.8 68.4 44.3 67.9 45 67.9 Z' },
  { r: 'abs', d: 'M49.4 77.6 L49.4 86 L45.1 86.2 C44.4 86.2 44.1 85.6 44.1 84.8 L44.1 79 C44.1 78.2 44.6 77.7 45.3 77.7 Z' },
  { r: 'abs', d: 'M49.4 87.4 L49.4 104.2 C47.6 103.4 45.8 100.8 44.9 97.2 C44.5 94.6 44.4 91.2 44.4 88.6 C44.4 87.9 44.9 87.5 45.6 87.5 Z' },
  { r: 'abductors', d: 'M33.1 100.4 C34.9 99.4 36.9 99.8 38 101.4 C37.6 106 36.4 110.2 34.3 113.6 C33.2 109.4 32.8 104.6 33.1 100.4 Z' },
  { r: 'quads', d: 'M34.2 115.2 C35.6 109.6 37 105.4 38.5 103.3 C38.1 115.4 38.3 130 39.5 145.8 C37.7 147.2 36.3 146.8 35.4 145.4 C33.3 135 32.9 123.6 34.2 115.2 Z' },
  { r: 'quads', d: 'M39.6 103.6 C41.8 104.8 43.3 108.2 43.8 113.6 C44.1 124.6 43.4 135.6 42.1 146.2 L40.7 146.4 C39.4 134 39 118.2 39.6 103.6 Z' },
  { r: 'quads', d: 'M45.1 129.6 C46.7 134.2 47.3 140.4 46.8 146 C45.9 149.4 43.9 150.4 42.9 149.4 C43 143.4 43.8 136.4 45.1 129.6 Z' },
  { r: 'adductors', d: 'M42.4 106.4 C45.4 109.6 47.8 115.2 48.9 122.4 C48.6 128.4 47.6 132.6 45.9 136.8 C45.1 127.4 44 116.4 42.4 106.4 Z' },
  // knee
  { d: 'M41.2 150.6 C43.4 150.6 44.8 152.6 44.6 155 C44.4 157.4 42.8 158.6 41 158.4 C39 158.2 37.8 156.4 38 154.2 C38.2 152 39.4 150.6 41.2 150.6 Z' },
  { r: 'calves', d: 'M46.3 160.6 C47.6 166 47.7 172.6 46.5 180.6 C45.6 176.8 45.2 170.8 45.4 165.2 Z' },
  { r: 'calves', d: 'M35.7 160.2 C34.4 166.4 34.3 172.4 35.5 179.8 C36.3 173.8 36.7 167.8 36.5 162.4 Z' },
  // shin (tibialis)
  { d: 'M37.4 160.6 C39 168.6 39.6 178.6 39.5 192 L41.1 192 C41 180 40.8 168.6 40.8 161.2 Z' },
];

const BACK: Shape[] = [
  { r: 'traps', d: 'M50 22.8 C48.8 26.2 46.9 29.4 44.6 31.2 C40.6 33.2 36.2 34.5 32.6 36.1 C36 37.9 39.6 40.4 42.2 43.6 C44.8 48.4 47 57.6 49.6 71.4 L49.6 22.8 Z' },
  { r: 'rear-delts', d: 'M31.6 37.4 C29.2 38.6 27.8 41.4 27.6 44.8 C28.4 48.6 30 51.6 31.6 53.2 C31.6 48.6 32.4 44 34 40.6 Z' },
  { r: 'side-delts', d: 'M31.2 36.4 C27.2 37.1 24.9 40.7 24.8 46.3 C24.7 49.6 25.2 52.8 26.1 55.4 C26.8 51 26.2 46.2 26.6 43.2 C27 40 28.6 37.8 31.2 36.4 Z' },
  { r: 'upper-back', d: 'M34.6 41.4 C37.9 42.6 40.8 44.8 42.9 47.8 C44.3 51 44.5 54.6 43.5 57.8 C40.3 57.3 36.6 56.3 33.4 54.6 C32.7 50.4 33.1 45.1 34.6 41.4 Z' },
  { r: 'lats', d: 'M33.5 56.3 C37 58 41 59.2 44.3 59.4 C46.1 64.2 47.4 72 48 80 C46.8 86.4 44.5 90.8 41.4 93.8 C39.4 89.8 37.4 84.4 36 78 C34.6 71 33.7 63.2 33.5 56.3 Z' },
  { r: 'lower-back', d: 'M46.9 74.6 C48.2 80.4 49.2 88.2 49.4 97 L49.4 103.2 C47.6 102.2 45.3 100.2 43.9 97.6 C44.5 91.2 45.6 83 46.9 74.6 Z' },
  { r: 'obliques', d: 'M35.5 80.2 C37.6 87 39.7 91.8 42.2 95.8 C39.8 97.4 36.6 98.4 33.9 99.2 C34.3 95.4 35.1 91.8 35.4 88 Z' },
  { r: 'abductors', d: 'M33.3 100.4 C36.6 99 40.6 98.8 43.8 99.4 C41.4 101.8 38.4 104.2 35.4 107.2 C34 105.2 33.3 102.8 33.3 100.4 Z' },
  { r: 'glutes', d: 'M49.4 104.6 C49.4 110.6 49.3 116.4 48.9 122.4 C45.1 124.9 39.4 125.1 35 122 C33 116.8 33.4 111.2 35.9 107.4 C39.4 103.4 44.2 102.2 49.4 104.6 Z' },
  { r: 'hamstrings', d: 'M35.2 124.8 C37.8 126 40.2 126.4 41.3 126.2 C41.1 134 40.5 142 39.7 148.4 C37.7 145.8 35.9 140.8 34.9 134 C34.6 130.6 34.7 127.2 35.2 124.8 Z' },
  { r: 'hamstrings', d: 'M42.5 126.3 C44 126.3 45.4 126 46.6 125.6 C46.4 133.4 45.6 141.6 44.4 149.2 C43.2 149.6 42 149.4 41 148.8 C41.7 141 42.3 133.2 42.5 126.3 Z' },
  { r: 'adductors', d: 'M47.8 125 C48.4 124.6 48.8 124.2 49 123.8 C48.8 130 48 136.2 46.6 141.6 C46.8 136 47.4 130.4 47.8 125 Z' },
  { r: 'calves', d: 'M41.9 158.6 C44.7 158.8 46.8 161.4 47.3 166.2 C47.5 171.2 46.7 176 45 180.2 C43.3 179.2 42.3 176.2 41.9 172 Z' },
  { r: 'calves', d: 'M40.8 158.8 C38 158.8 35.9 161.6 35.1 166.2 C34.7 171.2 35.5 175.4 37.2 178.8 C38.8 177.8 40 175 40.6 171 Z' },
  { r: 'calves', d: 'M37 180.6 C37.8 184.4 38.8 188.2 39.6 191.8 L43.8 191.8 C44.6 188.2 45.4 184.4 45.7 181.6 C44.2 182.4 42.6 180.2 41.4 177.2 C40.4 179.8 38.8 181.2 37 180.6 Z' },
  { r: 'triceps', d: 'M26.4 56.2 C24.9 61.4 24.1 67.4 24.5 73.6 C25.5 76.4 27.2 77.8 28.8 77.4 C30 71.2 31 63.4 31.4 56 C30 54.2 28 54.2 26.4 56.2 Z' },
  { r: 'forearms', d: 'M22.2 80.6 C20.8 87.4 20 96.4 20.1 107.8 L22.4 108.2 C23.4 99 25.2 89.6 27.8 82.2 C26 80.6 24 80.2 22.2 80.6 Z' },
  { r: 'forearms', d: 'M28.6 82 C27.2 90 25.4 99.4 23.6 108.6 L24.1 108.8 C26 100 27.8 90.4 28.9 81.8 Z' },
];

function Figure({ shapes, x, fills, line, body, outline, back }: { shapes: Shape[]; x: number; fills: (r?: MuscleRegion) => string; line: string; body: string; outline: string; back?: boolean }) {
  const half = (
    <>
      {shapes.map((s, i) => (
        <Path key={i} d={s.d} fill={fills(s.r)} stroke={line} strokeWidth={0.55} strokeLinejoin="round" />
      ))}
    </>
  );
  return (
    <G transform={`translate(${x} 0)`}>
      {/* silhouette with a fine outline: drawn outlined first, then filled over so the seam down the middle disappears */}
      <Path d={SILHOUETTE} fill={body} stroke={outline} strokeWidth={1.1} strokeLinejoin="round" />
      <Path d={SILHOUETTE} fill={body} stroke={outline} strokeWidth={1.1} strokeLinejoin="round" transform="matrix(-1 0 0 1 100 0)" />
      <Ellipse cx={50} cy={13.4} rx={8.2} ry={10} fill={body} stroke={outline} strokeWidth={1.1} />
      <Path d={SILHOUETTE} fill={body} />
      <Path d={SILHOUETTE} fill={body} transform="matrix(-1 0 0 1 100 0)" />
      <Ellipse cx={50} cy={13.4} rx={8.2} ry={10} fill={body} />
      {back && <Path d="M50 30 L50 106" stroke={line} strokeWidth={0.55} />}
      {half}
      <G transform="matrix(-1 0 0 1 100 0)">{half}</G>
    </G>
  );
}

/** Front and back body with primary (strong) and secondary (soft) muscles highlighted. */
export function MuscleMap({ primary, secondary = [], size = 200, side = 'both', style }: { primary: MuscleRegion[]; secondary?: MuscleRegion[]; size?: number; side?: 'both' | 'front' | 'back'; style?: StyleProp<ViewStyle> }) {
  const { colors, dark } = useTheme();
  const accent = muscleAccent(colors);
  const body = mix(colors.text, colors.card, dark ? 0.1 : 0.075);
  const muscle = mix(colors.text, colors.card, dark ? 0.2 : 0.155);
  const outline = mix(colors.text, colors.card, dark ? 0.26 : 0.24);
  const line = mix(colors.text, colors.card, dark ? 0.04 : 0);
  const soft = mix(accent, muscle, dark ? 0.42 : 0.38);
  const p = new Set(primary);
  const s = new Set(secondary);
  const fills = (r?: MuscleRegion) => (r && p.has(r) ? accent : r && s.has(r) ? soft : muscle);

  const labels = size >= 110;
  const labelH = labels ? Math.max(14, Math.round(size * 0.08)) : 0;
  const h = size - labelH;
  const both = side === 'both';
  const vbW = both ? 206 : 100;
  const w = (h * vbW) / 222;
  const figures = both ? (['front', 'back'] as const) : [side];
  const width = both ? size : size / 2;

  return (
    <View
      style={[{ width, height: size, alignItems: 'center' }, style]}
      accessibilityRole="image"
      accessibilityLabel={primary.length ? `Muscles worked: ${primary.join(', ')}` : 'Body map'}
    >
      <Svg width={w} height={h} viewBox={`0 -1 ${vbW} 222`}>
        {figures.map((f, i) => (
          <Figure key={f} shapes={f === 'front' ? FRONT : BACK} back={f === 'back'} x={i * 106} fills={fills} line={line} body={body} outline={outline} />
        ))}
      </Svg>
      {labels && (
        <View style={{ flexDirection: 'row', width: w, height: labelH, alignItems: 'flex-end' }}>
          {figures.map((f) => (
            <View key={f} style={{ flex: 1, alignItems: 'center' }}>
              <T size={Math.min(12, Math.max(10, size * 0.045))} weight="600" color={colors.textMuted}>
                {f === 'front' ? 'Front' : 'Back'}
              </T>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
