import React from 'react';
import { Circle, Ellipse, G, Path, Polygon, Rect } from 'react-native-svg';
import { mix } from './color';
import { star4, type Pt, type SpeciesDef } from './bodies';

/*
 * What your pet wears as you climb the ranks. Each tier adds one piece, and
 * keeps the ones before it, so a Titan pet carries its whole history.
 */
export const EVOLUTION: { tier: string; gear: string }[] = [
  { tier: 'Rookie', gear: 'Sweatband' },
  { tier: 'Iron', gear: 'Wrist wraps' },
  { tier: 'Bronze', gear: 'Podium' },
  { tier: 'Silver', gear: 'Cape' },
  { tier: 'Gold', gear: 'Medal' },
  { tier: 'Platinum', gear: 'Radiance' },
  { tier: 'Diamond', gear: 'Crystals' },
  { tier: 'Champion', gear: 'Laurels' },
  { tier: 'Titan', gear: 'Crown' },
];

const GOLD = '#E6BE5A';
const GOLD_DARK = '#A7812A';

function diamond(x: number, y: number, s: number) {
  return `${x},${y - s * 1.3} ${x + s},${y} ${x},${y + s * 1.3} ${x - s},${y}`;
}

/** Rank gear. `t` is the tier index (0 Rookie … 8 Titan). */
export function tierGear({ t, color, glow, def, hands, u }: { t: number; color: string; glow: string; def: SpeciesDef; hands: [Pt, Pt]; u: string }) {
  const back: React.ReactNode[] = [];
  const front: React.ReactNode[] = [];
  const [l, r] = [def.l, def.r];
  const deep = mix(color, '#000000', 0.45);

  if (t >= 5) back.push(<Circle key="rad" cx={50} cy={60} r={50} fill={`url(#${u}rad)`} />);
  if (t >= 2) {
    const top = t >= 8 ? GOLD : color;
    back.push(
      <G key="plinth">
        <Ellipse cx={50} cy={99} rx={33} ry={5.5} fill={deep} />
        <Rect x={17} y={95} width={66} height={4} fill={deep} />
        <Ellipse cx={50} cy={95} rx={33} ry={5.5} fill={top} />
        <Ellipse cx={50} cy={94.4} rx={25} ry={3} fill="#FFFFFF" opacity={0.28} />
      </G>,
    );
  }
  if (t >= 3) {
    const cape = mix(color, '#000000', 0.25);
    back.push(
      <G key="cape">
        <Path d={`M${l[0] + 6} ${l[1] - 10} Q50 ${Math.min(l[1], r[1]) - 18} ${r[0] - 6} ${r[1] - 10} L${r[0] + 12} 95 Q66 90 50 94 Q34 90 ${l[0] - 12} 95 Z`} fill={cape} stroke={deep} strokeWidth={1.4} strokeLinejoin="round" />
        <Path d={`M${r[0] - 2} ${r[1] - 6} L${r[0] + 9} 93`} stroke={glow} strokeOpacity={0.5} strokeWidth={1.4} />
      </G>,
    );
  }
  if (t >= 1) {
    hands.forEach(([x, y], i) =>
      front.push(
        <G key={`wrap${i}`}>
          <Circle cx={x} cy={y} r={5.9} fill="none" stroke={t >= 8 ? GOLD : color} strokeWidth={2.4} strokeDasharray="5 2.2" />
        </G>,
      ),
    );
  }
  if (t >= 4) {
    const [x, y] = def.emblem;
    front.push(
      <G key="medal">
        <Circle cx={x} cy={y + 3.5} r={5} fill={GOLD} stroke={GOLD_DARK} strokeWidth={1.1} />
        <Circle cx={x} cy={y + 3.5} r={3.2} fill={color} />
        <Path d={star4(x, y + 3.5, 2.4)} fill="#FFFFFF" opacity={0.9} />
      </G>,
    );
  }
  if (t >= 6) {
    front.push(
      <G key="shards">
        <Polygon points={diamond(6, 34, 3.6)} fill={glow} stroke={color} strokeWidth={1} />
        <Polygon points={diamond(95, 26, 2.8)} fill={glow} stroke={color} strokeWidth={1} />
        <Polygon points={diamond(92, 52, 2)} fill="#FFFFFF" opacity={0.85} />
      </G>,
    );
  }
  if (t >= 7) {
    // A victor's wreath framing the whole pet.
    const branch = (sd: 1 | -1) => {
      const P0: Pt = [50 + sd * 6, 100];
      const P1: Pt = [50 + sd * 56, 94];
      const P2: Pt = [50 + sd * 40, 26];
      const at = (tt: number): Pt => [
        (1 - tt) ** 2 * P0[0] + 2 * (1 - tt) * tt * P1[0] + tt ** 2 * P2[0],
        (1 - tt) ** 2 * P0[1] + 2 * (1 - tt) * tt * P1[1] + tt ** 2 * P2[1],
      ];
      const tan = (tt: number) => [2 * (1 - tt) * (P1[0] - P0[0]) + 2 * tt * (P2[0] - P1[0]), 2 * (1 - tt) * (P1[1] - P0[1]) + 2 * tt * (P2[1] - P1[1])];
      return (
        <G key={`laurel${sd}`}>
          <Path d={`M${P0[0]} ${P0[1]} Q${P1[0]} ${P1[1]} ${P2[0]} ${P2[1]}`} stroke={GOLD_DARK} strokeWidth={1.4} fill="none" strokeLinecap="round" />
          {Array.from({ length: 9 }, (_, i) => {
            const tt = 0.14 + i * 0.1;
            const [x, yy] = at(tt);
            const [dx, dy] = tan(tt);
            const len = Math.hypot(dx, dy);
            const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
            const out = i % 2 ? 1 : -1;
            const cx = x + (-dy / len) * 3 * out;
            const cy = yy + (dx / len) * 3 * out;
            return <Ellipse key={i} cx={cx} cy={cy} rx={5} ry={2.1} fill={i % 2 ? GOLD : '#F2D27E'} stroke={GOLD_DARK} strokeWidth={0.7} transform={`rotate(${ang + out * sd * 32} ${cx} ${cy})`} />;
          })}
        </G>
      );
    };
    back.push(branch(1), branch(-1));
  }
  if (t >= 8) {
    const y = def.top + 4;
    front.push(
      <G key="crown" transform={`rotate(-8 50 ${y})`}>
        <Path d={`M37 ${y} L36 ${y - 11} L43 ${y - 5} L50 ${y - 14} L57 ${y - 5} L64 ${y - 11} L63 ${y} Z`} fill={GOLD} stroke={GOLD_DARK} strokeWidth={1.3} strokeLinejoin="round" />
        <Rect x={36.5} y={y - 2.6} width={27} height={3.4} rx={1.2} fill={GOLD_DARK} />
        <Circle cx={50} cy={y - 7} r={1.9} fill={color} />
        <Circle cx={42} cy={y - 1} r={1.1} fill={color} />
        <Circle cx={58} cy={y - 1} r={1.1} fill={color} />
        <Path d={`M39 ${y - 8} L40 ${y - 3}`} stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={1} />
      </G>,
    );
  }
  return { back, front };
}

