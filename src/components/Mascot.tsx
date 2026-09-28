import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { nativeDriver } from './motion';

export type Mood = 'happy' | 'pumped' | 'proud' | 'hungry' | 'sleepy' | 'wink';

export type Species = 'kettle' | 'shaker' | 'egg' | 'dumbbell' | 'avo' | 'broc' | 'plate' | 'flame';

/** Outfits: main body colors. 'classic' is each pet's own look and free; the rest come with Pro. */
export const SKINS: Record<string, { name: string; body: string; shade: string; dark: string }> = {
  classic: { name: 'Classic', body: '#1F4A36', shade: '#2E6B4E', dark: '#1C3A2C' },
  gold: { name: 'Gold', body: '#9A6B12', shade: '#E0A82E', dark: '#6E4B0B' },
  midnight: { name: 'Midnight', body: '#1E2250', shade: '#3A43A0', dark: '#151837' },
  cherry: { name: 'Cherry', body: '#6E1830', shade: '#B2304F', dark: '#4F1022' },
  neon: { name: 'Neon', body: '#0F2A2A', shade: '#19D3C5', dark: '#0A1C1C' },
};

/** Every pet you can pick, with its default name and personality. */
export const PETS: { key: Species; name: string; kind: string; pro: boolean; blurb: string }[] = [
  { key: 'kettle', name: 'Kettle', kind: 'kettlebell', pro: false, blurb: 'Solid, steady and always up for one more swing.' },
  { key: 'shaker', name: 'Shaky', kind: 'protein shaker', pro: false, blurb: 'Bubbly hype machine who never skips post-workout.' },
  { key: 'egg', name: 'Eggbert', kind: 'egg', pro: false, blurb: 'Small, sunny and packed with protein-powered optimism.' },
  { key: 'dumbbell', name: 'Dumbo', kind: 'dumbbell', pro: true, blurb: 'A gentle giant who believes in balanced reps on both sides.' },
  { key: 'avo', name: 'Avo', kind: 'avocado', pro: true, blurb: 'Chill, full of good fats and zero stress about rest days.' },
  { key: 'broc', name: 'Broc', kind: 'broccoli', pro: true, blurb: 'Tough-love veggie who will ask if you ate your greens.' },
  { key: 'plate', name: 'Plato', kind: 'weight plate', pro: true, blurb: 'Deep thinker who knows every plate counts.' },
  { key: 'flame', name: 'Blaze', kind: 'fire spirit', pro: true, blurb: 'A little fire spirit that burns hot for every streak.' },
];

type Pal = { main: string; shade: string; dark: string };
type Face = { ink: string; line: string; ring?: string; dy?: number };
type Pt = [number, number];

const INK = '#0B1A12';

function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** Blend `b` over `a` at opacity t. */
function mix(a: string, b: string, t: number) {
  const x = hex(a);
  const y = hex(b);
  return '#' + x.map((v, i) => Math.round(v * (1 - t) + y[i] * t).toString(16).padStart(2, '0')).join('');
}

const skinPal = (key: string): Pal => {
  const s = SKINS[key] ?? SKINS.classic;
  return { main: mix(s.body, s.shade, 0.55), shade: s.shade, dark: s.dark };
};

/**
 * Per species: its classic palette, face colors, whether the face sits on the
 * recolorable body (so skins also swap the face ink), arm color override and
 * shoulder anchors (left, right).
 */
const DEF: Record<Species, { pal: Pal; face: Face; faceOnMain: boolean; arm?: string; l: Pt; r: Pt }> = {
  kettle: { pal: skinPal('classic'), face: { ink: INK, line: '#fff' }, faceOnMain: true, l: [20, 60], r: [80, 60] },
  shaker: { pal: { main: '#23A99D', shade: '#7FE6DA', dark: '#0F625A' }, face: { ink: INK, line: '#fff' }, faceOnMain: true, l: [23, 62], r: [77, 62] },
  egg: { pal: { main: '#FFF4E0', shade: '#FFFFFF', dark: '#D8B77C' }, face: { ink: '#3A2A1A', line: '#3A2A1A', ring: '#3A2A1A' }, faceOnMain: true, l: [19, 62], r: [81, 62] },
  dumbbell: { pal: { main: '#9AA4AE', shade: '#DCE2E8', dark: '#565E67' }, face: { ink: INK, line: '#fff' }, faceOnMain: true, l: [14, 58], r: [85, 58] },
  avo: { pal: { main: '#3F7A2A', shade: '#6FA844', dark: '#2A5419' }, face: { ink: '#24380F', line: '#24380F', ring: '#24380F', dy: -6 }, faceOnMain: false, l: [20, 62], r: [80, 62] },
  broc: { pal: { main: '#2F8C3B', shade: '#5CC266', dark: '#1D5E27' }, face: { ink: '#1E3A12', line: '#1E3A12', ring: '#1E3A12' }, faceOnMain: false, arm: '#78AE45', l: [28, 64], r: [72, 64] },
  plate: { pal: { main: '#30353C', shade: '#5B646E', dark: '#1B1F23' }, face: { ink: '#F2F4F6', line: '#fff' }, faceOnMain: true, l: [19, 62], r: [81, 62] },
  flame: { pal: { main: '#FF7A1A', shade: '#FFB347', dark: '#D9480F' }, face: { ink: '#5A1E00', line: '#5A1E00', ring: '#5A1E00' }, faceOnMain: false, l: [18, 64], r: [82, 64] },
};

