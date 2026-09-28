import React from 'react';
import { Circle, Ellipse, G, Path } from 'react-native-svg';
import type { Face, Pt } from './bodies';

export type Mood = 'happy' | 'pumped' | 'proud' | 'hungry' | 'sleepy' | 'wink';

const PUPIL = '#15171C';

/** Eyes, brows, mouth and cheeks. `look` shifts the pupils left or right. */
export function FaceView({ mood, blink, look = 0, face }: { mood: Mood; blink: boolean; look?: number; face: Face }) {
  const { ink, line, ring, lid } = face;
  const dy = face.dy ?? 0;
  const lx = look;

  const arc = (cx: number, up = false) => (
    <Path d={up ? `M${cx - 5} 66.5 Q${cx} 60.5 ${cx + 5} 66.5` : `M${cx - 5} 65.5 Q${cx} 69.5 ${cx + 5} 65.5`} stroke={line} strokeWidth={2.4} strokeLinecap="round" fill="none" />
  );

  const eye = (cx: number, opts: { big?: boolean; lidTo?: number } = {}) => {
    const pr = opts.big ? 3.9 : 3.3;
    const py = mood === 'sleepy' ? 67 : 65.6;
    return (
      <G>
        <Ellipse cx={cx} cy={65} rx={5.5} ry={6.3} fill="#FFFFFF" stroke={ring ?? '#000000'} strokeOpacity={ring ? 1 : 0.18} strokeWidth={ring ? 1.3 : 0.8} />
        <Ellipse cx={cx + lx} cy={py} rx={pr} ry={pr * 1.1} fill={PUPIL} />
        <Circle cx={cx + lx + 1.4} cy={py - 1.8} r={opts.big ? 1.6 : 1.3} fill="#FFFFFF" />
        <Circle cx={cx + lx - 1.1} cy={py + 1.4} r={0.6} fill="#FFFFFF" />
        {opts.lidTo !== undefined && (
          <G>
            <Path d={`M${cx - 5.9} ${opts.lidTo} L${cx - 5.9} 58 L${cx + 5.9} 58 L${cx + 5.9} ${opts.lidTo} Z`} fill={lid} />
            <Path d={`M${cx - 5.6} ${opts.lidTo} Q${cx} ${opts.lidTo + 1.2} ${cx + 5.6} ${opts.lidTo}`} stroke={line} strokeWidth={1.6} strokeLinecap="round" fill="none" />
          </G>
        )}
      </G>
    );
  };

  let eyes: React.ReactNode;
  if (blink) eyes = <G>{arc(40)}{arc(60)}</G>;
  else if (mood === 'proud') eyes = <G>{arc(40, true)}{arc(60, true)}</G>;
  else if (mood === 'wink') eyes = <G>{eye(40)}{arc(60, true)}</G>;
  else if (mood === 'sleepy') eyes = <G>{eye(40, { lidTo: 65 })}{eye(60, { lidTo: 65 })}</G>;
  else eyes = <G>{eye(40, { big: mood === 'hungry' })}{eye(60, { big: mood === 'hungry' })}</G>;

  let brows: React.ReactNode = null;
  if (mood === 'pumped') brows = <G><Path d="M35 56 Q40 55.4 45.5 57.6" stroke={ink} strokeWidth={2.5} strokeLinecap="round" fill="none" /><Path d="M65 56 Q60 55.4 54.5 57.6" stroke={ink} strokeWidth={2.5} strokeLinecap="round" fill="none" /></G>;
  else if (mood === 'hungry') brows = <G><Path d="M35 57.5 L45 55" stroke={ink} strokeWidth={2.2} strokeLinecap="round" /><Path d="M65 57.5 L55 55" stroke={ink} strokeWidth={2.2} strokeLinecap="round" /></G>;
  else if (mood === 'proud' || mood === 'wink') brows = <G><Path d="M35 57 Q40 54.5 45 56" stroke={ink} strokeWidth={2} strokeLinecap="round" fill="none" /><Path d="M55 56 Q60 54.5 65 57" stroke={ink} strokeWidth={2} strokeLinecap="round" fill="none" /></G>;

  let mouth: React.ReactNode;
  switch (mood) {
    case 'pumped':
      mouth = (
        <G>
          <Path d="M43 74.5 Q50 76.5 57 74.5 Q56.5 83.5 50 83.5 Q43.5 83.5 43 74.5 Z" fill={ink} />
          <Path d="M46 80.6 Q50 78.6 54 80.6 Q53 83.2 50 83.2 Q47 83.2 46 80.6 Z" fill="#FF7A8A" />
        </G>
      );
      break;
    case 'proud':
      mouth = (
        <G>
          <Path d="M41.5 74 Q50 77.5 58.5 74 Q57.5 83 50 83 Q42.5 83 41.5 74 Z" fill={ink} />
          <Path d="M43 75 Q50 78 57 75 L56.4 77.2 Q50 79.6 43.6 77.2 Z" fill="#FFFFFF" />
        </G>
      );
      break;
    case 'hungry':
      mouth = (
        <G>
          <Ellipse cx={50} cy={78} rx={3} ry={3.6} fill={ink} />
          <Path d="M53.5 80 Q55 83.5 53.8 86" stroke="#8FD3F5" strokeWidth={1.6} strokeLinecap="round" fill="none" />
        </G>
      );
      break;
    case 'sleepy':
      mouth = <Path d="M45 78 Q47.5 76.5 50 78 Q52.5 79.5 55 78" stroke={ink} strokeWidth={2.2} strokeLinecap="round" fill="none" />;
      break;
    case 'wink':
      mouth = <Path d="M44 76 Q51 80.5 57 74.5" stroke={ink} strokeWidth={2.4} strokeLinecap="round" fill="none" />;
      break;
    default:
      mouth = (
        <G>
          <Path d="M44 75.5 Q50 82 56 75.5 Q50 78 44 75.5 Z" fill={ink} />
          <Path d="M44 75.5 Q50 82 56 75.5" stroke={ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </G>
      );
  }

  return (
    <G transform={dy ? `translate(0 ${dy})` : undefined}>
      <Ellipse cx={31.5} cy={73.5} rx={4.4} ry={2.8} fill="#FF8FA3" opacity={mood === 'sleepy' ? 0.25 : 0.5} />
      <Ellipse cx={68.5} cy={73.5} rx={4.4} ry={2.8} fill="#FF8FA3" opacity={mood === 'sleepy' ? 0.25 : 0.5} />
      {eyes}
      {brows}
      {mouth}
    </G>
  );
}

export type Pose = 'flex' | 'wave' | 'belly' | 'hang';

export const poseFor = (mood: Mood): Pose => (mood === 'pumped' || mood === 'proud' ? 'flex' : mood === 'hungry' ? 'belly' : mood === 'sleepy' ? 'hang' : 'wave');

/** Arm strokes and hand positions for a pose. */
export function armGeometry(pose: Pose, [lx, ly]: Pt, [rx, ry]: Pt): { d: [string, string]; hands: [Pt, Pt] } {
  switch (pose) {
    case 'flex':
      return {
        d: [`M${lx} ${ly} Q${lx - 13} ${ly - 7} ${lx - 8} ${ly - 21}`, `M${rx} ${ry} Q${rx + 13} ${ry - 7} ${rx + 8} ${ry - 21}`],
        hands: [
          [lx - 8, ly - 23],
          [rx + 8, ry - 23],
        ],
      };
    case 'belly':
      return {
        d: [`M${lx} ${ly + 2} Q${lx - 6} ${ly + 14} ${lx + 5} ${ly + 19}`, `M${rx} ${ry + 2} Q${rx + 6} ${ry + 14} ${rx - 5} ${ry + 19}`],
        hands: [
          [lx + 6, ly + 19],
          [rx - 6, ry + 19],
        ],
      };
    case 'hang':
      return {
        d: [`M${lx + 1} ${ly + 3} Q${lx - 5} ${ly + 12} ${lx - 4} ${ly + 21}`, `M${rx - 1} ${ry + 3} Q${rx + 5} ${ry + 12} ${rx + 4} ${ry + 21}`],
        hands: [
          [lx - 4, ly + 22],
          [rx + 4, ry + 22],
        ],
      };
    default:
      return {
        d: [`M${lx + 1} ${ly + 4} Q${lx - 8} ${ly + 10} ${lx - 6} ${ly + 18}`, `M${rx - 1} ${ry + 4} Q${rx + 9} ${ry - 2} ${rx + 10} ${ry - 12}`],
        hands: [
          [lx - 6, ly + 19],
          [rx + 10, ry - 14],
        ],
      };
  }
}

export function Arms({ pose, l, r, color, line }: { pose: Pose; l: Pt; r: Pt; color: string; line: string }) {
  const g = armGeometry(pose, l, r);
  return (
    <G>
      {g.d.map((d, i) => (
        <G key={i}>
          <Path d={d} stroke={line} strokeWidth={9} strokeLinecap="round" fill="none" />
          <Path d={d} stroke={color} strokeWidth={6.2} strokeLinecap="round" fill="none" />
        </G>
      ))}
      {g.hands.map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={5.4} fill={color} stroke={line} strokeWidth={1.5} />
      ))}
    </G>
  );
}
