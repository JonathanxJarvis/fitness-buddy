import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Card, Segmented, T } from '@/components/ui';
import { ProMark } from '@/components/ProMark';
import { useStore } from '@/store/StoreProvider';
import { addDays, shortDate } from '@/lib/dates';
import { REGION_LABEL } from '@/lib/exerciseInfo';
import { findExercise } from '@/lib/training';
import { E1RM_FORMULA, liftSummary, mainLifts, SET_TARGET, VOLUME_LABEL, weeklyBestE1rm, weeklyMuscleVolume, type MuscleVolume, type VolumeStatus } from '@/lib/stats';
import { weightUnit, weightValue } from '@/lib/units';
import { nutrientColors, radius, spacing, useTheme, type Colors } from '@/theme';
import { TrendChart } from './TrendChart';
import { ProPreview } from './ProPreview';

type Months = 3 | 6 | 12;

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <T size={11} weight="800" muted style={{ letterSpacing: 1, textTransform: 'uppercase' }}>
    {children}
  </T>
);

/** Section header for Strength on the Progress screen. */
export function StrengthHeader() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md, marginBottom: spacing.sm }}>
      <T size={18} weight="800">Strength</T>
      <ProMark size={11} />
    </View>
  );
}

/** Estimated 1RM trend for one lift at a time, plus the top-lifts list. */
export function StrengthCards({ today }: { today: string }) {
  const { state } = useStore();
  const { colors } = useTheme();
  const units = state.settings.units;
  const unit = weightUnit(units);
  const [months, setMonths] = useState<Months>(3);
  const lifts = useMemo(() => mainLifts(state.workouts, addDays(today, -365)), [state.workouts, today]);
  const [picked, setPicked] = useState<string | undefined>();
  const lift = picked && lifts.includes(picked) ? picked : lifts[0];
  const from = addDays(today, -Math.round(months * 30.44));
  const series = useMemo(() => (lift ? weeklyBestE1rm(lift, state.workouts, from, today) : []), [lift, state.workouts, from, today]);
  const summaries = useMemo(() => lifts.map((id) => liftSummary(id, state.workouts, today)).filter((s) => !!s), [lifts, state.workouts, today]);
  const name = (id: string) => findExercise(id, state.customExercises)?.name ?? id;
  const v = (kg: number) => weightValue(kg, units);
  const fmt = (kg: number) => `${Math.round(v(kg))}`;

  if (!lifts.length) {
    return (
      <Card>
        <T weight="700">Estimated 1-rep max</T>
        <T muted size={14} style={{ marginTop: 4 }}>
          Log a weighted lift in two workouts (sets of 1–12 reps) and its strength trend shows up here.
        </T>
      </Card>
    );
  }

  const sum = summaries.find((s) => s.exerciseId === lift);
  const first = series[0];
  const lastPt = series[series.length - 1];
  const rangeChange = first && lastPt && series.length > 1 ? v(lastPt.e1rm) - v(first.e1rm) : undefined;

  return (
    <>
      <Card>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.lg, marginTop: -4 }} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 6 }}>
          {lifts.map((id) => {
            const on = id === lift;
            return (
              <Pressable
                key={id}
                onPress={() => setPicked(id)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={{ paddingVertical: 7, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: on ? colors.text : colors.cardAlt }}
              >
                <T size={13} weight={on ? '700' : '600'} color={on ? colors.card : colors.text}>{name(id)}</T>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: spacing.lg }}>
          <View>
            <Eyebrow>Estimated 1RM</Eyebrow>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
              <T size={32} weight="800">{sum ? fmt(sum.current) : '–'}</T>
              <T size={15} weight="700" muted>{unit}</T>
            </View>
          </View>
          {rangeChange !== undefined && (
            <View style={{ alignItems: 'flex-end' }}>
              <T size={15} weight="800" color={rangeChange > 0 ? colors.success : rangeChange < 0 ? colors.warning : colors.textMuted}>
                {rangeChange > 0 ? '+' : ''}
                {rangeChange.toFixed(Math.abs(rangeChange) < 10 ? 1 : 0)} {unit}
              </T>
              <T size={12} muted>over {months} months</T>
            </View>
          )}
        </View>

        <View style={{ marginTop: spacing.sm }}>
          {series.length ? (
            <TrendChart key={`${lift}-${months}`} points={series.map((p) => ({ date: p.week, value: v(p.e1rm) }))} from={from} to={today} color={nutrientColors.protein} />
          ) : (
            <T muted center style={{ paddingVertical: 40 }}>No {name(lift!).toLowerCase()} in the last {months} months.</T>
          )}
        </View>

        <Segmented
          value={String(months) as '3' | '6' | '12'}
          onChange={(k) => setMonths(Number(k) as Months)}
          options={[
            { key: '3', label: '3 months' },
            { key: '6', label: '6 months' },
            { key: '12', label: '12 months' },
          ]}
          style={{ marginTop: spacing.md }}
        />
        <T size={11} muted style={{ marginTop: spacing.sm }}>
          Best estimated 1-rep max each week ({E1RM_FORMULA}: weight × (1 + reps ÷ 30), sets of 1–12 reps).
        </T>
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
          <T weight="700">Top lifts</T>
          <T size={12} muted>e1RM · vs 4 weeks ago</T>
        </View>
        {summaries.map((s, i) => {
          const ch = s.change !== undefined ? v(s.change) : undefined;
          const c = ch === undefined || Math.abs(ch) < 0.5 ? colors.textMuted : ch > 0 ? colors.success : colors.warning;
          return (
            <Pressable
              key={s.exerciseId}
              onPress={() => setPicked(s.exerciseId)}
              accessibilityRole="button"
              accessibilityLabel={`${name(s.exerciseId)}, ${fmt(s.current)} ${unit}`}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 11, gap: 10, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}
            >
              <View style={{ width: 22, alignItems: 'center' }}>
                <T size={13} weight="800" muted>{i + 1}</T>
              </View>
              <View style={{ flex: 1 }}>
                <T weight="700" numberOfLines={1}>{name(s.exerciseId)}</T>
                <T size={12} muted numberOfLines={1}>
                  {s.best > s.current + 0.01 ? `Best ${fmt(s.best)} ${unit} · ` : 'At your best · '}last {shortDate(s.lastDate)}
                </T>
              </View>
              <View style={{ alignItems: 'flex-end', minWidth: 76 }}>
                <T weight="800">
                  {fmt(s.current)} <T size={12} weight="600" muted>{unit}</T>
                </T>
                <T size={12} weight="700" color={c}>
                  {ch === undefined ? 'new' : Math.abs(ch) < 0.5 ? 'same' : `${ch > 0 ? '▲' : '▼'} ${Math.abs(ch).toFixed(Math.abs(ch) < 10 ? 1 : 0)} ${unit}`}
                </T>
              </View>
            </Pressable>
          );
        })}
      </Card>
    </>
  );
}

