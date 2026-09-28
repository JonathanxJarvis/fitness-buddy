import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, IconButton, ProgressBar, Sheet, T } from '@/components/ui';
import { FadeIn } from '@/components/motion';
import { RankBadge } from '@/components/RankBadge';
import { Avatar } from '@/components/Avatar';
import { LineChart } from '@/components/Charts';
import { useStore } from '@/store/StoreProvider';
import { levelsGained, makeSnapshot, removeFriend, scoreGained } from '@/lib/social';
import { STAGES } from '@/lib/progression';
import { addDays, shortDate, todayKey } from '@/lib/dates';
import { radius, spacing, useTheme } from '@/theme';

export default function FriendScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, dispatch } = useStore();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [confirm, setConfirm] = useState(false);
  const f = state.social?.friends.find((x) => x.id === id);
  const mine = useMemo(() => makeSnapshot(state), [state]);

  if (!f) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: spacing.lg }}>
        <T muted>This friend isn’t in your crew anymore.</T>
        <Button title="Back" variant="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  const stage = STAGES[f.stage] ?? STAGES[0];
  const today = todayKey();
  const points = f.history.map((score, i) => ({ label: shortDate(addDays(today, -7 * (7 - i))), value: score }));
  const vs: { label: string; them: number; you: number; fmt?: (n: number) => string }[] = mine
    ? [
        { label: 'Rank points', them: f.score, you: mine.score, fmt: (n) => `${Math.round(n)}` },
        ...(f.parts && mine.parts
          ? [
              { label: 'Strength', them: f.parts.strength, you: mine.parts.strength, fmt: (n: number) => `${Math.round(n)}` },
              { label: 'Consistency', them: f.parts.consistency, you: mine.parts.consistency, fmt: (n: number) => `${Math.round(n)}` },
            ]
          : []),
        { label: 'Level', them: f.level, you: mine.level },
        { label: 'Growth (8 wks)', them: scoreGained(f), you: scoreGained(mine), fmt: (n) => `+${n}` },
        { label: 'Workouts this week', them: f.weekWorkouts, you: mine.weekWorkouts },
      ]
    : [];

  const remove = async () => {
    setConfirm(false);
    const me = state.social?.me;
    if (me) await removeFriend(me, f.id).catch(() => {});
    dispatch({ type: 'removeFriend', id: f.id });
    router.back();
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={[stage.tier.color, colors.background]} style={{ paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <IconButton label="Back" icon="chevron-back" color="#fff" onPress={() => router.back()} />
          <IconButton label="Remove friend" icon="ellipsis-horizontal" color="#fff" onPress={() => setConfirm(true)} />
        </View>
        <FadeIn style={{ alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <Avatar stage={f.stage} pet={f.pet} skin={f.skin} size={128} mood="pumped" animate />
            <View style={{ marginLeft: -26, marginBottom: 0 }}>
              <RankBadge stage={stage} size={50} />
            </View>
          </View>
          <T size={26} weight="800" style={{ marginTop: spacing.sm }}>{f.name}</T>
          <T size={14} weight="700" color={colors.textMuted}>
            {stage.label} · Level {f.level}{f.streak ? ` · 🔥 ${f.streak}-day streak` : ''}
          </T>
          {f.petName ? <T size={12} muted>with {f.petName}</T> : null}
        </FadeIn>
      </LinearGradient>

      <View style={{ paddingHorizontal: spacing.lg }}>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
          {[
            { v: `+${scoreGained(f)}`, l: 'pts in 8 wks' },
            { v: `+${levelsGained(f)}`, l: 'levels in 8 wks' },
            { v: `${f.totalWorkouts}`, l: 'workouts' },
          ].map((s) => (
            <View key={s.l} style={{ flex: 1, backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
              <T size={20} weight="800" color={colors.primary}>{s.v}</T>
              <T size={11} muted center>{s.l}</T>
            </View>
          ))}
        </View>

        <Card>
          <T weight="800" style={{ marginBottom: spacing.sm }}>How fast {f.name} is growing</T>
          <LineChart points={points} color={stage.tier.color} height={150} format={(n) => `${Math.round(n)}`} />
        </Card>

        {vs.length > 0 && (
          <Card>
            <T weight="800" style={{ marginBottom: spacing.sm }}>Head to head</T>
            {vs.map((row) => {
              const max = Math.max(row.them, row.you, 1);
              const fmt = row.fmt ?? ((n: number) => `${n}`);
              return (
                <View key={row.label} style={{ marginBottom: spacing.md }}>
                  <T size={12} weight="700" muted style={{ marginBottom: 4 }}>{row.label}</T>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <T size={12} weight="700" style={{ width: 52 }} numberOfLines={1}>You</T>
                    <View style={{ flex: 1 }}>
                      <ProgressBar value={row.you} max={max} color={colors.primary} />
                    </View>
                    <T size={12} weight="800" style={{ width: 36, textAlign: 'right' }}>{fmt(row.you)}</T>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <T size={12} weight="700" style={{ width: 52 }} numberOfLines={1}>{f.name}</T>
                    <View style={{ flex: 1 }}>
                      <ProgressBar value={row.them} max={max} color={stage.tier.color} />
                    </View>
                    <T size={12} weight="800" style={{ width: 36, textAlign: 'right' }}>{fmt(row.them)}</T>
                  </View>
                </View>
              );
            })}
          </Card>
        )}

        {f.lastWorkout && (
          <Card>
            <T size={12} weight="700" muted>LAST WORKOUT</T>
            <T weight="800" size={16} style={{ marginTop: 2 }}>{f.lastWorkout.name}</T>
            <T size={13} muted>
              {shortDate(f.lastWorkout.date)} · {f.lastWorkout.sets} sets
            </T>
          </Card>
        )}

        <Button title={`Message ${f.name}`} icon="chatbubble-ellipses" onPress={() => router.push(`/chat/${f.id}`)} />
      </View>

      <Sheet visible={confirm} onClose={() => setConfirm(false)} title={`Remove ${f.name}?`}>
        <T muted style={{ marginBottom: spacing.lg }}>You’ll stop seeing each other’s progress and your chat is deleted from this phone.</T>
        <Button title="Remove from crew" variant="danger" onPress={remove} />
        <Button title="Cancel" variant="ghost" style={{ marginTop: spacing.sm }} onPress={() => setConfirm(false)} />
      </Sheet>
    </ScrollView>
  );
}
