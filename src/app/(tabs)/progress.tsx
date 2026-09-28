import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, CountUp, IconTile, Screen, Segmented, T } from '@/components/ui';
import { FadeIn } from '@/components/motion';
import { BarChart, LineChart } from '@/components/Charts';
import { useStore } from '@/store/StoreProvider';
import { lastNDays, shortDate, todayKey, weekdayLetter, fromKey, addDays } from '@/lib/dates';
import { totalsByDate } from '@/lib/selectors';
import { waterValue, waterUnit, weightValue, weightUnit, formatWeight } from '@/lib/units';
import { DAILY_TIPS, tipForDate } from '@/lib/tips';
import { nutrientColors, spacing, useTheme } from '@/theme';

type Range = 'week' | 'month' | 'quarter';

export default function ProgressScreen() {
  const { state } = useStore();
  const { colors } = useTheme();
  const goals = state.goals!;
  const units = state.settings.units;
  const [range, setRange] = useState<Range>('week');
  const n = range === 'week' ? 7 : range === 'month' ? 30 : 90;
  const today = todayKey();
  const days = useMemo(() => lastNDays(today, n), [today, n]);
  const totals = useMemo(() => totalsByDate(state, days), [state, days]);

  const label = (d: string) => (n === 7 ? weekdayLetter(d) : String(fromKey(d).getDate()));
  const loggedDays = days.filter((d) => totals[d].calories > 0);
  const avg = (f: (d: string) => number, list = loggedDays) => (list.length ? list.reduce((s, d) => s + f(d), 0) / list.length : 0);
  const avgCal = avg((d) => totals[d].calories);
  const avgProtein = avg((d) => totals[d].protein);
  const onTarget = loggedDays.filter((d) => Math.abs(totals[d].calories - goals.calories) <= goals.calories * 0.1).length;
  const avgWater = avg((d) => state.water[d] ?? 0, days);
  const avgSteps = avg((d) => state.steps[d] ?? 0, days);

  const weightPoints = days.filter((d) => state.weights[d] !== undefined).map((d) => ({ label: shortDate(d), value: weightValue(state.weights[d], units) }));
  const weightChange = weightPoints.length >= 2 ? weightPoints[weightPoints.length - 1].value - weightPoints[0].value : null;

  // Group months into weekly bars so 30/90-day charts stay readable.
  const bars = (f: (d: string) => number) => {
    if (n <= 30) return days.map((d) => ({ label: label(d), value: f(d) }));
    const out: { label: string; value: number }[] = [];
    for (let i = 0; i < days.length; i += 7) {
      const wk = days.slice(i, i + 7);
      const logged = wk.filter((d) => f(d) > 0);
      out.push({ label: shortDate(wk[0]).split(' ')[1], value: logged.length ? logged.reduce((s, d) => s + f(d), 0) / logged.length : 0 });
    }
    return out;
  };

  const tips = [0, 1, 2].map((i) => tipForDate(addDays(today, i + 1)));

  return (
    <Screen topInset tabs>
      <T size={30} weight="800" style={{ marginBottom: spacing.lg }}>Progress</T>
      <Segmented
        value={range}
        onChange={setRange}
        options={[
          { key: 'week', label: '7 days' },
          { key: 'month', label: '30 days' },
          { key: 'quarter', label: '90 days' },
        ]}
        style={{ marginBottom: spacing.lg }}
      />

      <FadeIn style={{ flexDirection: 'row', gap: spacing.md }}>
        <Card style={{ flex: 1, gap: 8 }}>
          <IconTile icon="flame" color={nutrientColors.calories} size={34} />
          <CountUp key={range} value={Math.round(avgCal)} size={24} weight="800" />
          <T muted size={12}>avg kcal · goal {goals.calories.toLocaleString()}</T>
        </Card>
        <Card style={{ flex: 1, gap: 8 }}>
          <IconTile icon="checkmark-done" color={nutrientColors.protein} size={34} />
          <T size={24} weight="800">
            {onTarget}/{loggedDays.length}
          </T>
          <T muted size={12}>days within 10% of goal</T>
        </Card>
      </FadeIn>

      <Card>
        <T weight="700" style={{ marginBottom: spacing.sm }}>Calories {n > 30 ? '(weekly average)' : ''}</T>
        <BarChart key={range} data={bars((d) => totals[d].calories)} goal={goals.calories} color={nutrientColors.calories} />
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
          <T weight="700">Protein</T>
          <T muted size={13}>avg {Math.round(avgProtein)} g · goal 1 g/lb</T>
        </View>
        <BarChart key={range} data={bars((d) => totals[d].protein)} goal={goals.protein} color={nutrientColors.protein} height={130} />
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
          <T weight="700">Weight</T>
          {weightChange !== null && (
            <T size={13} weight="700" color={colors.primary}>
              {weightChange > 0 ? '+' : ''}
              {weightChange.toFixed(1)} {weightUnit(units)}
            </T>
          )}
        </View>
        <LineChart points={weightPoints} color={colors.primary} />
        {state.profile && (
          <T muted size={12} style={{ marginTop: 4 }}>Current: {formatWeight(state.profile.weightKg, units)}</T>
        )}
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
          <T weight="700">Water</T>
          <T muted size={13}>
            avg {Math.round(waterValue(avgWater, units))} {waterUnit(units)}
          </T>
        </View>
        <BarChart key={range} data={bars((d) => waterValue(state.water[d] ?? 0, units))} color={nutrientColors.water} height={120} />
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
          <T weight="700">Steps</T>
          <T muted size={13}>avg {Math.round(avgSteps).toLocaleString()}</T>
        </View>
        <BarChart key={range} data={bars((d) => state.steps[d] ?? 0)} goal={goals.steps} color={nutrientColors.steps} height={120} />
      </Card>

      <T size={18} weight="700" style={{ marginTop: spacing.sm, marginBottom: spacing.sm }}>Coming up</T>
      {tips.map((t) => (
        <Card key={t.title}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Ionicons name={t.kind === 'hydration' ? 'water' : t.kind === 'activity' ? 'walk' : 'bulb'} size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <T weight="700">{t.title}</T>
              <T muted size={14} style={{ marginTop: 2 }}>{t.body}</T>
            </View>
          </View>
        </Card>
      ))}
      <T muted size={12} center>{DAILY_TIPS.length} tips rotate daily on the Today screen.</T>
    </Screen>
  );
}
