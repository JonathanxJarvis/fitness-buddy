import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Field, IconButton, Sheet, T } from '@/components/ui';
import { FadeIn, PressScale } from '@/components/motion';
import { Avatar } from '@/components/Avatar';
import { useStore } from '@/store/StoreProvider';
import { useSocial } from '@/lib/useSocial';
import { addFriend, DEMO, formatCode, levelsGained, makeSnapshot, scoreGained, sendMessage } from '@/lib/social';
import { FREE_FRIEND_LIMIT, isPro } from '@/lib/pro';
import { STAGES } from '@/lib/progression';
import { radius, spacing, useTheme } from '@/theme';
import type { SocialEvent, SocialSnapshot } from '@/lib/types';

type Board = 'rank' | 'growth' | 'levels' | 'week';
type Row = SocialSnapshot & { id: string; you?: boolean };

const BOARDS: { key: Board; label: string; icon: string; value: (s: SocialSnapshot) => number; fmt: (n: number) => string }[] = [
  { key: 'rank', label: 'Rank', icon: 'trophy', value: (s) => s.score, fmt: (n) => `${Math.round(n)} pts` },
  { key: 'growth', label: 'Fastest growing', icon: 'trending-up', value: scoreGained, fmt: (n) => `+${n} pts` },
  { key: 'levels', label: 'Most levels', icon: 'star', value: levelsGained, fmt: (n) => `+${n} lvls` },
  { key: 'week', label: 'This week', icon: 'flame', value: (s) => s.weekWorkouts, fmt: (n) => `${n} workouts` },
];

const PODIUM = ['#E9B53A', '#AEB9C4', '#C98A55'];
const EVENT_ICON: Record<SocialEvent['kind'], { icon: string; color: string }> = {
  pr: { icon: 'trophy', color: '#E9B53A' },
  workout: { icon: 'barbell', color: '#22B573' },
  rank: { icon: 'arrow-up-circle', color: '#9B5CF6' },
  quests: { icon: 'gift', color: '#F08A24' },
  streak: { icon: 'flame', color: '#F04E6E' },
};