const Highlight = ({ x = 40, y = 48, rx = 12, ry = 7, o = 0.14 }: { x?: number; y?: number; rx?: number; ry?: number; o?: number }) => (
  <Ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#FFFFFF" opacity={o} transform={`rotate(-25 ${x} ${y})`} />
);

/** Bandana tail knot on the right side of a sweatband. */
const Knot = ({ x, y, band }: { x: number; y: number; band: string }) => <Path d={`M${x} ${y} L${x + 10} ${y - 5} L${x + 8} ${y + 3} Z`} fill={band} />;

/** Species body: `back` draws behind the arms, `main` in front (with the sweatband). */
function drawBody(species: Species, p: Pal, band: string, flick: number): { back?: React.ReactNode; main: React.ReactNode } {
  switch (species) {
    case 'shaker':
      return {
        main: (
          <G>
            <Path d="M22 36 L78 36 L75 88 Q74 93 69 93 L31 93 Q26 93 25 88 Z" fill={p.main} />
            <Path d="M66 38 L74 38 L71 90 L65 90 Z" fill="#000" opacity={0.1} />
            <Highlight x={33} y={56} rx={4} ry={14} o={0.22} />
            {/* measure ticks */}
            <Path d="M69 56 L74 56 M71 62 L74 62 M69 68 L74 68" stroke="#fff" strokeOpacity={0.55} strokeWidth={1.6} strokeLinecap="round" />
            {/* lid + flip cap */}
            <Rect x="40" y="13" width="20" height="10" rx="3.5" fill="#1B1D21" />
            <Rect x="44" y="9" width="12" height="6" rx="3" fill="#2B2E34" />
            <Rect x="19" y="22" width="62" height="16" rx="6" fill="#1B1D21" />
            <Rect x="23" y="25" width="34" height="3" rx="1.5" fill="#fff" opacity={0.18} />
            {/* sweatband */}
            <Path d="M23 43 Q50 38 77 43 L77 50 Q50 45 23 50 Z" fill={band} />
            <Knot x={76} y={45} band={band} />
          </G>
        ),
      };
    case 'egg':
      return {
        main: (
          <G>
            <Path d="M50 18 C72 18 85 50 85 66 C85 83 70 94 50 94 C30 94 15 83 15 66 C15 50 28 18 50 18 Z" fill={p.main} stroke={mix(p.main, p.dark, 0.6)} strokeWidth={2} />
            <Path d="M70 36 C80 50 83 62 82 72 C80 84 70 90 58 92 C72 84 78 66 70 36 Z" fill="#000" opacity={0.06} />
            <Highlight x={37} y={38} rx={9} ry={5} o={0.7} />
            <Circle cx="66" cy="54" r="1.6" fill={p.dark} opacity={0.5} />
            <Circle cx="72" cy="62" r="1.1" fill={p.dark} opacity={0.5} />
            <Circle cx="30" cy="84" r="1.3" fill={p.dark} opacity={0.5} />
            <Path d="M24 45 Q50 36 76 45 L78 52 Q50 43 22 52 Z" fill={band} />
            <Knot x={76} y={47} band={band} />
          </G>
        ),
      };
    case 'dumbbell': {
      const plate = '#262B31';
      return {
        main: (
          <G>
            {/* collars */}
            <Rect x="20" y="50" width="10" height="30" rx="3" fill={p.dark} />
            <Rect x="70" y="50" width="10" height="30" rx="3" fill={p.dark} />
            {/* plates */}
            <Rect x="9" y="36" width="15" height="58" rx="5" fill={plate} />
            <Rect x="76" y="36" width="15" height="58" rx="5" fill={plate} />
            <Rect x="12" y="40" width="3" height="50" rx="1.5" fill="#fff" opacity={0.14} />
            <Rect x="79" y="40" width="3" height="50" rx="1.5" fill="#fff" opacity={0.14} />
            {/* chubby grip body */}
            <Rect x="26" y="38" width="48" height="54" rx="17" fill={p.main} />
            <Path d="M62 42 Q74 48 74 70 Q74 88 60 92 L66 92 Q74 88 74 75 Z" fill="#000" opacity={0.08} />
            <Highlight x={38} y={50} rx={8} ry={5} o={0.35} />
            {/* knurling */}
            <Path d="M40 86 L42 90 M46 86 L48 90 M52 86 L54 90 M58 86 L60 90" stroke={p.dark} strokeOpacity={0.4} strokeWidth={1.2} strokeLinecap="round" />
            <Path d="M26 46 Q50 39 74 46 L74 53 Q50 46 26 53 Z" fill={band} />
            <Knot x={73} y={48} band={band} />
          </G>
        ),
      };
    }
    case 'avo': {
      const outline = 'M50 12 C62 12 66 26 70 38 C80 52 86 62 86 74 C86 88 70 96 50 96 C30 96 14 88 14 74 C14 62 20 52 30 38 C34 26 38 12 50 12 Z';
      return {
        main: (
          <G>
            <Path d={outline} fill={p.main} />
            <Path d={outline} fill="#DCEB9A" transform="translate(50 60) scale(0.86) translate(-50 -60)" />
            <Path d={outline} fill="#F1F7C0" opacity={0.7} transform="translate(50 64) scale(0.6) translate(-50 -64)" />
            {/* pit belly */}
            <Circle cx="50" cy="85" r="7.5" fill="#8B5A2B" />
            <Circle cx="47.5" cy="82.5" r="2.4" fill="#fff" opacity={0.3} />
            <Path d="M30 39 Q50 33 70 39 L73 46 Q50 40 27 46 Z" fill={band} />
            <Knot x={71} y={41} band={band} />
          </G>
        ),
      };
    }
    case 'broc':
      return {
        main: (
          <G>
            {/* stalk */}
            <Path d="M30 46 L70 46 L72 84 Q73 93 64 93 L36 93 Q27 93 28 84 Z" fill="#B7DC7F" />
            <Path d="M62 50 L70 50 L71 86 Q70 91 64 91 Z" fill="#000" opacity={0.07} />
            {/* floret crown */}
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
              <Circle key={i} cx={x} cy={y} r={r} fill={p.main} stroke={p.dark} strokeWidth={1.4} />
            ))}
            {(
              [
                [45, 14, 4],
                [31, 21, 3.2],
                [18, 35, 2.8],
                [60, 20, 3],
              ] as const
            ).map(([x, y, r], i) => (
              <Circle key={i} cx={x} cy={y} r={r} fill={p.shade} opacity={0.7} />
            ))}
            <Path d="M11 36 Q50 26 89 36 L89 43 Q50 33 11 43 Z" fill={band} />
            <Knot x={88} y={37} band={band} />
          </G>
        ),
      };
    case 'plate':
      return {
        main: (
          <G>
            <Circle cx="50" cy="60" r="33" fill={p.main} />
            <Circle cx="50" cy="60" r="29.5" fill="none" stroke={p.shade} strokeWidth={2.2} />
            <Circle cx="50" cy="60" r="33" fill="none" stroke={p.dark} strokeWidth={1.5} />
            {/* grip slots */}
            <Path d="M24 72 Q22 66 23 61" stroke={p.dark} strokeWidth={3.5} strokeLinecap="round" fill="none" />
            <Path d="M76 72 Q78 66 77 61" stroke={p.dark} strokeWidth={3.5} strokeLinecap="round" fill="none" />
            <Highlight x={36} y={42} rx={10} ry={5} o={0.16} />
            {/* hub and center hole */}
            <Circle cx="50" cy="52" r="7.5" fill="#8C959E" />
            <Circle cx="50" cy="52" r="7.5" fill="none" stroke="#C8CFD6" strokeWidth={1} />
            <Circle cx="50" cy="52" r="3.8" fill="#121518" />
            <Path d="M26 38 Q50 29 74 38 L77 45 Q50 36 23 45 Z" fill={band} />
            <Knot x={75} y={40} band={band} />
          </G>
        ),
      };
    case 'flame': {
      const t = [0, 3, -2][flick] ?? 0;
      const s = [0, -2, 2][flick] ?? 0;
      return {
        main: (
          <G>
            <Path
              d={`M${50 + t} 4 C${56 + t} 18 66 24 70 34 C74 27 ${72 + s} 20 ${70 + s} 13 C82 25 88 44 86 62 C86 82 70 94 50 94 C30 94 14 82 14 62 C14 46 22 36 ${29 - s} 26 C30 35 32 40 36 42 C34 28 ${40 + t} 16 ${50 + t} 4 Z`}
              fill={p.main}
            />
            <Path d={`M${50 + t / 2} 24 C56 34 74 46 76 64 C77 82 64 91 50 91 C36 91 23 82 24 64 C25 48 42 38 ${50 + t / 2} 24 Z`} fill={p.shade} opacity={0.75} />
            <Path d="M50 40 C57 50 72 56 72 70 C72 84 62 90 50 90 C38 90 28 84 28 70 C28 58 42 50 50 40 Z" fill="#FFD84A" />
            <Ellipse cx="50" cy="80" rx="13" ry="8" fill="#FFF3B8" opacity={0.7} />
            <Path d="M17 50 Q50 40 83 50 L84 57 Q50 47 16 57 Z" fill={band} />
            <Knot x={83} y={52} band={band} />
          </G>
        ),
      };
    }
    case 'kettle':
    default:
      return {
        back: (
          <G>
            <Path d="M32 34 C30 10 70 10 68 34" fill="none" stroke={p.dark} strokeWidth={9} strokeLinecap="round" />
            <Path d="M36 32 C35 16 65 16 64 32" fill="none" stroke={p.shade} strokeWidth={3} strokeLinecap="round" />
          </G>
        ),
        main: (
          <G>
            <Circle cx="50" cy="62" r="31" fill={p.main} />
            <Highlight />
            <Rect x="33" y="88" width="34" height="5" rx="2.5" fill={p.dark} />
            <Path d="M22 48 Q50 38 78 48 L77 55 Q50 46 23 55 Z" fill={band} />
            <Path d="M76 50 L86 45 L84 53 Z" fill={band} />
          </G>
        ),
      };
  }
}

