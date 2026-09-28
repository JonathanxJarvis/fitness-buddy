import React from 'react';
import { Circle, Ellipse, G, Path, Polygon, Rect } from 'react-native-svg';
import type { Species } from '@/lib/loot';

/*
 * Pet bodies, drawn in a 100 x 100 box. Every species leaves room for the
 * shared face (eyes at y 65, x 40 / 60) and says where its shoulders, band
 * emblem and head top are, so gear and poses fit all of them.
 */

export type Pt = [number, number];
export interface Pal {
  main: string;
  shade: string;
  dark: string;
}
export interface Face {
  ink: string;
  line: string;
  ring?: string;
  dy?: number;
  /** Eyelid color: whatever the face sits on. */
  lid: string;
}
export interface Paint extends Pal {
  /** Outline color. */
  line: string;
  /** Main body fill (a gradient url, or a color in silhouette mode). */
  fill: string;
  /** Maps every fixed color, so a silhouette can flatten them all. */
  k: (c: string) => string;
  sil: boolean;
}
export interface Ctx {
  p: Paint;
  band: string;
  phase: number;
}
export interface Art {
  back?: React.ReactNode;
  main: React.ReactNode;
}
export interface SpeciesDef {
  pal: Pal;
  face: Face;
  /** Face sits on the recolorable body, so skins restyle it too. */
  faceOnMain: boolean;
  arm?: string;
  l: Pt;
  r: Pt;
  /** Where a rank emblem sits on the sweatband. */
  emblem: Pt;
  /** Top of the head, for laurels, crowns and halos. */
  top: number;
  draw: (c: Ctx) => Art;
}

const SW = 1.6;
const INK = '#141A1F';

/** A sweatband: curved strip with a stitch line and a knotted tail. */
function Band({ x1, x2, y, c = 9, h = 7, band, k, knot = true }: { x1: number; x2: number; y: number; c?: number; h?: number; band: string; k: Paint['k']; knot?: boolean }) {
  const mid = (x1 + x2) / 2;
  const b = k(band);
  return (
    <G>
      <Path d={`M${x1} ${y} Q${mid} ${y - c} ${x2} ${y} L${x2} ${y + h} Q${mid} ${y + h - c} ${x1} ${y + h} Z`} fill={b} />
      <Path d={`M${x1 + 2} ${y + 1.6} Q${mid} ${y - c + 1.6} ${x2 - 2} ${y + 1.6}`} stroke={k('#FFFFFF')} strokeOpacity={0.35} strokeWidth={0.9} strokeDasharray="1.6 1.8" fill="none" />
      <Path d={`M${x1} ${y + h} Q${mid} ${y + h - c} ${x2} ${y + h}`} stroke={k('#000000')} strokeOpacity={0.18} strokeWidth={1.2} fill="none" />
      {knot && (
        <G>
          <Path d={`M${x2 - 1} ${y + 2} L${x2 + 9} ${y - 3} L${x2 + 7} ${y + 3} Z`} fill={b} />
          <Path d={`M${x2 - 1} ${y + 4} L${x2 + 8} ${y + 7} L${x2 + 3} ${y + 9} Z`} fill={b} />
          <Circle cx={x2} cy={y + 3.4} r={2.2} fill={b} stroke={k('#000000')} strokeOpacity={0.15} strokeWidth={0.8} />
        </G>
      )}
    </G>
  );
}

const Shine = ({ x, y, rx, ry, o = 0.35, k, rot = -28 }: { x: number; y: number; rx: number; ry: number; o?: number; k: Paint['k']; rot?: number }) => (
  <G>
    <Ellipse cx={x} cy={y} rx={rx} ry={ry} fill={k('#FFFFFF')} opacity={o} transform={`rotate(${rot} ${x} ${y})`} />
    <Circle cx={x + rx * 0.9} cy={y - ry * 1.2} r={Math.max(1, ry * 0.35)} fill={k('#FFFFFF')} opacity={o + 0.15} />
  </G>
);

const star4 = (x: number, y: number, r: number) => `M${x} ${y - r} Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y} Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r} Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y} Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r} Z`;
export { star4 };

function star5(cx: number, cy: number, R: number, r: number) {
  return Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r : R;
    return `${(cx + Math.cos(a) * rad).toFixed(2)},${(cy + Math.sin(a) * rad).toFixed(2)}`;
  }).join(' ');
}

