import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import type { AvatarConfig } from '@/lib/types';
import { BG_DARK, BG_LIGHT, HAIR_COLORS, SKIN_TONES, TOP_COLORS } from './avatarConfig';

/** Mixes a hex color toward black (amt > 0) or white (amt < 0). */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const t = amt < 0 ? 255 : 0;
  const p = Math.abs(amt);
  const ch = (v: number) => Math.round(v + (t - v) * p);
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

const HEADS = [
  'M50 24 C60.5 24 67 31.5 67 42 C67 54 60 64 50 64 C40 64 33 54 33 42 C33 31.5 39.5 24 50 24 Z',
  'M50 24 C61 24 68 32 68 43 C68 55 60 63 50 63 C40 63 32 55 32 43 C32 32 39 24 50 24 Z',
  'M50 24 C61 24 67 30 67 40 L67 50 C67 58 60 63.5 50 63.5 C40 63.5 33 58 33 50 L33 40 C33 30 39 24 50 24 Z',
  'M50 24 C61.5 24 67.5 31 67.5 41 C67.5 51 61 58 55 62 C52 64.5 48 64.5 45 62 C39 58 32.5 51 32.5 41 C32.5 31 38.5 24 50 24 Z',
];

// Hair drawn behind the head (and shoulders).
function HairBack({ style, color }: { style: number; color: string }) {
  switch (style) {
    case 4: // bun
      return <Circle cx={50} cy={17.5} r={7.5} fill={color} />;
    case 5: // long
      return <Path d="M31 40 C29 24 39 18 50 18 C61 18 71 24 69 40 L71 76 C66 80 61 79 59 74 L41 74 C39 79 34 80 29 76 Z" fill={color} />;
    case 6: // bob
      return <Path d="M30 44 C28 24 39 18.5 50 18.5 C61 18.5 72 24 70 44 L70.5 58 C66 61 62 60 61 57 L39 57 C38 60 34 61 29.5 58 Z" fill={color} />;
    case 7: {
      // afro: a soft cloud of curls
      const bumps = Array.from({ length: 14 }, (_, i) => {
        const a = (Math.PI * 2 * i) / 14;
        return <Circle key={i} cx={50 + Math.cos(a) * 21} cy={37 + Math.sin(a) * 17} r={7} fill={color} />;
      });
      return (
        <G>
          <Ellipse cx={50} cy={37} rx={23} ry={19} fill={color} />
          {bumps}
        </G>
      );
    }
    case 9: // ponytail swinging out the back
      return <Path d="M60 27 C73 27 78 42 73 60 C71 64 68 64 68 60 C69 50 66 40 58 34 Z" fill={color} />;
    default:
      return null;
  }
}

// Hair drawn over the forehead.
function HairFront({ style, color }: { style: number; color: string }) {
  const dark = shade(color, 0.25);
  switch (style) {
    case 0:
      return <Path d="M32.5 44 C31 28 38 21 50 21 C62 21 69 28 67.5 44 C66 37 64 33 61 31 C55 34 45 34 38 31.5 C35 34 33.5 38 32.5 44 Z" fill={color} />;
    case 1:
      return (
        <G>
          <Path d="M32.5 45 C30 27 39 19.5 51 19.5 C63 19.5 70.5 27 67.5 45 C66.5 36 64 31.5 60 29.5 C52 32 41 33 35.5 36.5 C34 39 33 42 32.5 45 Z" fill={color} />
          <Path d="M58 21.5 C55 25 55 28 57.5 30" stroke={dark} strokeWidth={1} fill="none" strokeLinecap="round" />
        </G>
      );
    case 2:
      return <Path d="M33.2 40 C33.5 29 40 23.6 50 23.6 C60 23.6 66.5 29 66.8 40 C63 34.5 57 32.5 50 32.5 C43 32.5 37 34.5 33.2 40 Z" fill={color} opacity={0.85} />;
    case 3: {
      const curls: React.ReactNode[] = [];
      for (let i = 0; i <= 8; i++) {
        const a = Math.PI + (Math.PI * i) / 8;
        curls.push(<Circle key={i} cx={50 + Math.cos(a) * 17.5} cy={39 + Math.sin(a) * 15.5} r={5.4} fill={color} />);
      }
      return (
        <G>
          <Path d="M33 40 C33 28 40 22 50 22 C60 22 67 28 67 40 C62 34 57 32 50 32 C43 32 38 34 33 40 Z" fill={color} />
          {curls}
          <Circle cx={43} cy={27} r={5} fill={color} />
          <Circle cx={56} cy={26.5} r={5} fill={color} />
        </G>
      );
    }
    case 4:
    case 9:
      return (
        <G>
          <Path d="M32.8 42 C32 28 39 22 50 22 C61 22 68 28 67.2 42 C64 34 58 31 50 31 C42 31 36 34 32.8 42 Z" fill={color} />
          <Path d="M42 24.5 C45 28 48 30 50 31" stroke={dark} strokeWidth={0.8} fill="none" strokeLinecap="round" opacity={0.7} />
        </G>
      );
    case 5:
      return (
        <G>
          <Path d="M32.5 46 C31 28 38 21 50 21 C62 21 69 28 67.5 46 C65 36 60 30.5 52 30 C50 33 46 35 42 35.5 C37 37 34 41 32.5 46 Z" fill={color} />
          <Path d="M31 50 L29.5 76 C33 79 36.5 78.5 38.5 76 L36 54 Z" fill={color} />
          <Path d="M69 50 L70.5 76 C67 79 63.5 78.5 61.5 76 L64 54 Z" fill={color} />
        </G>
      );
    case 6:
      return <Path d="M32 47 C30.5 28 38 20.5 50 20.5 C62 20.5 69.5 28 68 47 C66 38 64 34 62 32.5 C55 35 44 35 38 32.5 C35 36 33 41 32 47 Z" fill={color} />;
    case 7:
      return <Path d="M33 41 C33 31 40 27 50 27 C60 27 67 31 67 41 C64 35 58 33 50 33 C42 33 36 35 33 41 Z" fill={color} />;
    default:
      return null;
  }
}

