import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, T } from '@/components/ui';
import { ProMark } from '@/components/ProMark';
import { useStore } from '@/store/StoreProvider';
import { personalAdvice, type Advice, type AdviceTone } from '@/lib/advice';
import { addDays, lastNDays } from '@/lib/dates';
import { totalsByDate } from '@/lib/selectors';
import { spacing, useTheme, type Colors } from '@/theme';

const toneColor = (c: Colors, t: AdviceTone) => (t === 'good' ? c.success : t === 'warn' ? c.warning : c.primary);

function go(kind: NonNullable<Advice['action']>['kind']) {
  if (kind === 'train') router.navigate('/train');
  else if (kind === 'food') router.push('/add-food');
  else router.push('/recovery' as never);
}

function AdviceRow({ a, first, locked }: { a: Advice; first: boolean; locked?: boolean }) {
  const { colors } = useTheme();
  const c = toneColor(colors, a.tone);
  return (
    <View style={{ flexDirection: 'row', gap: 12, paddingVertical: 12, borderTopWidth: first ? 0 : 1, borderTopColor: colors.border, opacity: locked ? 0.35 : 1 }}>
      <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: c + '1F', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={a.icon as never} size={18} color={c} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T weight="800">{a.title}</T>
        <T size={13} muted style={{ marginTop: 2, lineHeight: 18 }}>{a.body}</T>
        {a.action && !locked ? (
          <Pressable onPress={() => go(a.action!.kind)} accessibilityRole="button" hitSlop={6} style={{ alignSelf: 'flex-start', marginTop: 6 }}>
            <T size={13} weight="800" color={c}>{a.action.label}</T>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** Tips made from your own numbers. Free users see the first one; Pro sees them all. */
export function AdviceSection({ today, pro }: { today: string; pro: boolean }) {
  const { state } = useStore();
  const { colors } = useTheme();
  const advice = useMemo(() => {
    const days = lastNDays(addDays(today, -1), 7);
    const totals = totalsByDate(state, days);
    const proteinByDay = Object.fromEntries(days.map((d) => [d, totals[d].protein]));
    return personalAdvice({ ...state, proteinByDay }, today);
  }, [state, today]);
  const shown = pro ? advice : advice.slice(0, 1);
  const hidden = pro ? 0 : advice.length - 1;

  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md, marginBottom: spacing.sm }}>
        <T size={18} weight="800">Advice for you</T>
      </View>
      <Card style={{ paddingVertical: spacing.xs }}>
        {shown.map((a, i) => (
          <AdviceRow key={a.id} a={a} first={i === 0} />
        ))}
        {hidden > 0 ? (
          <Pressable
            onPress={() => router.push({ pathname: '/pro', params: { feature: 'stats' } })}
            accessibilityRole="button"
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border, opacity: pressed ? 0.6 : 1 })}
          >
            <ProMark size={12} />
            <T weight="700" style={{ flex: 1 }}>{hidden} more tip{hidden === 1 ? '' : 's'} with Pro</T>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </Card>
    </>
  );
}