export const DEF: Record<Species, SpeciesDef> = {
  kettle: {
    pal: { main: '#2A6048', shade: '#3F8A66', dark: '#18382A' },
    face: { ink: INK, line: '#fff', lid: '#2A6048' },
    faceOnMain: true,
    l: [20, 60],
    r: [80, 60],
    emblem: [50, 45],
    top: 14,
    draw: ({ p, band }) => ({
      back: (
        <G>
          <Path d="M31 38 C27 6 73 6 69 38" fill="none" stroke={p.line} strokeWidth={12} strokeLinecap="round" />
          <Path d="M31 38 C27 6 73 6 69 38" fill="none" stroke={p.dark} strokeWidth={9} strokeLinecap="round" />
          <Path d="M36 30 C35 14 64 13 64 26" fill="none" stroke={p.shade} strokeOpacity={0.7} strokeWidth={2.4} strokeLinecap="round" />
        </G>
      ),
      main: (
        <G>
          <Rect x={31} y={86} width={38} height={9} rx={3.5} fill={p.dark} stroke={p.line} strokeWidth={SW} />
          <Circle cx={50} cy={61} r={31} fill={p.fill} stroke={p.line} strokeWidth={SW} />
          <Path d="M79 52 A31 31 0 0 1 38 90 Q68 86 79 52 Z" fill={p.k('#000000')} opacity={0.16} />
          <Shine x={35} y={43} rx={9} ry={4.5} k={p.k} />
          <Band x1={21} x2={79} y={45} c={10} band={band} k={p.k} />
        </G>
      ),
    }),
  },
  shaker: {
    pal: { main: '#23A99D', shade: '#7FE6DA', dark: '#0F625A' },
    face: { ink: INK, line: '#fff', lid: '#23A99D' },
    faceOnMain: true,
    l: [23, 62],
    r: [77, 62],
    emblem: [50, 44],
    top: 9,
    draw: ({ p, band }) => ({
      main: (
        <G>
          <Path d="M22 36 L78 36 L75 88 Q74 94 68 94 L32 94 Q26 94 25 88 Z" fill={p.fill} stroke={p.line} strokeWidth={SW} strokeLinejoin="round" />
          <Path d="M66 38 L75 38 L72 90 L64 91 Z" fill={p.k('#000000')} opacity={0.12} />
          <Rect x={29} y={48} width={4.5} height={32} rx={2.2} fill={p.k('#FFFFFF')} opacity={0.3} />
          <Path d="M68 56 L73 56 M70 62 L73 62 M68 68 L73 68 M70 74 L73 74" stroke={p.k('#FFFFFF')} strokeOpacity={0.6} strokeWidth={1.4} strokeLinecap="round" />
          <Circle cx={34} cy={86} r={1.6} fill={p.k('#FFFFFF')} opacity={0.45} />
          <Circle cx={39} cy={89} r={1.1} fill={p.k('#FFFFFF')} opacity={0.4} />
          <Rect x={40} y={12} width={20} height={11} rx={3.5} fill={p.k('#1B1D21')} stroke={p.line} strokeWidth={SW} />
          <Rect x={44} y={8} width={12} height={6} rx={3} fill={p.k('#2E3238')} />
          <Rect x={19} y={22} width={62} height={16} rx={6} fill={p.k('#1B1D21')} stroke={p.line} strokeWidth={SW} />
          <Rect x={23} y={25} width={34} height={3} rx={1.5} fill={p.k('#FFFFFF')} opacity={0.2} />
          <Band x1={23} x2={77} y={42} c={5} band={band} k={p.k} />
        </G>
      ),
    }),
  },
  egg: {
    pal: { main: '#FFF4E0', shade: '#FFFFFF', dark: '#D8B77C' },
    face: { ink: '#3A2A1A', line: '#3A2A1A', ring: '#3A2A1A', lid: '#FFF4E0' },
    faceOnMain: true,
    l: [19, 62],
    r: [81, 62],
    emblem: [50, 46],
    top: 18,
    draw: ({ p, band }) => ({
      main: (
        <G>
          <Path d="M50 17 C73 17 86 50 86 66 C86 84 70 95 50 95 C30 95 14 84 14 66 C14 50 27 17 50 17 Z" fill={p.fill} stroke={p.line} strokeWidth={SW} />
          <Path d="M72 38 C82 52 84 64 83 74 C81 86 70 92 57 93 C72 85 79 66 72 38 Z" fill={p.k('#000000')} opacity={0.07} />
          <Shine x={36} y={37} rx={8} ry={4.5} o={0.75} k={p.k} />
          <Circle cx={67} cy={55} r={1.5} fill={p.dark} opacity={0.5} />
          <Circle cx={73} cy={63} r={1.1} fill={p.dark} opacity={0.5} />
          <Circle cx={29} cy={85} r={1.3} fill={p.dark} opacity={0.5} />
          <Band x1={22} x2={78} y={44} c={9} band={band} k={p.k} />
        </G>
      ),
    }),
  },
  dumbbell: {
    pal: { main: '#9AA4AE', shade: '#DCE2E8', dark: '#565E67' },
    face: { ink: INK, line: '#fff', lid: '#9AA4AE' },
    faceOnMain: true,
    l: [14, 58],
    r: [86, 58],
    emblem: [50, 48],
    top: 38,
    draw: ({ p, band }) => {
      const plate = p.k('#262B31');
      return {
        main: (
          <G>
            <Rect x={19} y={50} width={12} height={30} rx={3} fill={p.dark} stroke={p.line} strokeWidth={SW} />
            <Rect x={69} y={50} width={12} height={30} rx={3} fill={p.dark} stroke={p.line} strokeWidth={SW} />
            <Rect x={8} y={36} width={16} height={58} rx={5} fill={plate} stroke={p.line} strokeWidth={SW} />
            <Rect x={76} y={36} width={16} height={58} rx={5} fill={plate} stroke={p.line} strokeWidth={SW} />
            <Rect x={11} y={40} width={3} height={50} rx={1.5} fill={p.k('#FFFFFF')} opacity={0.16} />
            <Rect x={79} y={40} width={3} height={50} rx={1.5} fill={p.k('#FFFFFF')} opacity={0.16} />
            <Rect x={26} y={38} width={48} height={56} rx={17} fill={p.fill} stroke={p.line} strokeWidth={SW} />
            <Path d="M63 41 Q74 48 74 70 Q74 90 60 93 L66 93 Q74 88 74 75 Z" fill={p.k('#000000')} opacity={0.1} />
            <Shine x={37} y={50} rx={7} ry={4} o={0.4} k={p.k} />
            <Path d="M40 87 L42 91 M46 87 L48 91 M52 87 L54 91 M58 87 L60 91" stroke={p.dark} strokeOpacity={0.45} strokeWidth={1.2} strokeLinecap="round" />
            <Band x1={26} x2={74} y={45} c={7} band={band} k={p.k} />
          </G>
        ),
      };
    },
  },
  avo: {
    pal: { main: '#3F7A2A', shade: '#6FA844', dark: '#24461A' },
    face: { ink: '#24380F', line: '#24380F', ring: '#24380F', dy: -6, lid: '#E3EFA4' },
    faceOnMain: false,
    l: [20, 62],
    r: [80, 62],
    emblem: [50, 40],
    top: 13,
    draw: ({ p, band }) => {
      const outline = 'M50 12 C62 12 66 26 70 38 C80 52 86 62 86 74 C86 88 70 96 50 96 C30 96 14 88 14 74 C14 62 20 52 30 38 C34 26 38 12 50 12 Z';
      return {
        main: (
          <G>
            <Path d={outline} fill={p.fill} stroke={p.line} strokeWidth={SW} />
            <Path d={outline} fill={p.k('#DCEB9A')} transform="translate(50 60) scale(0.86) translate(-50 -60)" />
            <Path d={outline} fill={p.k('#F1F7C0')} opacity={0.75} transform="translate(50 64) scale(0.6) translate(-50 -64)" />
            <Circle cx={50} cy={84} r={8} fill={p.k('#8B5A2B')} stroke={p.k('#5E3A18')} strokeWidth={1.2} />
            <Circle cx={47.5} cy={81.5} r={2.4} fill={p.k('#FFFFFF')} opacity={0.35} />
            <Shine x={30} y={46} rx={5} ry={2.5} o={0.3} k={p.k} rot={-60} />
            <Band x1={30} x2={70} y={37} c={6} band={band} k={p.k} />
          </G>
        ),
      };
    },
  },
  broc: {
    pal: { main: '#2F8C3B', shade: '#5CC266', dark: '#1D5E27' },
    face: { ink: '#1E3A12', line: '#1E3A12', ring: '#1E3A12', lid: '#B7DC7F' },
    faceOnMain: false,
    arm: '#78AE45',
    l: [28, 64],
    r: [72, 64],
    emblem: [50, 37],
    top: 6,
    draw: ({ p, band }) => ({
      main: (
        <G>
          <Path d="M30 46 L70 46 L72 84 Q73 94 64 94 L36 94 Q27 94 28 84 Z" fill={p.k('#B7DC7F')} stroke={p.line} strokeWidth={SW} />
          <Path d="M62 50 L70 50 L71 86 Q70 92 63 92 Z" fill={p.k('#000000')} opacity={0.08} />
          {(
            [
              [22, 40, 14],
              [78, 40, 14],
              [36, 26, 15],
              [64, 26, 15],
              [50, 20, 16],
              [33, 44, 12],
              [67, 44, 12],
              [50, 38, 16],
            ] as const
          ).map(([x, y, r], i) => (
            <Circle key={i} cx={x} cy={y} r={r} fill={p.fill} stroke={p.dark} strokeWidth={1.4} />
          ))}
          {(
            [
              [45, 14, 4],
              [31, 21, 3.2],
              [18, 35, 2.8],
              [60, 20, 3],
              [72, 33, 2.4],
            ] as const
          ).map(([x, y, r], i) => (
            <Circle key={i} cx={x} cy={y} r={r} fill={p.shade} opacity={0.75} />
          ))}
          <Band x1={12} x2={88} y={35} c={10} band={band} k={p.k} />
        </G>
      ),
    }),
  },
  plate: {
    pal: { main: '#30353C', shade: '#5B646E', dark: '#1B1F23' },
    face: { ink: '#F2F4F6', line: '#fff', lid: '#30353C' },
    faceOnMain: true,
    l: [19, 62],
    r: [81, 62],
    emblem: [50, 39],
    top: 27,
    draw: ({ p, band }) => ({
      main: (
        <G>
          <Circle cx={50} cy={60} r={34} fill={p.fill} stroke={p.line} strokeWidth={SW} />
          <Circle cx={50} cy={60} r={29.5} fill="none" stroke={p.shade} strokeWidth={2.2} />
          <Circle cx={50} cy={60} r={25} fill="none" stroke={p.k('#000000')} strokeOpacity={0.18} strokeWidth={1} />
          <Path d="M24 72 Q22 66 23 61" stroke={p.dark} strokeWidth={3.5} strokeLinecap="round" fill="none" />
          <Path d="M76 72 Q78 66 77 61" stroke={p.dark} strokeWidth={3.5} strokeLinecap="round" fill="none" />
          <Shine x={34} y={42} rx={9} ry={4} o={0.18} k={p.k} />
          <Circle cx={50} cy={51} r={7.5} fill={p.k('#8C959E')} stroke={p.k('#C8CFD6')} strokeWidth={1} />
          <Circle cx={50} cy={51} r={3.8} fill={p.k('#121518')} />
          <Band x1={24} x2={76} y={36} c={9} band={band} k={p.k} />
        </G>
      ),
    }),
  },
  flame: {
    pal: { main: '#FF7A1A', shade: '#FFB347', dark: '#D9480F' },
    face: { ink: '#5A1E00', line: '#5A1E00', ring: '#5A1E00', lid: '#FFD84A' },
    faceOnMain: false,
    l: [18, 64],
    r: [82, 64],
    emblem: [50, 51],
    top: 10,
    draw: ({ p, band, phase }) => {
      const f = phase % 3;
      const t = [0, 3, -2][f];
      const s = [0, -2, 2][f];
      return {
        main: (
          <G>
            <Path
              d={`M${50 + t} 4 C${56 + t} 18 66 24 70 34 C74 27 ${72 + s} 20 ${70 + s} 13 C82 25 88 44 86 62 C86 82 70 95 50 95 C30 95 14 82 14 62 C14 46 22 36 ${29 - s} 26 C30 35 32 40 36 42 C34 28 ${40 + t} 16 ${50 + t} 4 Z`}
              fill={p.fill}
              stroke={p.dark}
              strokeWidth={SW}
            />
            <Path d={`M${50 + t / 2} 24 C56 34 74 46 76 64 C77 82 64 91 50 91 C36 91 23 82 24 64 C25 48 42 38 ${50 + t / 2} 24 Z`} fill={p.shade} opacity={0.75} />
            <Path d="M50 40 C57 50 72 56 72 70 C72 84 62 90 50 90 C38 90 28 84 28 70 C28 58 42 50 50 40 Z" fill={p.k('#FFD84A')} />
            <Ellipse cx={50} cy={80} rx={13} ry={8} fill={p.k('#FFF3B8')} opacity={0.7} />
            <Band x1={16} x2={84} y={49} c={10} band={band} k={p.k} />
          </G>
        ),
      };
    },
  },
  bottle: {
    pal: { main: '#2F9BD6', shade: '#8FD8FF', dark: '#17618C' },
    face: { ink: '#0B1A2A', line: '#fff', lid: '#2F9BD6' },
    faceOnMain: true,
    l: [24, 62],
    r: [76, 62],
    emblem: [50, 41],
    top: 8,
    draw: ({ p, band }) => ({
      main: (
        <G>
          <Path d="M44 13 Q50 1 56 13" stroke={p.k('#20262C')} strokeWidth={3.2} fill="none" strokeLinecap="round" />
          <Rect x={36} y={11} width={28} height={14} rx={5} fill={p.k('#20262C')} stroke={p.line} strokeWidth={SW} />
          <Path d="M41 14 L41 22 M46 14 L46 22 M54 14 L54 22 M59 14 L59 22" stroke={p.k('#FFFFFF')} strokeOpacity={0.14} strokeWidth={1.4} />
          <Rect x={33} y={23} width={34} height={9} rx={3} fill={p.dark} stroke={p.line} strokeWidth={SW} />
          <Rect x={24} y={30} width={52} height={65} rx={16} fill={p.fill} stroke={p.line} strokeWidth={SW} />
          <Path d="M66 34 Q76 36 76 50 L76 80 Q76 93 64 94 Q72 86 72 70 L72 48 Q72 38 66 34 Z" fill={p.k('#000000')} opacity={0.12} />
          <Rect x={29} y={48} width={4.5} height={34} rx={2.2} fill={p.k('#FFFFFF')} opacity={0.3} />
          <Path d="M24 86 L76 86" stroke={p.k('#000000')} strokeOpacity={0.14} strokeWidth={1.2} />
          <Band x1={24} x2={76} y={38} c={5} band={band} k={p.k} />
        </G>
      ),
    }),
  },
  berry: {
    pal: { main: '#4453B8', shade: '#8C9BEA', dark: '#232B6E' },
    face: { ink: '#F3F1FF', line: '#fff', lid: '#4453B8' },
    faceOnMain: true,
    l: [19, 63],
    r: [81, 63],
    emblem: [50, 45],
    top: 24,
    draw: ({ p, band }) => ({
      main: (
        <G>
          <Circle cx={50} cy={62} r={32} fill={p.fill} stroke={p.line} strokeWidth={SW} />
          <Ellipse cx={39} cy={48} rx={14} ry={8} fill={p.k('#FFFFFF')} opacity={0.16} transform="rotate(-24 39 48)" />
          <Path d="M80 56 A32 32 0 0 1 40 92 Q70 88 80 56 Z" fill={p.k('#000000')} opacity={0.18} />
          <Polygon points={star5(50, 31, 8.5, 3.6)} fill={p.dark} stroke={p.line} strokeWidth={1.2} strokeLinejoin="round" />
          <Circle cx={50} cy={31} r={2.4} fill={p.k('#161B45')} />
          <Path d="M53 27 Q58 18 67 18 Q64 26 53 27 Z" fill={p.k('#4E8A3A')} stroke={p.k('#2F5A22')} strokeWidth={1} />
          <Band x1={21} x2={79} y={44} c={9} band={band} k={p.k} />
        </G>
      ),
    }),
  },
  brew: {
    pal: { main: '#F1E9DC', shade: '#FFFFFF', dark: '#CDBBA1' },
    face: { ink: '#2B1D14', line: '#2B1D14', ring: '#2B1D14', lid: '#F1E9DC' },
    faceOnMain: true,
    l: [27, 60],
    r: [73, 60],
    emblem: [50, 45],
    top: 18,
    draw: ({ p, band, phase }) => {
      const w = (phase % 4) - 1.5;
      return {
        main: (
          <G>
            {!p.sil && (
              <G opacity={0.55}>
                <Path d={`M44 16 q${-4 + w} -5 0 -9 q${4 - w} -4 0 -8`} stroke="#B8B2AA" strokeWidth={2} fill="none" strokeLinecap="round" />
                <Path d={`M54 14 q${4 - w} -5 0 -8 q${-3 + w} -4 0 -7`} stroke="#B8B2AA" strokeWidth={1.6} fill="none" strokeLinecap="round" />
              </G>
            )}
            <Path d="M26 39 L74 39 L69 89 Q68 95 62 95 L38 95 Q32 95 31 89 Z" fill={p.fill} stroke={p.line} strokeWidth={SW} strokeLinejoin="round" />
            <Path d="M64 41 L74 41 L69 90 L62 92 Z" fill={p.k('#000000')} opacity={0.07} />
            <Path d="M28.5 76 L71.5 76 L70.2 89 L29.8 89 Z" fill={p.k('#A9774B')} />
            <Path d="M34 78 L34 87 M40 78 L40 87 M46 78 L46 87 M52 78 L52 87 M58 78 L58 87 M64 78 L64 87" stroke={p.k('#7E5433')} strokeWidth={1.1} strokeOpacity={0.6} />
            <Rect x={21} y={31} width={58} height={8} rx={3.5} fill={p.k('#3A2D26')} stroke={p.line} strokeWidth={SW} />
            <Path d="M26 32 L28 25 Q30 19 38 19 L62 19 Q70 19 72 25 L74 32 Z" fill={p.k('#2B211C')} stroke={p.line} strokeWidth={SW} strokeLinejoin="round" />
            <Rect x={55} y={21.5} width={9} height={3} rx={1.5} fill={p.k('#120C09')} />
            <Rect x={30} y={22} width={14} height={2.2} rx={1.1} fill={p.k('#FFFFFF')} opacity={0.18} />
            <Band x1={26} x2={74} y={42} c={4} band={band} k={p.k} />
          </G>
        ),
      };
    },
  },
  medball: {
    pal: { main: '#3B4048', shade: '#E8C547', dark: '#23272D' },
    face: { ink: '#F2F4F6', line: '#fff', lid: '#3B4048' },
    faceOnMain: true,
    l: [20, 64],
    r: [80, 64],
    emblem: [50, 46],
    top: 30,
    draw: ({ p, band }) => ({
      main: (
        <G>
          <Circle cx={50} cy={62} r={33} fill={p.fill} stroke={p.line} strokeWidth={SW} />
          <Path d="M24 42 Q36 62 24 84" stroke={p.dark} strokeWidth={1.6} fill="none" />
          <Path d="M76 42 Q64 62 76 84" stroke={p.dark} strokeWidth={1.6} fill="none" />
          <Path d="M32 88 Q50 80 68 88" stroke={p.dark} strokeWidth={1.6} fill="none" />
          <Path d="M36 32 Q50 26 64 32" stroke={p.shade} strokeWidth={4} fill="none" strokeLinecap="round" />
          <Path d="M17 60 Q19 70 23 76" stroke={p.shade} strokeWidth={3} fill="none" strokeLinecap="round" />
          <Path d="M83 60 Q81 70 77 76" stroke={p.shade} strokeWidth={3} fill="none" strokeLinecap="round" />
          {[
            [30, 60],
            [28, 68],
            [72, 60],
            [70, 52],
            [74, 68],
          ].map(([x, y], i) => (
            <Circle key={i} cx={x} cy={y} r={0.9} fill={p.k('#FFFFFF')} opacity={0.18} />
          ))}
          <Shine x={36} y={44} rx={8} ry={3.8} o={0.16} k={p.k} />
          <Band x1={19} x2={81} y={45} c={10} band={band} k={p.k} />
        </G>
      ),
    }),
  },
  tempo: {
    pal: { main: '#B9C2CC', shade: '#EEF2F6', dark: '#6E7A86' },
    face: { ink: INK, line: INK, ring: '#2A3038', lid: '#FAFBFC' },
    faceOnMain: false,
    l: [19, 64],
    r: [81, 64],
    emblem: [50, 44],
    top: 16,
    draw: ({ p, band, phase }) => {
      const sec = phase % 12;
      const a = (sec / 12) * Math.PI * 2 - Math.PI / 2;
      const ex = 50 + Math.cos(a) * 23.5;
      const ey = 62 + Math.sin(a) * 23.5;
      return {
        main: (
          <G>
            <Rect x={42} y={13} width={16} height={5} rx={2.5} fill={p.shade} stroke={p.line} strokeWidth={SW} />
            <Rect x={45.5} y={17} width={9} height={11} rx={2} fill={p.dark} stroke={p.line} strokeWidth={SW} />
            <Rect x={71} y={28} width={9} height={7} rx={2} fill={p.dark} stroke={p.line} strokeWidth={SW} transform="rotate(40 75 31)" />
            <Circle cx={50} cy={62} r={32} fill={p.fill} stroke={p.line} strokeWidth={SW} />
            <Circle cx={50} cy={62} r={27} fill={p.k('#FAFBFC')} stroke={p.dark} strokeWidth={1.2} />
            <Path d="M73 60 A23 23 0 0 1 40 83 Q66 80 73 60 Z" fill={p.k('#000000')} opacity={0.05} />
            {Array.from({ length: 12 }, (_, i) => {
              const t = (i / 12) * Math.PI * 2;
              const r1 = i % 3 ? 24 : 22;
              return <Path key={i} d={`M${50 + Math.cos(t) * r1} ${62 + Math.sin(t) * r1} L${50 + Math.cos(t) * 25.5} ${62 + Math.sin(t) * 25.5}`} stroke={p.k('#8A949E')} strokeWidth={i % 3 ? 0.9 : 1.6} strokeLinecap="round" />;
            })}
            {!p.sil && sec > 0 && <Path d={`M50 38.5 A23.5 23.5 0 ${sec > 6 ? 1 : 0} 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`} stroke="#E0483E" strokeWidth={1.8} fill="none" strokeLinecap="round" />}
            <Shine x={34} y={40} rx={7} ry={3} o={0.45} k={p.k} />
            <Band x1={20} x2={80} y={42} c={8} h={6} band={band} k={p.k} />
          </G>
        ),
      };
    },
  },
  kicks: {
    pal: { main: '#E4572E', shade: '#FF9B6B', dark: '#A63718' },
    face: { ink: INK, line: '#fff', lid: '#E4572E' },
    faceOnMain: true,
    l: [18, 70],
    r: [88, 62],
    emblem: [72, 36],
    top: 30,
    draw: ({ p, band }) => ({
      main: (
        <G>
          <Path d="M8 83 Q6 70 18 66 L30 61 Q36 44 48 36 L64 30 Q80 27 84 40 L88 58 Q94 66 94 82 Z" fill={p.fill} stroke={p.line} strokeWidth={SW} strokeLinejoin="round" />
          <Path d="M8 83 Q6 70 18 66 L25 64 Q19 72 21 83 Z" fill={p.k('#000000')} opacity={0.14} />
          <Path d="M84 40 L88 58 Q94 66 94 82 L86 82 Q88 64 80 56 Z" fill={p.k('#000000')} opacity={0.12} />
          <Path d="M58 34 Q70 26 83 34 L81 40 Q70 34 61 39 Z" fill={p.dark} />
          <Path d="M40 50 L47 45 M44 55 L51 49 M49 45 L55 40" stroke={p.k('#FFFFFF')} strokeWidth={2} strokeLinecap="round" />
          <Path d="M14 80 Q50 71 92 76" stroke={p.shade} strokeWidth={3.2} fill="none" strokeLinecap="round" />
          <Path d="M7 82 L95 82 L95 87 Q95 95 86 95 L16 95 Q7 95 7 88 Z" fill={p.k('#F4F4F2')} stroke={p.line} strokeWidth={SW} strokeLinejoin="round" />
          <Path d="M10 91 L92 91" stroke={p.k('#CFCFC9')} strokeWidth={1.2} strokeDasharray="4 3" />
          <Shine x={60} y={36} rx={5} ry={2} o={0.35} k={p.k} rot={-20} />
          <Path d="M59 40 Q71 31 84 37 L85 44 Q72 38 60 47 Z" fill={p.k(band)} />
        </G>
      ),
    }),
  },
  quartz: {
    pal: { main: '#8B6CF0', shade: '#D9CCFF', dark: '#4C31A6' },
    face: { ink: '#24124F', line: '#fff', lid: '#8B6CF0' },
    faceOnMain: true,
    l: [29, 64],
    r: [71, 64],
    emblem: [50, 47],
    top: 12,
    draw: ({ p, band }) => ({
      back: (
        <G>
          <Polygon points="16,94 13,64 21,51 30,64 31,94" fill={p.dark} stroke={p.line} strokeWidth={SW} strokeLinejoin="round" />
          <Polygon points="69,94 71,58 80,45 88,58 85,94" fill={p.dark} stroke={p.line} strokeWidth={SW} strokeLinejoin="round" />
          <Polygon points="21,51 25,64 25,94 16,94 13,64" fill={p.k('#FFFFFF')} opacity={0.12} />
        </G>
      ),
      main: (
        <G>
          <Polygon points="29,95 27,40 50,9 73,40 71,95" fill={p.fill} stroke={p.line} strokeWidth={SW} strokeLinejoin="round" />
          <Polygon points="50,9 39,40 40,95 29,95 27,40" fill={p.k('#FFFFFF')} opacity={0.14} />
          <Polygon points="50,9 61,40 60,95 71,95 73,40" fill={p.k('#000000')} opacity={0.14} />
          <Path d="M27 40 L73 40" stroke={p.k('#FFFFFF')} strokeOpacity={0.3} strokeWidth={1} />
          <Ellipse cx={50} cy={70} rx={15} ry={19} fill={p.shade} opacity={0.22} />
          <Path d={star4(62, 24, 4)} fill={p.k('#FFFFFF')} opacity={0.85} />
          <Band x1={28} x2={72} y={45} c={4} band={band} k={p.k} />
        </G>
      ),
    }),
  },
  atlas: {
    pal: { main: '#7E8590', shade: '#6FE3C8', dark: '#4A505A' },
    face: { ink: '#1C2026', line: '#1C2026', ring: '#1C2026', lid: '#7E8590' },
    faceOnMain: true,
    l: [18, 60],
    r: [82, 60],
    emblem: [50, 40],
    top: 22,
    draw: ({ p, band }) => ({
      main: (
        <G>
          <Ellipse cx={20} cy={58} rx={9} ry={11} fill={p.dark} stroke={p.line} strokeWidth={SW} />
          <Ellipse cx={80} cy={58} rx={9} ry={11} fill={p.dark} stroke={p.line} strokeWidth={SW} />
          <Path d="M22 95 L20 50 Q20 28 38 25 L62 25 Q80 28 80 50 L78 95 Z" fill={p.fill} stroke={p.line} strokeWidth={SW} strokeLinejoin="round" />
          <Path d="M70 30 Q80 36 80 50 L78 95 L68 95 Q74 60 70 30 Z" fill={p.k('#000000')} opacity={0.14} />
          <Path d="M27 44 L33 49 L29 55" stroke={p.dark} strokeWidth={1.3} fill="none" strokeLinejoin="round" />
          <Path d="M72 76 L66 80 L70 86" stroke={p.dark} strokeWidth={1.3} fill="none" strokeLinejoin="round" />
          <Path d="M31 27 Q39 19 50 25 Q60 18 69 27 Q60 31 50 29 Q40 32 31 27 Z" fill={p.k('#6E9A4B')} stroke={p.k('#4A6E30')} strokeWidth={1} />
          <Path d="M52 25 Q53 17 59 14" stroke={p.k('#4A6E30')} strokeWidth={1.4} fill="none" strokeLinecap="round" />
          <Ellipse cx={60} cy={14} rx={3.4} ry={1.8} fill={p.k('#7FB04F')} transform="rotate(-30 60 14)" />
          {!p.sil && <Ellipse cx={50} cy={87} rx={10} ry={5} fill={p.shade} opacity={0.25} />}
          <Path d="M43 89 L50 84 L57 89 M50 84 L50 92" stroke={p.shade} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Band x1={21} x2={79} y={37} c={4} band={band} k={p.k} />
        </G>
      ),
    }),
  },
  luna: {
    pal: { main: '#E8E2CC', shade: '#FFF7DA', dark: '#6C74A8' },
    face: { ink: '#2B2F4A', line: '#2B2F4A', ring: '#2B2F4A', lid: '#E8E2CC' },
    faceOnMain: true,
    l: [19, 64],
    r: [81, 64],
    emblem: [50, 44],
    top: 29,
    draw: ({ p, band }) => ({
      back: <Circle cx={50} cy={61} r={39} fill={p.shade} opacity={p.sil ? 0 : 0.14} />,
      main: (
        <G>
          <Circle cx={50} cy={61} r={32} fill={p.fill} stroke={p.line} strokeWidth={SW} />
          <Path d="M62 31 A32 32 0 0 1 62 91 A13 31 0 0 0 62 31 Z" fill={p.dark} opacity={0.5} />
          <Circle cx={35} cy={47} r={4.2} fill={p.dark} opacity={0.16} />
          <Circle cx={43} cy={86} r={3} fill={p.dark} opacity={0.14} />
          <Circle cx={27} cy={64} r={2.4} fill={p.dark} opacity={0.14} />
          <Circle cx={71} cy={78} r={2.2} fill={p.k('#FFFFFF')} opacity={0.2} />
          <Path d={star4(82, 30, 4.5)} fill={p.k('#FFE7A0')} />
          <Path d={star4(90, 44, 2.4)} fill={p.k('#FFE7A0')} opacity={0.8} />
          <Band x1={21} x2={79} y={42} c={9} band={band} k={p.k} />
        </G>
      ),
    }),
  },
  nova: {
    pal: { main: '#FFB347', shade: '#A99CFF', dark: '#D9502E' },
    face: { ink: '#4A1B08', line: '#4A1B08', ring: '#4A1B08', lid: '#FFC878' },
    faceOnMain: true,
    l: [19, 66],
    r: [77, 66],
    emblem: [48, 47],
    top: 33,
    draw: ({ p, band, phase }) => {
      const f = [0, 2, -1.5, 1][phase % 4];
      return {
        back: (
          <G>
            <Circle cx={48} cy={64} r={38} fill={p.main} opacity={p.sil ? 0 : 0.18} />
            <Path d={`M28 58 Q50 ${16 + f} ${104 + f} -3 Q76 28 72 68 Z`} fill={p.shade} opacity={0.4} />
            <Path d={`M34 50 Q60 ${22 - f} 100 ${12 + f} Q78 36 72 64 Z`} fill={p.shade} opacity={0.6} />
            <Path d={`M42 44 Q66 32 ${95 - f} 27 Q78 43 71 60 Z`} fill={p.k('#FFE6B0')} opacity={0.75} />
            {!p.sil && <Path d={star4(92, 8, 3)} fill="#FFFFFF" opacity={0.9} />}
          </G>
        ),
        main: (
          <G>
            <Circle cx={48} cy={64} r={30} fill={p.fill} stroke={p.dark} strokeWidth={SW} />
            <Ellipse cx={40} cy={54} rx={15} ry={11} fill={p.k('#FFFFFF')} opacity={0.32} transform="rotate(-20 40 54)" />
            <Path d="M75 58 A30 30 0 0 1 34 92 Q68 90 75 58 Z" fill={p.dark} opacity={0.22} />
            <Path d={star4(12, 40, 3.5)} fill={p.k('#FFFFFF')} opacity={0.9} />
            <Path d={star4(86, 80, 2.6)} fill={p.k('#FFFFFF')} opacity={0.8} />
            <Band x1={19} x2={77} y={44} c={10} band={band} k={p.k} />
          </G>
        ),
      };
    },
  },
};

/** Species that animate on their own (flicker, steam, ticking). */
export const LIVELY: Partial<Record<Species, number>> = { flame: 220, brew: 260, nova: 240, tempo: 1000 };