function Arms({ l, r, flex, color }: { l: Pt; r: Pt; flex: boolean; color: string }) {
  const [lx, ly] = l;
  const [rx, ry] = r;
  const w = { stroke: color, strokeWidth: 7, strokeLinecap: 'round' as const, fill: 'none' };
  if (flex) {
    return (
      <G>
        <Path d={`M${lx} ${ly} Q${lx - 12} ${ly - 8} ${lx - 8} ${ly - 22}`} {...w} />
        <Circle cx={lx - 8} cy={ly - 24} r="6" fill={color} />
        <Path d={`M${rx} ${ry} Q${rx + 12} ${ry - 8} ${rx + 8} ${ry - 22}`} {...w} />
        <Circle cx={rx + 8} cy={ry - 24} r="6" fill={color} />
      </G>
    );
  }
  return (
    <G>
      <Path d={`M${lx + 1} ${ly + 4} Q${lx - 8} ${ly + 10} ${lx - 6} ${ly + 18}`} {...w} />
      <Path d={`M${rx - 1} ${ry + 4} Q${rx + 8} ${ry - 2} ${rx + 10} ${ry - 12}`} {...w} />
      <Circle cx={rx + 10} cy={ry - 14} r="5" fill={color} />
    </G>
  );
}

function FaceView({ mood, blink, face }: { mood: Mood; blink: boolean; face: Face }) {
  const { ink, line, ring } = face;
  const dy = face.dy ?? 0;
  const eyesClosed = blink || mood === 'sleepy';
  const flex = mood === 'pumped' || mood === 'proud';
  const eye = (cx: number) => <Circle cx={cx} cy="65" r="5.5" fill="#fff" stroke={ring} strokeWidth={ring ? 1.4 : 0} />;
  return (
    <G transform={dy ? `translate(0 ${dy})` : undefined}>
      {eyesClosed ? (
        <G>
          <Path d="M36 66 Q40 69 44 66" stroke={line} strokeWidth={2.6} strokeLinecap="round" fill="none" />
          <Path d="M56 66 Q60 69 64 66" stroke={line} strokeWidth={2.6} strokeLinecap="round" fill="none" />
        </G>
      ) : mood === 'wink' ? (
        <G>
          {eye(40)}
          <Circle cx="41" cy="66" r="3" fill={INK} />
          <Path d="M56 66 Q60 62 64 66" stroke={line} strokeWidth={2.6} strokeLinecap="round" fill="none" />
        </G>
      ) : (
        <G>
          {eye(40)}
          {eye(60)}
          <Circle cx={mood === 'hungry' ? 42 : 41} cy="66" r="3" fill={INK} />
          <Circle cx={mood === 'hungry' ? 62 : 61} cy="66" r="3" fill={INK} />
          <Circle cx="42" cy="64.5" r="1" fill="#fff" />
          <Circle cx="62" cy="64.5" r="1" fill="#fff" />
        </G>
      )}
      {flex && (
        <G>
          <Path d="M34 57 L45 59" stroke={ink} strokeWidth={2.5} strokeLinecap="round" />
          <Path d="M66 57 L55 59" stroke={ink} strokeWidth={2.5} strokeLinecap="round" />
        </G>
      )}
      <Circle cx="32" cy="74" r="4" fill="#FF8FA3" opacity={0.55} />
      <Circle cx="68" cy="74" r="4" fill="#FF8FA3" opacity={0.55} />
      {mood === 'hungry' ? (
        <Ellipse cx="50" cy="78" rx="4" ry="4.5" fill={ink} />
      ) : mood === 'sleepy' ? (
        <Path d="M46 78 L54 78" stroke={ink} strokeWidth={2.4} strokeLinecap="round" />
      ) : (
        <Path d={flex ? 'M42 75 Q50 85 58 75 Z' : 'M44 76 Q50 82 56 76'} stroke={ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill={flex ? ink : 'none'} />
      )}
    </G>
  );
}

type PetProps = { species?: Species; size?: number; mood?: Mood; band?: string; animate?: boolean; skin?: string };

/**
 * A pet buddy with a sweatband who cheers you on. Every species shares the same
 * face and arms; drawn in SVG so it stays crisp at any size. The band color
 * follows your rank tier, and non-classic skins recolor the main body.
 */
export function Pet({ species = 'kettle', size = 72, mood = 'happy', band = '#22B573', animate = true, skin = 'classic' }: PetProps) {
  const def = DEF[species] ?? DEF.kettle;
  const skinned = skin !== 'classic' && !!SKINS[skin];
  const pal = skinned ? skinPal(skin) : def.pal;
  const face = skinned && def.faceOnMain ? { ink: INK, line: '#fff', dy: def.face.dy } : def.face;
  const bob = useRef(new Animated.Value(0)).current;
  const [blink, setBlink] = useState(false);
  const [flick, setFlick] = useState(0);

  useEffect(() => {
    if (!animate) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: nativeDriver }),
        Animated.timing(bob, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: nativeDriver }),
      ]),
    );
    loop.start();
    let t: ReturnType<typeof setTimeout>;
    let b: ReturnType<typeof setTimeout>;
    const schedule = () => {
      t = setTimeout(() => {
        setBlink(true);
        b = setTimeout(() => setBlink(false), 140);
        schedule();
      }, 2200 + Math.random() * 2600);
    };
    schedule();
    return () => {
      loop.stop();
      clearTimeout(t);
      clearTimeout(b);
    };
  }, [animate, bob]);

  useEffect(() => {
    if (!animate || species !== 'flame') return;
    const id = setInterval(() => setFlick((f) => (f + 1) % 3), 220);
    return () => clearInterval(id);
  }, [animate, species]);

  const flex = mood === 'pumped' || mood === 'proud';
  const { back, main } = drawBody(species, pal, band, species === 'flame' ? flick : 0);
  const armColor = def.arm ?? pal.dark;

  return (
    <Animated.View style={{ width: size, height: size, transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.05] }) }] }}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100">
        <Ellipse cx="50" cy="95" rx="24" ry="3.5" fill="#000" opacity={0.12} />
        {back}
        <Arms l={def.l} r={def.r} flex={flex} color={armColor} />
        {main}
        <FaceView mood={mood} blink={blink} face={face} />
      </Svg>
    </Animated.View>
  );
}

/** Kettle, the original buddy. Pass `species` to render another pet in its place. */
export function Kettle({ species = 'kettle', ...props }: PetProps) {
  return <Pet species={species} {...props} />;
}

/** A springy pop-in used for the mascot toast. */
export function usePop(visible: boolean) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: visible ? 1 : 0, useNativeDriver: nativeDriver, speed: 14, bounciness: visible ? 12 : 0 }).start();
  }, [visible, v]);
  return v;
}