const statusColor = (colors: Colors, s: VolumeStatus) => (s === 'in' ? colors.success : s === 'under' ? colors.warning : colors.info);

/** Weekly sets per muscle over the last 8 full weeks, against a 10–20 set band. */
export function MuscleVolumeCard({ today }: { today: string }) {
  const { state } = useStore();
  const { colors } = useTheme();
  const vol = useMemo(() => weeklyMuscleVolume(state.workouts, today, 8, state.customExercises), [state.workouts, state.customExercises, today]);
  const [all, setAll] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const counts = { under: 0, in: 0, over: 0 } as Record<VolumeStatus, number>;
  for (const m of vol.muscles) counts[m.status]++;
  const shown = all ? vol.muscles : vol.muscles.slice(0, 8);
  const scaleMax = Math.max(25, ...vol.muscles.map((m) => Math.ceil(m.average)));

  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <T weight="700">Weekly sets per muscle</T>
        <T size={12} muted>{vol.weeksCounted < 8 ? `avg of ${vol.weeksCounted} wk` : 'last 8 weeks'}</T>
      </View>
      <T size={12} muted style={{ marginTop: 2 }}>
        Target {SET_TARGET.low}–{SET_TARGET.high} sets a week. Main muscles count a full set, helpers half.
      </T>

      {vol.muscles.length === 0 ? (
        <T muted style={{ paddingVertical: spacing.lg }} center>Finish a workout to see sets per muscle.</T>
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: spacing.md, marginBottom: spacing.xs }}>
            {(['in', 'under', 'over'] as const).map((s) => (
              <View key={s} style={{ flex: 1, paddingVertical: 8, borderRadius: radius.md, backgroundColor: statusColor(colors, s) + '14', alignItems: 'center' }}>
                <T size={18} weight="800" color={statusColor(colors, s)}>{counts[s]}</T>
                <T size={11} weight="700" color={statusColor(colors, s)}>{VOLUME_LABEL[s]}</T>
              </View>
            ))}
          </View>
          {shown.map((m) => (
            <VolumeRow key={m.region} m={m} scaleMax={scaleMax} open={open === m.region} onPress={() => setOpen(open === m.region ? null : m.region)} weeks={vol.weeks} />
          ))}
          {vol.muscles.length > 8 && (
            <Pressable onPress={() => setAll(!all)} accessibilityRole="button" style={{ paddingTop: spacing.md, alignItems: 'center' }}>
              <T size={13} weight="700" color={colors.primary}>{all ? 'Show fewer' : `Show all ${vol.muscles.length}`}</T>
            </Pressable>
          )}
          {vol.untrained.length > 0 && (
            <T size={12} muted style={{ marginTop: spacing.md }}>
              No sets in 8 weeks: {vol.untrained.map((r) => REGION_LABEL[r]).join(', ')}.
            </T>
          )}
        </>
      )}
    </Card>
  );
}