function Top({ kind, color, skin }: { kind: number; color: string; skin: string }) {
  const dark = shade(color, 0.22);
  const body = 'M8 100 C9 88 20 79.5 37 77 Q50 85 63 77 C80 79.5 91 88 92 100 Z';
  switch (kind) {
    case 1:
      return (
        <G>
          <Path d="M8 100 C9 88 20 79.5 37 77 L50 91 L63 77 C80 79.5 91 88 92 100 Z" fill={color} />
          <Path d="M37 77 L50 91 L63 77" stroke={dark} strokeWidth={1.4} fill="none" strokeLinejoin="round" />
        </G>
      );
    case 2:
      return (
        <G>
          <Path d={body} fill={color} />
          <Path d="M33 77.5 C36 91 64 91 67 77.5 C61 84 39 84 33 77.5 Z" fill={dark} />
          <Path d="M45.5 86 L45 95 M54.5 86 L55 95" stroke={shade(color, -0.55)} strokeWidth={1.1} strokeLinecap="round" />
          <Path d="M20 100 L22 91 M80 100 L78 91" stroke={dark} strokeWidth={1} opacity={0.6} />
        </G>
      );
    case 3:
      return (
        <G>
          <Path d="M8 100 C9 88 20 79.5 37 77 Q50 80 63 77 C80 79.5 91 88 92 100 Z" fill={skin} />
          <Path d="M29 100 L31.5 80 C36 81 38 84 40 86 C44 88.5 56 88.5 60 86 C62 84 64 81 68.5 80 L71 100 Z" fill={color} />
        </G>
      );
    default:
      return (
        <G>
          <Path d={body} fill={color} />
          <Path d="M37 77 Q50 85 63 77" stroke={dark} strokeWidth={1.6} fill="none" />
        </G>
      );
  }
}

/**
 * A head-and-shoulders illustration drawn from an AvatarConfig. Fills its
 * size×size box; the parent clips it to a circle.
 */
