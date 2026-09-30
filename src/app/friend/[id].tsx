import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, IconButton, Sheet, T } from '@/components/ui';
import { FadeIn } from '@/components/motion';
import { Avatar } from '@/components/Avatar';
import { EVENT_STYLE, EventGlyph, Flame } from '@/components/people/Glyphs';
import { LineChart } from '@/components/Charts';
import { useStore } from '@/store/StoreProvider';
import { levelsGained, makeSnapshot, removeFriend, scoreGained } from '@/lib/social';
import { STAGES } from '@/lib/progression';
import { addDays, shortDate, todayKey } from '@/lib/dates';
import { radius, spacing, useTheme } from '@/theme';

function ago(at: number): string {
  const h = Math.max(1, Math.round((Date.now() - at) / 3_600_000));
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}

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
        <T muted>This person isn’t on your friends list anymore.</T>
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
        { label: 'Growth, 8 weeks', them: scoreGained(f), you: scoreGained(mine), fmt: (n) => `+${n}` },
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

  const stats = [
    { v: `+${scoreGained(f)}`, l: 'rank pts\nin 8 weeks' },
    { v: `+${levelsGained(f)}`, l: 'levels\nin 8 weeks' },
    { v: `${f.totalWorkouts}`, l: 'workouts\nlogged' },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }} showsVerticalScrollIndicator={false}>
      {/* A flat wash of their tier color behind the portrait. */}
      <View style={{ backgroundColor: stage.tier.color + '24', paddingBottom: spacing.lg }}>
        <View style={{ paddingTop: insets.top + spacing.xs, paddingHorizontal: spacing.sm, flexDirection: 'row', justifyContent: 'space-between' }}>
          <IconButton label="Back" icon="chevron-back" color={colors.text} onPress={() => router.back()} />
          <IconButton label="More" icon="ellipsis-horizontal" color={colors.text} onPress={() => setConfirm(true)} />
        </View>
        <FadeIn style={{ alignItems: 'center', paddingHorizontal: spacing.lg, marginTop: -spacing.lg }}>
          <Avatar person={f} stage={f.stage} pet={f.pet} skin={f.skin} size={176} frame="ornate" mood="pumped" animate />
          <T size={28} weight="800" style={{ marginTop: -spacing.sm }}>{f.name}</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <T size={15} weight="800" color={stage.tier.color}>{stage.label}</T>
            <T size={15} muted>Level {f.level}</T>
            {f.streak ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Flame size={13} />
                <T size={15} muted>{f.streak} days</T>
              </View>
            ) : null}
          </View>
          {f.petName ? <T size={13} muted style={{ marginTop: 2 }}>Trains with {f.petName}</T> : null}
        </FadeIn>
      </View>

      <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
        <Button title={`Message ${f.name}`} icon="chatbubble-outline" onPress={() => router.push(`/chat/${f.id}`)} style={{ marginBottom: spacing.md }} />
        <Card style={{ flexDirection: 'row', paddingVertical: spacing.md, paddingHorizontal: 0 }}>
          {stats.map((s, i) => (
            <View key={s.l} style={{ flex: 1, alignItems: 'center', borderLeftWidth: i ? 1 : 0, borderColor: colors.border }}>
              <T size={22} weight="800">{s.v}</T>
              <T size={11} muted center>{s.l}</T>
            </View>
          ))}
        </Card>

        <Card>
          <T weight="800" size={16}>Rank over 8 weeks</T>
          <T size={13} muted style={{ marginBottom: spacing.sm }}>Weekly rank points</T>
          <LineChart points={points} color={stage.tier.color} height={150} format={(n) => `${Math.round(n)}`} />
        </Card>

        {vs.length > 0 && mine && (
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Avatar person={{ name: mine.name, avatar: state.settings.avatar, photo: state.settings.photo }} stage={mine.stage} size={36} petBadge={false} />
                <T weight="800">You</T>
              </View>
              <T size={12} weight="800" muted>VS</T>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                <T weight="800" numberOfLines={1}>{f.name}</T>
                <Avatar person={f} stage={f.stage} size={36} petBadge={false} />
              </View>
            </View>
            {vs.map((row) => {
              const total = Math.max(row.them + row.you, 1);
              const fmt = row.fmt ?? ((n: number) => `${n}`);
              const youLead = row.you > row.them;
              const theyLead = row.them > row.you;
              return (
                <View key={row.label} style={{ marginBottom: spacing.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 5 }}>
                    <T size={15} weight="800" color={youLead ? colors.primary : colors.text} style={{ width: 48 }}>{fmt(row.you)}</T>
                    <T size={12} weight="600" muted center style={{ flex: 1 }}>{row.label}</T>
                    <T size={15} weight="800" color={theyLead ? stage.tier.color : colors.text} style={{ width: 48, textAlign: 'right' }}>{fmt(row.them)}</T>
                  </View>
                  <View style={{ flexDirection: 'row', height: 6, gap: 3 }}>
                    <View style={{ flex: 1, alignItems: 'flex-end', backgroundColor: colors.track, borderRadius: 3, overflow: 'hidden' }}>
                      <View style={{ width: `${(row.you / total) * 100}%`, height: 6, backgroundColor: colors.primary, borderRadius: 3 }} />
                    </View>
                    <View style={{ flex: 1, backgroundColor: colors.track, borderRadius: 3, overflow: 'hidden' }}>
                      <View style={{ width: `${(row.them / total) * 100}%`, height: 6, backgroundColor: stage.tier.color, borderRadius: 3 }} />
                    </View>
                  </View>
                </View>
              );
            })}
          </Card>
        )}

        {!!(f.recent?.length || f.lastWorkout) && (
          <Card>
            <T weight="800" size={16} style={{ marginBottom: 4 }}>Recent activity</T>
            {f.lastWorkout && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
                <View style={{ width: 34, height: 34, borderRadius: radius.sm, backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center' }}>
                  <EventGlyph kind="workout" size={17} />
                </View>
                <View style={{ flex: 1 }}>
                  <T weight="700">Last workout: {f.lastWorkout.name}</T>
                  <T size={12} muted>
                    {shortDate(f.lastWorkout.date)} · {f.lastWorkout.sets} sets
                  </T>
                </View>
              </View>
            )}
            {(f.recent ?? [])
              .filter((e) => e.kind !== 'workout')
              .slice(0, 4)
              .map((e) => (
                <View key={`${e.kind}-${e.at}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderColor: colors.border }}>
                  <View style={{ width: 34, height: 34, borderRadius: radius.sm, backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center' }}>
                    <EventGlyph kind={e.kind} size={17} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <T weight="700">
                      {e.text.charAt(0).toUpperCase()}
                      {e.text.slice(1)}
                    </T>
                    <T size={12} muted>
                      {EVENT_STYLE[e.kind].label} · {ago(e.at)}
                    </T>
                  </View>
                </View>
              ))}
          </Card>
        )}
      </View>

      <Sheet visible={confirm} onClose={() => setConfirm(false)} title={`Remove ${f.name}?`}>
        <T muted style={{ marginBottom: spacing.lg }}>You’ll stop seeing each other’s progress, and your chat is deleted from this phone.</T>
        <Button title="Remove friend" variant="danger" onPress={remove} />
        <Button title="Cancel" variant="ghost" style={{ marginTop: spacing.sm }} onPress={() => setConfirm(false)} />
      </Sheet>
    </ScrollView>
  );
}