/** Little signs of your day: sweat after training, a glow when fed, a bottle when hydrated, Zs when neglected. */
export function statusProps({ trained, fed, hydrated, sleepy, flex, hands, def, u, bottleSpecies }: { trained: boolean; fed: boolean; hydrated: boolean; sleepy: boolean; flex: boolean; hands: [Pt, Pt]; def: SpeciesDef; u: string; bottleSpecies: boolean }) {
  const back: React.ReactNode[] = [];
  const front: React.ReactNode[] = [];
  if (fed) {
    back.push(<Circle key="fedglow" cx={50} cy={62} r={46} fill={`url(#${u}fed)`} />);
    front.push(<Path key="fedspark" d={star4(88, def.top + 6, 4)} fill="#FFD66B" />);
    front.push(<Path key="fedspark2" d={star4(10, def.top + 18, 2.6)} fill="#FFE9A8" />);
  }
  if (trained) {
    const y = Math.max(20, def.top + 14);
    front.push(
      <G key="sweat">
        <Path d={`M84 ${y} Q87.5 ${y + 5} 84 ${y + 7} Q80.5 ${y + 5} 84 ${y} Z`} fill="#9BDCFF" stroke="#FFFFFF" strokeWidth={0.8} />
        <Path d={`M15 ${y + 8} Q17.8 ${y + 12} 15 ${y + 13.6} Q12.2 ${y + 12} 15 ${y + 8} Z`} fill="#9BDCFF" stroke="#FFFFFF" strokeWidth={0.8} />
      </G>,
    );
    if (flex) {
      const [x, hy] = hands[1];
      front.push(
        <G key="mini-db" transform={`rotate(-20 ${x} ${hy})`}>
          <Rect x={x - 9} y={hy - 1.3} width={18} height={2.6} rx={1.3} fill="#5A616B" />
          <Rect x={x - 11} y={hy - 5} width={4} height={10} rx={1.5} fill="#2A2E34" />
          <Rect x={x + 7} y={hy - 5} width={4} height={10} rx={1.5} fill="#2A2E34" />
        </G>,
      );
    }
  }
  if (hydrated && !bottleSpecies) {
    front.push(
      <G key="bottle">
        <Rect x={-2} y={80} width={11} height={17} rx={3.5} fill="#3AA7E0" stroke="#17618C" strokeWidth={1.1} />
        <Rect x={0.5} y={76} width={6} height={5} rx={1.5} fill="#20262C" />
        <Rect x={0} y={84} width={2} height={9} rx={1} fill="#FFFFFF" opacity={0.45} />
      </G>,
    );
  }
  if (sleepy) {
    const z = (x: number, y: number, s: number, o: number) => <Path key={`z${x}`} d={`M${x} ${y} h${s} l${-s} ${s * 1.1} h${s}`} stroke="#7E8AA3" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={o} />;
    front.push(z(78, def.top + 8, 5, 0.9), z(87, def.top - 1, 3.6, 0.65));
  }
  return { back, front };
}