export function Portrait({ config, size, dark }: { config: AvatarConfig; size: number; dark?: boolean }) {
  const skin = SKIN_TONES[config.skin] ?? SKIN_TONES[1];
  const skinShade = shade(skin, 0.14);
  const hair = HAIR_COLORS[config.hairColor] ?? HAIR_COLORS[1];
  const top = TOP_COLORS[config.topColor] ?? TOP_COLORS[0];
  const bg = (dark ? BG_DARK : BG_LIGHT)[config.bg] ?? BG_LIGHT[0];
  const scarf = config.hair === 10;
  const scarfColor = TOP_COLORS[(config.topColor + 4) % TOP_COLORS.length];
  const brow = config.hair === 8 || config.hairColor >= 4 ? shade(hair, 0.45) : shade(hair, 0.1);
  const ink = '#241B17';
  const lens = '#2A2522';

  return (
    <Svg width={size} height={size} viewBox="13 12 74 74">
      <Rect x={0} y={0} width={100} height={100} fill={bg} />
      {scarf ? (
        <Path d="M27 50 C25 26 36 15 50 15 C64 15 75 26 73 50 C72 64 66 74 58 78 L42 78 C34 74 28 64 27 50 Z" fill={scarfColor} />
      ) : (
        <HairBack style={config.hair} color={hair} />
      )}
      {/* neck */}
      <Rect x={43.5} y={54} width={13} height={28} rx={3} fill={skin} />
      <Path d="M43.5 58 Q50 64 56.5 58 L56.5 63 Q50 67.5 43.5 63 Z" fill={skinShade} />
      <Top kind={config.top} color={top} skin={skin} />
      {scarf && <Path d="M35 68 C39 80 61 80 65 68 L67 83 C59 90 41 90 33 83 Z" fill={scarfColor} />}
      {/* ears */}
      {!scarf && (
        <G>
          <Ellipse cx={33.2} cy={46} rx={3.3} ry={4.6} fill={skin} />
          <Ellipse cx={66.8} cy={46} rx={3.3} ry={4.6} fill={skin} />
          <Ellipse cx={33.6} cy={46.3} rx={1.4} ry={2.4} fill={skinShade} />
          <Ellipse cx={66.4} cy={46.3} rx={1.4} ry={2.4} fill={skinShade} />
        </G>
      )}
      <Path d={HEADS[config.face] ?? HEADS[0]} fill={skin} />
      {config.hair === 8 && <Ellipse cx={44} cy={29} rx={6} ry={2.6} fill="#fff" opacity={0.18} transform="rotate(-18 44 29)" />}
      {/* beard */}
      {config.beard === 1 && <Path d="M34 48 C35 58 42 64 50 64 C58 64 65 58 66 48 C63 54 58 56.5 50 57 C42 56.5 37 54 34 48 Z" fill={hair} opacity={0.28} />}
      {config.beard === 2 && (
        <Path d="M33.5 45.5 C33.5 60 42 67.5 50 67.5 C58 67.5 66.5 60 66.5 45.5 C64.5 52 61 54.5 57 54.5 C55 52.8 45 52.8 43 54.5 C39 54.5 35.5 52 33.5 45.5 Z" fill={hair} />
      )}
      {(config.beard === 3 || config.beard === 2) && (
        <Path d="M44 54.4 C46.5 52.2 49 52.8 50 53.6 C51 52.8 53.5 52.2 56 54.4 C53.5 55.4 51.5 55.2 50 54.6 C48.5 55.2 46.5 55.4 44 54.4 Z" fill={config.beard === 2 ? shade(hair, 0.2) : hair} />
      )}
      {/* face */}
      <Path d="M40 41.2 Q43.5 39.2 47 40.6" stroke={brow} strokeWidth={1.5} fill="none" strokeLinecap="round" />
      <Path d="M53 40.6 Q56.5 39.2 60 41.2" stroke={brow} strokeWidth={1.5} fill="none" strokeLinecap="round" />
      <Ellipse cx={43.5} cy={45.6} rx={1.8} ry={2.2} fill={ink} />
      <Ellipse cx={56.5} cy={45.6} rx={1.8} ry={2.2} fill={ink} />
      <Circle cx={44.1} cy={44.9} r={0.55} fill="#fff" />
      <Circle cx={57.1} cy={44.9} r={0.55} fill="#fff" />
      <Path d="M50.4 47.6 C49.2 50 48.7 51.3 50.8 51.7" stroke={shade(skin, 0.28)} strokeWidth={1.2} fill="none" strokeLinecap="round" />
      <Circle cx={40.2} cy={51.6} r={2.6} fill="#E0776B" opacity={0.16} />
      <Circle cx={59.8} cy={51.6} r={2.6} fill="#E0776B" opacity={0.16} />
      <Path d="M46 56.2 Q50 60.6 54 56.2 Q50 57.4 46 56.2 Z" fill="#7A3A30" stroke="#7A3A30" strokeWidth={0.8} strokeLinejoin="round" />
      {scarf ? (
        <G>
          <Path d="M31.5 45 C31 27 39 20.5 50 20.5 C61 20.5 69 27 68.5 45 C66.5 33 60 28 50 28 C40 28 33.5 33 31.5 45 Z" fill={scarfColor} />
          <Path d="M36 31 C42 26.5 58 26.5 64 31" stroke={shade(scarfColor, 0.2)} strokeWidth={0.9} fill="none" strokeLinecap="round" />
        </G>
      ) : (
        <HairFront style={config.hair} color={hair} />
      )}
      {config.glasses === 1 && (
        <G fill="none" stroke={lens} strokeWidth={1.3}>
          <Circle cx={43.5} cy={45.6} r={4.6} fill="#fff" fillOpacity={0.1} />
          <Circle cx={56.5} cy={45.6} r={4.6} fill="#fff" fillOpacity={0.1} />
          <Path d="M48.1 45 Q50 43.6 51.9 45 M38.9 44.8 L33.8 43.8 M61.1 44.8 L66.2 43.8" strokeLinecap="round" />
        </G>
      )}
      {config.glasses === 2 && (
        <G fill="none" stroke={lens} strokeWidth={1.4}>
          <Rect x={38.2} y={41.8} width={10.2} height={7.6} rx={2} fill="#fff" fillOpacity={0.1} />
          <Rect x={51.6} y={41.8} width={10.2} height={7.6} rx={2} fill="#fff" fillOpacity={0.1} />
          <Path d="M48.4 44.6 L51.6 44.6 M38.2 44.2 L33.8 43.4 M61.8 44.2 L66.2 43.4" strokeLinecap="round" />
        </G>
      )}
    </Svg>
  );
}

/** A portrait clipped to a circle, for places without a rank frame. */
export function PortraitCircle({ config, size, dark }: { config: AvatarConfig; size: number; dark?: boolean }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
      <Portrait config={config} size={size} dark={dark} />
    </View>
  );
}
