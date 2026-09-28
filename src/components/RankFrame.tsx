import React, { useId } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Polygon, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';
import { FONTS } from '@/theme';
import type { Stage } from '@/lib/progression';

/** Diameter of the round slot inside the frame, as a share of `size`. */
export const RANK_FRAME_SLOT = 0.5;

type Look = {
  /** Ring metal: highlight, mid, shadow (a 4th stop adds a second hue). */
  ring: string[];
  /** Ornament metal (wings, laurel, crown, ribbon): highlight, mid, shadow. */
  trim: string[];
  gem?: string;
};

const LOOKS: Record<string, Look> = {
  rookie: { ring: ['#9C7A5A', '#5E4331', '#33241A'], trim: ['#9C7A5A', '#5E4331', '#33241A'] },
  iron: { ring: ['#C3CAD0', '#646D75', '#2E3439'], trim: ['#C3CAD0', '#646D75', '#2E3439'] },
  bronze: { ring: ['#FFD0A1', '#C27A42', '#6A3A18'], trim: ['#FFD0A1', '#C27A42', '#6A3A18'] },
  silver: { ring: ['#FFFFFF', '#B8C3CE', '#5F6B78'], trim: ['#FFFFFF', '#C9D2DB', '#6E7A86'] },
  gold: { ring: ['#FFF3B0', '#E5AE25', '#845A08'], trim: ['#FFF3B0', '#E5AE25', '#845A08'], gem: '#8FD8FF' },
  platinum: { ring: ['#D4FFF9', '#2FB2A8', '#0F5A54'], trim: ['#F2FFFA', '#9FE8DC', '#2F8F86'], gem: '#FF6F9A' },
  diamond: { ring: ['#E2EDFF', '#4C8DF6', '#1B3A8A'], trim: ['#E2EDFF', '#8DB8FF', '#2C5BC0'], gem: '#E9F6FF' },
  champion: { ring: ['#FFD6F2', '#F25CA8', '#9B5CF6', '#4A1C86'], trim: ['#FFF0FB', '#E3B8FF', '#8A4FE0'], gem: '#FF5FAE' },
  titan: { ring: ['#FFA3B5', '#E0314F', '#7A0F24'], trim: ['#FFF4B8', '#F2B92E', '#8F5A06'], gem: '#FF3B5C' },
};

const ORDER = ['rookie', 'iron', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'champion', 'titan'];

function grey(c: string) {
  const n = parseInt(c.slice(1), 16);
  const l = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  const v = Math.round(60 + l * 0.55)
    .toString(16)
    .padStart(2, '0');
  return `#${v}${v}${v}`;
}

const rad = (deg: number) => (deg * Math.PI) / 180;
const polar = (r: number, deg: number): [number, number] => [50 + r * Math.cos(rad(deg)), 50 + r * Math.sin(rad(deg))];

/**
 * A game-style avatar frame for a rank stage: a metal ring around a round slot
 * (children render there), with ornaments that escalate by tier and the
 * division on a plate at the bottom. Everything fits in a size×size box.
 */