function ago(at: number): string {
  const m = Math.max(1, Math.round((Date.now() - at) / 60_000));
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h` : `${Math.round(h / 24)}d`;
}

export default function CrewScreen() {
  const { state, dispatch } = useStore();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { me, social, error } = useSocial();
  const pro = isPro(state);
  const [board, setBoard] = useState<Board>('rank');
  const [addOpen, setAddOpen] = useState(false);
  const [code, setCode] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [cheered, setCheered] = useState<Record<string, boolean>>({});
  const mine = useMemo(() => makeSnapshot(state), [state]);
  const def = BOARDS.find((b) => b.key === board)!;

  const rows: Row[] = useMemo(() => {
    const list: Row[] = social.friends.map((f) => ({ ...f }));
    if (mine) list.push({ ...mine, id: 'me', you: true });
    return list.sort((a, b) => def.value(b) - def.value(a) || b.level - a.level);
  }, [social.friends, mine, def]);
  const myPlace = rows.findIndex((r) => r.you) + 1;

  const feed = useMemo(() => {
    const items: { who: Row; e: SocialEvent }[] = [];
    rows.forEach((r) => (r.recent ?? []).forEach((e) => items.push({ who: r, e })));
    return items.sort((a, b) => b.e.at - a.e.at).slice(0, 8);
  }, [rows]);

  const chats = useMemo(
    () =>
      social.friends
        .map((f) => {
          const list = social.chats[f.id] ?? [];
          const last = list[list.length - 1];
          const unread = list.filter((m) => m.from !== me?.id && m.at > (social.read[f.id] ?? 0)).length;
          return { f, last, unread };
        })
        .filter((c) => c.last)
        .sort((a, b) => b.last!.at - a.last!.at),
    [social, me],
  );

  const add = async () => {
    if (!me) return;
    if (!pro && social.friends.length >= FREE_FRIEND_LIMIT) {
      setAddOpen(false);
      router.push('/pro?feature=friends');
      return;
    }
    setAdding(true);
    setAddError(null);
    try {
      const f = await addFriend(me, code);
      if (social.friends.some((x) => x.id === f.id)) throw new Error(`${f.name} is already in your crew.`);
      dispatch({ type: 'setFriends', friends: [...social.friends, f] });
      setCode('');
      setAddOpen(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      setAddError((e as Error).message);
    } finally {
      setAdding(false);
    }
  };

  const cheer = async (who: Row, e: SocialEvent) => {
    const key = `${who.id}-${e.at}`;
    if (!me || who.you || cheered[key]) return;
    setCheered((c) => ({ ...c, [key]: true }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const text = e.kind === 'pr' ? `👏 Huge PR, ${who.name}!` : e.kind === 'rank' ? `🔥 ${e.text.replace('reached ', '')}! Let’s go!` : e.kind === 'streak' ? '🔥 That streak is insane' : '💪 Nice work!';
    try {
      const m = await sendMessage(me, who.id, text);
      dispatch({ type: 'addMessages', friendId: who.id, messages: [m] });
    } catch {}
  };

  const share = () => {
    if (!me) return;
    Share.share({ message: `Train with me on Fitness Buddy! Add my code ${formatCode(me.code)} and let’s race up the ranks.` }).catch(() => {});
  };

  const open = (r: Row) => (r.you ? router.push('/rank') : router.push(`/friend/${r.id}`));
  const myStage = STAGES[mine?.stage ?? 0] ?? STAGES[0];
  const top = rows.slice(0, 3);
  const podiumOrder = [top[1], top[0], top[2]].filter(Boolean) as Row[];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 110 + insets.bottom }} showsVerticalScrollIndicator={false}>
      {/* Hero: you, your frame and your code */}
      <LinearGradient colors={['#0E2A1F', '#123D2C', colors.background]} locations={[0, 0.72, 1]} style={{ paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
          <View style={{ flex: 1 }}>
            <T size={13} weight="600" color="rgba(255,255,255,0.65)">{social.friends.length ? `${social.friends.length} friends · you’re #${myPlace}` : 'Train together'}</T>
            <T size={26} weight="800" color="#fff">Crew</T>
          </View>
          <IconButton label="Add a friend" icon="person-add" color="#fff" onPress={() => setAddOpen(true)} />
        </View>
        <FadeIn>
          <Pressable onPress={() => router.push('/rank')} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Avatar stage={mine?.stage ?? 0} pet={state.settings.pet} skin={state.settings.mascotSkin} size={92} mood="pumped" animate />
            <View style={{ flex: 1 }}>
              <T size={20} weight="800" color="#fff" numberOfLines={1}>{mine?.name ?? 'You'}</T>
              <T size={14} weight="800" color={myStage.tier.glow}>{myStage.label}</T>
              <T size={12} color="rgba(255,255,255,0.7)">
                Lv {mine?.level ?? 1} · {Math.round(mine?.score ?? 0)} rank pts{mine?.streak ? ` · 🔥 ${mine.streak}` : ''}
              </T>
            </View>
          </Pressable>
          <Pressable onPress={share} style={{ marginTop: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
            <T size={11} weight="800" color="rgba(255,255,255,0.6)">YOUR CODE</T>
            <T size={17} weight="800" color="#fff" style={{ letterSpacing: 2, flex: 1 }}>{me ? formatCode(me.code) : '······'}</T>
            <Ionicons name="share-social" size={18} color="#fff" />
            <T size={13} weight="700" color="#fff">Invite</T>
          </Pressable>
        </FadeIn>
      </LinearGradient>

      <View style={{ paddingHorizontal: spacing.lg }}>
        {/* Board picker */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0, marginBottom: spacing.md }} contentContainerStyle={{ gap: 6 }}>
          {BOARDS.map((b) => {
            const on = b.key === board;
            return (
              <Pressable key={b.key} onPress={() => setBoard(b.key)} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: on ? colors.ink : colors.cardAlt }}>
                <Ionicons name={b.icon as never} size={14} color={on ? colors.onInk : colors.text} />
                <T size={13} weight="700" color={on ? colors.onInk : colors.text}>{b.label}</T>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Podium */}
        {rows.length > 1 && (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8, marginBottom: spacing.md }}>
            {podiumOrder.map((r) => {
              const place = rows.indexOf(r);
              const h = place === 0 ? 86 : place === 1 ? 62 : 46;
              return (
                <Pressable key={r.id} onPress={() => open(r)} style={{ flex: 1, alignItems: 'center' }}>
                  {place === 0 && <Ionicons name="trophy" size={18} color={PODIUM[0]} />}
                  <Avatar stage={r.stage} pet={r.pet} skin={r.skin} size={place === 0 ? 84 : 68} mood={place === 0 ? 'proud' : 'happy'} animate={place === 0} />
                  <T size={13} weight="800" numberOfLines={1}>{r.you ? 'You' : r.name}</T>
                  <T size={12} weight="700" muted>{def.fmt(def.value(r))}</T>
                  <LinearGradient colors={[PODIUM[place], PODIUM[place] + '88']} style={{ marginTop: 6, width: '100%', height: h, borderTopLeftRadius: 12, borderTopRightRadius: 12, alignItems: 'center', paddingTop: 6 }}>
                    <T size={22} weight="800" color="#fff">{place + 1}</T>
                  </LinearGradient>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Everyone else */}
        {rows.length > 3 && (
          <Card style={{ paddingVertical: 2 }}>
            {rows.slice(3).map((r, i) => {
              const stage = STAGES[r.stage] ?? STAGES[0];
              return (
                <Pressable key={r.id} onPress={() => open(r)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderColor: colors.border }}>
                  <T weight="800" muted style={{ width: 20, textAlign: 'center' }}>{i + 4}</T>
                  <Avatar stage={r.stage} pet={r.pet} skin={r.skin} size={46} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T weight="800" numberOfLines={1}>{r.you ? 'You' : r.name}</T>
                    <T size={12} muted numberOfLines={1}>
                      {stage.label} · Lv {r.level}
                    </T>
                  </View>
                  <T weight="800" size={14}>{def.fmt(def.value(r))}</T>
                </Pressable>
              );
            })}
          </Card>
        )}

        {!social.friends.length && (
          <Card style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
            <Ionicons name="people" size={34} color={colors.primary} />
            <T weight="800" size={16} style={{ marginTop: 6 }}>Your crew is empty</T>
            <T muted center style={{ marginTop: 4, marginBottom: spacing.md }}>People who train with friends stick with it longer. Invite yours and race up the ranks.</T>
            <Button title="Invite friends" icon="share-social" onPress={share} />
          </Card>
        )}

        {/* Activity feed */}
        {feed.length > 0 && (
          <>
            <T size={17} weight="800" style={{ marginTop: spacing.sm, marginBottom: spacing.sm }}>Activity</T>
            <Card style={{ paddingVertical: 2 }}>
              {feed.map(({ who, e }, i) => {
                const ic = EVENT_ICON[e.kind];
                const key = `${who.id}-${e.at}`;
                return (
                  <View key={key + i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderColor: colors.border }}>
                    <Pressable onPress={() => open(who)}>
                      <Avatar stage={who.stage} pet={who.pet} skin={who.skin} size={40} />
                    </Pressable>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <T size={14} numberOfLines={2}>
                        <T size={14} weight="800">{who.you ? 'You' : who.name}</T> {e.text}
                      </T>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Ionicons name={ic.icon as never} size={12} color={ic.color} />
                        <T size={11} muted>{ago(e.at)} ago</T>
                      </View>
                    </View>
                    {!who.you && (
                      <PressScale
                        onPress={() => cheer(who, e)}
                        accessibilityLabel={`Cheer ${who.name}`}
                        style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: cheered[key] ? colors.primarySoft : colors.cardAlt }}
                      >
                        <T size={12} weight="800" color={cheered[key] ? colors.primary : colors.text}>{cheered[key] ? 'Cheered' : '👏 Cheer'}</T>
                      </PressScale>
                    )}
                  </View>
                );
              })}
            </Card>
          </>
        )}

        {/* Chats */}
        {chats.length > 0 && (
          <>
            <T size={17} weight="800" style={{ marginTop: spacing.sm, marginBottom: spacing.sm }}>Chats</T>
            <Card style={{ paddingVertical: 2 }}>
              {chats.map(({ f, last, unread }, i) => (
                <Pressable key={f.id} onPress={() => router.push(`/chat/${f.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderColor: colors.border }}>
                  <Avatar stage={f.stage} pet={f.pet} skin={f.skin} size={46} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T weight="800">{f.name}</T>
                    <T size={13} muted={!unread} weight={unread ? '700' : '400'} numberOfLines={1}>
                      {last!.from === me?.id ? 'You: ' : ''}
                      {last!.text}
                    </T>
                  </View>
                  {unread > 0 ? (
                    <View style={{ minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }}>
                      <T size={11} weight="800" color={colors.onPrimary}>{unread}</T>
                    </View>
                  ) : (
                    <T size={11} muted>{ago(last!.at)}</T>
                  )}
                </Pressable>
              ))}
            </Card>
          </>
        )}

        {error && <T size={12} color={colors.danger} center>Couldn’t reach the crew server: {error}</T>}
        {DEMO && (
          <T size={11} muted center style={{ marginTop: spacing.sm }}>
            Demo crew: friends and their replies are simulated until the crew server is connected.
          </T>
        )}
      </View>

      <Sheet visible={addOpen} onClose={() => setAddOpen(false)} title="Add a friend">
        <T muted style={{ marginBottom: spacing.md }}>
          Enter their friend code. {pro ? '' : `Free crews hold ${FREE_FRIEND_LIMIT} friends (${social.friends.length}/${FREE_FRIEND_LIMIT}).`}
        </T>
        <Field value={code} onChangeText={(t) => setCode(t.toUpperCase())} placeholder="e.g. LEN-A26" autoCapitalize="characters" autoCorrect={false} onSubmitEditing={add} />
        {addError && <T size={13} color={colors.danger} style={{ marginBottom: spacing.sm }}>{addError}</T>}
        <Button title="Add to crew" icon="person-add" onPress={add} loading={adding} disabled={!me || code.replace(/[^A-Za-z0-9]/g, '').length !== 6} />
        <Button title="Share my code instead" variant="ghost" icon="share-social" onPress={share} style={{ marginTop: spacing.sm }} />
        {DEMO && <T size={12} muted center style={{ marginTop: spacing.sm }}>In the demo, any 6-character code adds a new friend.</T>}
      </Sheet>
    </ScrollView>
  );
}

