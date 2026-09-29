import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { PressScale } from '@/components/motion';
import { Chip, Segmented, T } from '@/components/ui';
import { ACCENT_KEYS, ACCENTS, lookSample, radius, spacing, themeColors, useTheme } from '@/theme';
import { minutesLabel, SESSION_MINUTES, TRAINING_GOALS, TRAINING_PLACES } from '@/lib/trainingPrefs';
import type { AccentKey, LookPref, TrainingPrefs } from '@/lib/types';

const tap = () => Haptics.selectionAsync().catch(() => {});

/** A tiny Today card drawn in a given look, so the choice shows what you get. */
function LookPreview({ look, accent }: { look: LookPref; accent: AccentKey }) {
  const { dark } = useTheme();
  const c = themeColors(dark, look, accent);
  const { nutrients: n, session } = lookSample(look, accent);
  const bars: [string, number][] = [
    [n.protein, 0.7],
    [n.carbs, 0.5],
    [n.fat, 0.35],
  ];
  return (
    <View style={{ backgroundColor: c.background, borderRadius: radius.md, padding: 8, gap: 6 }}>
      <View style={{ backgroundColor: c.card, borderRadius: 10, padding: 8, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 3, borderColor: n.calories, borderRightColor: c.track }} />
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ height: 5, width: '70%', borderRadius: 3, backgroundColor: c.text, opacity: 0.8 }} />
            <View style={{ height: 4, width: '45%', borderRadius: 2, backgroundColor: c.textMuted, opacity: 0.6 }} />
          </View>
        </View>
        {bars.map(([color, v], i) => (
          <View key={i} style={{ height: 4, borderRadius: 2, backgroundColor: c.track }}>
            <View style={{ height: 4, width: `${v * 100}%`, borderRadius: 2, backgroundColor: color }} />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <View style={{ flex: 1, height: 16, borderRadius: 8, backgroundColor: session }} />
        <View style={{ flex: 1, height: 16, borderRadius: 8, backgroundColor: c.primary }} />
      </View>
    </View>
  );
}

const LOOKS: { key: LookPref; label: string; hint: string }[] = [
  { key: 'colorful', label: 'Colorful', hint: 'Lively, color-coded' },
  { key: 'simple', label: 'Simple', hint: 'Calm, one accent' },
];

/** Colorful or Simple as two tappable previews. */
export function LookChoice({ look, accent, onChange }: { look: LookPref; accent: AccentKey; onChange: (l: LookPref) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: spacing.md }}>
      {LOOKS.map((l) => {
        const on = look === l.key;
        return (
          <PressScale
            key={l.key}
            onPress={() => {
              tap();
              onChange(l.key);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${l.label}. ${l.hint}`}
            scaleTo={0.97}
            style={{
              flex: 1,
              padding: spacing.sm,
              borderRadius: radius.lg,
              borderWidth: 1.5,
              borderColor: on ? colors.primary : colors.border,
              backgroundColor: colors.card,
            }}
          >
            <LookPreview look={l.key} accent={accent} />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, paddingHorizontal: 2 }}>
              <View style={{ flex: 1 }}>
                <T weight="700" size={14.5}>{l.label}</T>
                <T muted size={12}>{l.hint}</T>
              </View>
              {on && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
            </View>
          </PressScale>
        );
      })}
    </View>
  );
}

/** Accent color swatches. */
export function AccentChoice({ accent, onChange }: { accent: AccentKey; onChange: (a: AccentKey) => void }) {
  const { colors, dark } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
      {ACCENT_KEYS.map((k) => {
        const on = accent === k;
        const swatch = ACCENTS[k][dark ? 'dark' : 'light'].primary;
        return (
          <PressScale
            key={k}
            onPress={() => {
              tap();
              onChange(k);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={ACCENTS[k].label}
            scaleTo={0.9}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              borderWidth: 2,
              borderColor: on ? colors.text : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: swatch }} />
          </PressScale>
        );
      })}
      <T muted size={13} style={{ flex: 1, textAlign: 'right' }}>{ACCENTS[accent].label}</T>
    </View>
  );
}

type Part = 'goal' | 'place' | 'minutes';

/** Training goal, place and session length as compact chip rows. */
export function TrainingChoice({
  value,
  onChange,
  parts = ['goal', 'place', 'minutes'],
}: {
  value: TrainingPrefs;
  onChange: (next: TrainingPrefs, changed: Part) => void;
  parts?: Part[];
}) {
  const label = (text: string, first: boolean) => (
    <T muted size={13} weight="600" style={{ marginBottom: 6, marginTop: first ? 0 : spacing.md }}>{text}</T>
  );
  return (
    <View>
      {parts.map((part, i) => {
        if (part === 'goal')
          return (
            <View key={part}>
              {label('Training goal', i === 0)}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {TRAINING_GOALS.map((g) => (
                  <Chip key={g.key} label={g.label} active={value.goal === g.key} onPress={() => onChange({ ...value, goal: g.key }, 'goal')} />
                ))}
              </View>
            </View>
          );
        if (part === 'place')
          return (
            <View key={part}>
              {label('Where you train', i === 0)}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {TRAINING_PLACES.map((p) => (
                  <Chip key={p.key} label={p.label} active={value.place === p.key} onPress={() => onChange({ ...value, place: p.key }, 'place')} />
                ))}
              </View>
            </View>
          );
        return (
          <View key={part}>
            {label('Session length (min)', i === 0)}
            <Segmented
              value={value.minutes ? String(value.minutes) : ''}
              onChange={(m) => onChange({ ...value, minutes: Number(m) }, 'minutes')}
              options={SESSION_MINUTES.map((m) => ({ key: String(m), label: minutesLabel(m) }))}
            />
          </View>
        );
      })}
    </View>
  );
}