/** Aura art. `back` sits behind the pet; `float` drifts upward when animated; `front` stays put. */
export function auraArt(key: string, def: SpeciesDef, u: string): { back?: React.ReactNode; float?: React.ReactNode; front?: React.ReactNode; spin?: React.ReactNode } {
  switch (key) {
    case 'chalk':
      return {
        float: (
          <G>
            {[
              [14, 88, 3.2],
              [19, 84, 2.2],
              [84, 90, 3],
              [89, 85, 2],
              [10, 70, 1.6],
              [92, 72, 1.8],
            ].map(([x, y, r], i) => (
              <Circle key={i} cx={x} cy={y} r={r} fill="#F2F4F5" opacity={0.85} />
            ))}
          </G>
        ),
      };
    case 'bubbles':
      return {
        float: (
          <G>
            {[
              [10, 80, 3.4],
              [16, 60, 2],
              [90, 76, 2.8],
              [86, 52, 1.8],
              [8, 42, 1.6],
              [94, 34, 2.2],
            ].map(([x, y, r], i) => (
              <G key={i}>
                <Circle cx={x} cy={y} r={r} fill="#BDE8FF" fillOpacity={0.25} stroke="#8FD3F5" strokeWidth={0.9} />
                <Circle cx={x - r * 0.35} cy={y - r * 0.35} r={r * 0.28} fill="#FFFFFF" />
              </G>
            ))}
          </G>
        ),
      };
    case 'pulse':
      return {
        back: (
          <G>
            <Circle cx={50} cy={60} r={44} fill="none" stroke="#F07A8C" strokeOpacity={0.35} strokeWidth={1.4} />
            <Circle cx={50} cy={60} r={49} fill="none" stroke="#F07A8C" strokeOpacity={0.18} strokeWidth={1} />
            <Path d="M-4 98 L20 98 L25 90 L30 104 L35 98 L104 98" stroke="#F07A8C" strokeOpacity={0.7} strokeWidth={1.4} fill="none" strokeLinejoin="round" />
          </G>
        ),
      };
    case 'sparks':
      return {
        float: (
          <G>
            {[
              [10, 40, 4],
              [90, 30, 3.4],
              [92, 70, 2.6],
              [6, 76, 2.8],
              [74, 12, 2.2],
            ].map(([x, y, r], i) => (
              <Path key={i} d={star4(x, y, r)} fill="#FFD66B" />
            ))}
          </G>
        ),
      };
    case 'frost':
      return {
        back: <Circle cx={50} cy={60} r={50} fill={`url(#${u}aura)`} />,
        front: (
          <G>
            {[
              [8, 36, 4],
              [92, 46, 3.4],
              [86, 16, 2.6],
            ].map(([x, y, s], i) => (
              <G key={i} stroke="#D6F2FF" strokeWidth={1.1} strokeLinecap="round">
                <Path d={`M${x - s} ${y} L${x + s} ${y} M${x - s / 2} ${y - s * 0.87} L${x + s / 2} ${y + s * 0.87} M${x - s / 2} ${y + s * 0.87} L${x + s / 2} ${y - s * 0.87}`} />
              </G>
            ))}
          </G>
        ),
      };
    case 'embers':
      return {
        back: <Circle cx={50} cy={64} r={50} fill={`url(#${u}aura)`} />,
        float: (
          <G>
            {[
              [12, 80, 1.8],
              [20, 64, 1.2],
              [88, 76, 1.6],
              [82, 56, 1.1],
              [8, 50, 1],
              [94, 40, 1.4],
            ].map(([x, y, r], i) => (
              <Circle key={i} cx={x} cy={y} r={r} fill={i % 2 ? '#FFC06B' : '#FF7A2E'} />
            ))}
          </G>
        ),
      };
    case 'orbit':
      return {
        back: <Ellipse cx={50} cy={86} rx={46} ry={10} fill="none" stroke="#9FB6FF" strokeOpacity={0.45} strokeWidth={1.3} />,
        front: <Path d="M4 86 A46 10 0 0 0 96 86" stroke="#9FB6FF" strokeOpacity={0.9} strokeWidth={1.5} fill="none" />,
      };
    case 'halo':
      return {
        back: <Circle cx={50} cy={56} r={50} fill={`url(#${u}aura)`} />,
        front: (
          <G>
            <Ellipse cx={50} cy={def.top - 6} rx={16} ry={4.2} fill="none" stroke="#FFE3A1" strokeOpacity={0.4} strokeWidth={5} />
            <Ellipse cx={50} cy={def.top - 6} rx={16} ry={4.2} fill="none" stroke="#F5CD6A" strokeWidth={2.2} />
          </G>
        ),
      };
    case 'nebula':
      return {
        back: (
          <G>
            <Circle cx={50} cy={60} r={50} fill={`url(#${u}aura)`} />
            <Circle cx={24} cy={40} r={22} fill="#7B5CFF" opacity={0.14} />
            <Circle cx={80} cy={70} r={24} fill="#FF6FB5" opacity={0.12} />
          </G>
        ),
        float: (
          <G>
            {[
              [8, 30, 2.6],
              [94, 20, 2],
              [90, 86, 2.4],
              [4, 70, 1.8],
              [70, 6, 1.6],
            ].map(([x, y, r], i) => (
              <Path key={i} d={star4(x, y, r)} fill="#FFFFFF" opacity={0.9} />
            ))}
          </G>
        ),
      };
    default:
      return {};
  }
}

/** Glow color used for an aura's radial gradient. */
export const AURA_GLOW: Record<string, string> = { frost: '#A9E4FF', embers: '#FF8A3D', halo: '#FFE3A1', nebula: '#C58BFF' };