export function RankFrame({ stage, size = 64, locked, children }: { stage: Stage; size?: number; locked?: boolean; children?: React.ReactNode }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const { tier, division } = stage;
  const t = Math.max(0, ORDER.indexOf(tier.key));
  const base = LOOKS[tier.key] ?? LOOKS.rookie;
  const k = (c: string) => (locked ? grey(c) : c);
  const ring = base.ring.map(k);
  const trim = base.trim.map(k);
  const gem = k(base.gem ?? tier.glow);
  const ringDark = ring[ring.length - 1];
  const u = (name: string) => `url(#${name}${id})`;

  const gemAt = (x: number, y: number, g: number) => (
    <G key={`${x}-${y}`}>
      <Circle cx={x} cy={y} r={g + 1.6} fill={u('tr')} stroke={trim[2]} strokeWidth={0.6} />
      <Polygon points={`${x},${y - g * 1.25} ${x + g},${y} ${x},${y + g * 1.25} ${x - g},${y}`} fill={gem} />
      <Polygon points={`${x},${y - g * 1.25} ${x},${y + g * 1.25} ${x - g},${y}`} fill="#fff" opacity={0.35} />
      <Polygon points={`${x},${y - g * 1.25} ${x + g},${y} ${x - g},${y}`} fill="#fff" opacity={0.25} />
      <Polygon points={`${x},${y - g * 1.25} ${x + g},${y} ${x},${y + g * 1.25} ${x - g},${y}`} fill="none" stroke="#000" strokeOpacity={0.3} strokeWidth={0.5} />
    </G>
  );

  /** Left wing of feathers fanning out from (24,50); mirrored for the right. */
  const wing = (lens: number[], angles: number[]) =>
    lens.map((len, i) => {
      const a = angles[i];
      const [dx, dy] = [Math.cos(rad(a)), Math.sin(rad(a))];
      const cx = 24 + (dx * len) / 2;
      const cy = 50 + (dy * len) / 2;
      return <Ellipse key={i} cx={cx} cy={cy} rx={len / 2} ry={Math.max(2.2, len * 0.17)} transform={`rotate(${a} ${cx} ${cy})`} fill={u('tb')} stroke={trim[2]} strokeWidth={0.7} />;
    });
  const wings = (big: boolean) => {
    const w = big ? wing([26, 23, 20, 16, 12], [218, 203, 188, 173, 158]) : wing([18, 15, 11], [206, 189, 172]);
    return (
      <G>
        <G>{w}</G>
        <G transform="translate(100 0) scale(-1 1)">{w}</G>
      </G>
    );
  };

  /** Two laurel branches curling up from the bottom around the ring. */
  const laurel = () => {
    const out: React.ReactNode[] = [];
    for (const side of [-1, 1]) {
      const from = 90 - side * 12;
      const to = 90 - side * 118;
      const [sx, sy] = polar(35.5, from);
      const [ex, ey] = polar(35.5, to);
      out.push(<Path key={`st${side}`} d={`M${sx.toFixed(2)} ${sy.toFixed(2)} A35.5 35.5 0 0 ${side < 0 ? 1 : 0} ${ex.toFixed(2)} ${ey.toFixed(2)}`} fill="none" stroke={trim[2]} strokeWidth={1.1} strokeLinecap="round" />);
      for (let i = 0; i < 6; i++) {
        const deg = 90 - side * (20 + i * 17);
        const up = deg - side * 90; // tangent pointing up the branch
        for (const off of [-1, 1]) {
          const [x, y] = polar(35.5 + off * 2.6, deg - side * 2);
          const rot = up + off * side * 28;
          out.push(<Ellipse key={`${side}${i}${off}`} cx={x} cy={y} rx={4.2} ry={1.8} transform={`rotate(${rot.toFixed(1)} ${x.toFixed(2)} ${y.toFixed(2)})`} fill={u('tb')} stroke={trim[2]} strokeWidth={0.5} />);
        }
      }
    }
    return <G>{out}</G>;
  };

  const sunburst = () => {
    const pts: string[] = [];
    const n = 16;
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 === 0 ? (i % 4 === 0 ? 42 : 37) : 29;
      const [x, y] = polar(r, -90 + (i * 180) / n);
      pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    }
    return <Polygon points={pts.join(' ')} fill={u('tb')} stroke={trim[2]} strokeWidth={0.6} strokeLinejoin="round" />;
  };

  const rays = () =>
    Array.from({ length: 12 }, (_, i) => {
      const deg = -75 + i * 30;
      const [x1, y1] = polar(29, deg - 6);
      const [x2, y2] = polar(48, deg);
      const [x3, y3] = polar(29, deg + 6);
      return <Polygon key={i} points={`${x1},${y1} ${x2},${y2} ${x3},${y3}`} fill={trim[1]} opacity={0.55} />;
    });

  const studs = [45, 135, 225, 315].map((d) => polar(28, d));
  const slot = size * RANK_FRAME_SLOT;

  return (
    <View style={{ width: size, height: size }}>
      {/* behind the slot: ornaments */}
      <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute', left: 0, top: 0 }}>
        <Defs>
          <LinearGradient id={`tb${id}`} x1="0" y1="0" x2="0.4" y2="1">
            <Stop offset="0" stopColor={trim[0]} />
            <Stop offset="0.5" stopColor={trim[1]} />
            <Stop offset="1" stopColor={trim[2]} />
          </LinearGradient>
        </Defs>
        {t >= 8 && <G>{rays()}</G>}
        {t === 6 && sunburst()}
        {t >= 7 && wings(true)}
        {t === 3 && wings(false)}
        {(t === 5 || t === 7) && laurel()}
      </Svg>

      <View
        style={{
          position: 'absolute',
          left: (size - slot) / 2,
          top: (size - slot) / 2,
          width: slot,
          height: slot,
          borderRadius: slot / 2,
          overflow: 'hidden',
          backgroundColor: '#15181E',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: locked ? 0.6 : 1,
        }}
      >
        {children}
      </View>

      {/* over the slot: the ring and front ornaments */}
      <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
        <Defs>
          <LinearGradient id={`rg${id}`} x1="0.1" y1="0" x2="0.9" y2="1">
            {ring.map((c, i) => (
              <Stop key={i} offset={i / (ring.length - 1)} stopColor={c} />
            ))}
          </LinearGradient>
          <LinearGradient id={`tr${id}`} x1="0" y1="0" x2="0.4" y2="1">
            <Stop offset="0" stopColor={trim[0]} />
            <Stop offset="0.5" stopColor={trim[1]} />
            <Stop offset="1" stopColor={trim[2]} />
          </LinearGradient>
          <RadialGradient id={`sh${id}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0.8" stopColor="#000" stopOpacity={0} />
            <Stop offset="1" stopColor="#000" stopOpacity={0.45} />
          </RadialGradient>
        </Defs>
        {/* inner shadow on the slot edge */}
        <Circle cx="50" cy="50" r="25.5" fill={u('sh')} />
        {/* ring */}
        <Circle cx="50" cy="50" r="28" fill="none" stroke={u('rg')} strokeWidth={6.4} />
        <Circle cx="50" cy="50" r="31.1" fill="none" stroke={t === 8 ? trim[1] : ringDark} strokeWidth={t === 8 ? 1.6 : 0.9} />
        <Circle cx="50" cy="50" r="24.9" fill="none" stroke={t === 8 ? trim[1] : ringDark} strokeWidth={t === 8 ? 1.4 : 1} />
        {/* shine */}
        <Path d={describeArc(29.3, 195, 285)} fill="none" stroke="#fff" strokeOpacity={0.6} strokeWidth={1.4} strokeLinecap="round" />
        <Path d={describeArc(26.5, 20, 70)} fill="none" stroke="#000" strokeOpacity={0.25} strokeWidth={1.2} strokeLinecap="round" />
        {t >= 1 && <Circle cx="50" cy="50" r="28" fill="none" stroke="#fff" strokeOpacity={0.12} strokeWidth={0.7} />}

        {t === 2 &&
          studs.map(([x, y], i) => (
            <G key={i}>
              <Circle cx={x} cy={y} r="2.4" fill={u('tr')} stroke={trim[2]} strokeWidth={0.6} />
              <Circle cx={x - 0.7} cy={y - 0.7} r="0.8" fill="#fff" opacity={0.8} />
            </G>
          ))}
        {t >= 4 && t !== 8 && gemAt(50, 19.5, t >= 6 ? 4.2 : 3.6)}
        {t >= 4 && (
          <G>
            {gemAt(19.5, 50, t >= 6 ? 3.6 : 3.2)}
            {gemAt(80.5, 50, t >= 6 ? 3.6 : 3.2)}
          </G>
        )}
        {t >= 8 && (
          <G>
            <Path d="M35 22 L33 7 L42 13.5 L50 3 L58 13.5 L67 7 L65 22 Q50 18 35 22 Z" fill={u('tr')} stroke={trim[2]} strokeWidth={0.8} strokeLinejoin="round" />
            <Path d="M36 19.5 Q50 16 64 19.5" stroke="#fff" strokeOpacity={0.5} strokeWidth={0.8} fill="none" />
            <Circle cx="33" cy="7" r="1.9" fill={gem} />
            <Circle cx="50" cy="3.4" r="2.2" fill={gem} />
            <Circle cx="67" cy="7" r="1.9" fill={gem} />
            {gemAt(50, 15, 2.6)}
          </G>
        )}

        <G>
            {t >= 5 && <Path d="M36 79 L27 79 L30 83.5 L27 88 L38 88 Z M64 79 L73 79 L70 83.5 L73 88 L62 88 Z" fill={k(tier.color)} stroke={ringDark} strokeWidth={0.6} opacity={0.9} />}
            <Path d="M38 77 L62 77 L65.5 83 L62 89 L38 89 L34.5 83 Z" fill={u('rg')} stroke={ringDark} strokeWidth={0.9} strokeLinejoin="round" />
            <Path d="M39 78.6 L61 78.6" stroke="#fff" strokeOpacity={0.45} strokeWidth={0.8} />
            {division ? (
              <SvgText x="50" y="86.6" fontSize="9.5" fontFamily={FONTS.extrabold} fontWeight="800" fill="#fff" stroke="#000" strokeOpacity={0.35} strokeWidth={0.4} textAnchor="middle">
                {division}
              </SvgText>
            ) : (
              <Polygon points={starPoints(50, 83, 4.6, 2)} fill="#fff" stroke="#000" strokeOpacity={0.3} strokeWidth={0.4} />
            )}
        </G>
      </Svg>
    </View>
  );
}

function describeArc(r: number, from: number, to: number) {
  const [x1, y1] = polar(r, from);
  const [x2, y2] = polar(r, to);
  const large = to - from > 180 ? 1 : 0;
  return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

function starPoints(cx: number, cy: number, R: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? R : r;
    const a = rad(-90 + i * 36);
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
}