function VolumeRow({ m, scaleMax, open, onPress, weeks }: { m: MuscleVolume; scaleMax: number; open: boolean; onPress: () => void; weeks: string[] }) {
  const { colors } = useTheme();
  const c = statusColor(colors, m.status);
  const pct = (n: number) => `${Math.min(100, (n / scaleMax) * 100)}%` as const;
  const avg = m.average % 1 ? m.average.toFixed(1) : String(m.average);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${REGION_LABEL[m.region]}: ${avg} sets a week, ${VOLUME_LABEL[m.status].toLowerCase()}`}
      accessibilityState={{ expanded: open }}
      style={{ paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.border }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <T size={13} weight="600" style={{ width: 84 }} numberOfLines={1}>{REGION_LABEL[m.region]}</T>
        <View style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.track, overflow: 'hidden' }}>
          {/* the 10–20 target band */}
          <View style={{ position: 'absolute', top: 0, bottom: 0, left: pct(SET_TARGET.low), width: pct(SET_TARGET.high - SET_TARGET.low), backgroundColor: colors.success + '26' }} />
          <View style={{ width: pct(m.average), height: 10, borderRadius: 5, backgroundColor: c }} />
        </View>
        <T size={13} weight="800" style={{ width: 32, textAlign: 'right' }}>{avg}</T>
        <T size={11} weight="700" color={c} style={{ width: 52 }}>{VOLUME_LABEL[m.status]}</T>
      </View>
      {open && (
        <View style={{ marginTop: 10, marginLeft: 94 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 44, gap: 4 }}>
            {m.perWeek.map((n, i) => (
              <View key={i} style={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}>
                <View style={{ height: `${Math.max(4, Math.min(100, (n / scaleMax) * 100))}%`, borderRadius: 3, backgroundColor: n ? statusColor(colors, n < SET_TARGET.low ? 'under' : n > SET_TARGET.high ? 'over' : 'in') : colors.track }} />
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <T size={10} muted>{shortDate(weeks[0])}</T>
            <T size={10} muted>This week so far: {m.thisWeek % 1 ? m.thisWeek.toFixed(1) : m.thisWeek}</T>
          </View>
        </View>
      )}
    </Pressable>
  );
}

/** A static sample for the free preview: shapes only, no numbers of yours. */
export function StrengthPreview() {
  const { colors } = useTheme();
  const today = '2026-09-28';
  const pts = [100, 101, 103, 102.5, 105, 106, 108, 107.5, 110, 112, 111.5, 114].map((value, i) => ({ date: addDays(today, -7 * (11 - i)), value }));
  return (
    <Card>
      <ProPreview feature="stats" title="Deep stats" body="Estimated 1-rep max per lift, weekly volume per muscle, and strength trends over months.">
        <View>
          <Eyebrow>Estimated 1RM · Bench press</Eyebrow>
          <T size={32} weight="800" style={{ marginTop: 2 }}>114 <T size={15} muted weight="700">kg</T></T>
          <TrendChart points={pts} from={addDays(today, -84)} to={today} color={nutrientColors.protein} height={130} />
          {['Chest', 'Back', 'Quads'].map((r, i) => (
            <View key={r} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}>
              <T size={13} style={{ width: 60 }}>{r}</T>
              <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.track }}>
                <View style={{ width: `${[62, 48, 30][i]}%`, height: 8, borderRadius: 4, backgroundColor: [colors.success, colors.success, colors.warning][i] }} />
              </View>
            </View>
          ))}
        </View>
      </ProPreview>
    </Card>
  );
}
