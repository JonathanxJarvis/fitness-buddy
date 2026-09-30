import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Sheet, T } from '@/components/ui';
import { FadeIn, PressScale } from '@/components/motion';
import { Avatar, type AvatarPerson } from '@/components/Avatar';
import { PortraitCircle } from '@/components/people/Portrait';
import { avatarFromSeed } from '@/components/people/avatarConfig';
import { CodeInput } from '@/components/people/CodeInput';
import { EVENT_STYLE, EventGlyph, Flame } from '@/components/people/Glyphs';
import { useStore } from '@/store/StoreProvider';
import { useSocial } from '@/lib/useSocial';
import { addFriend, DEMO, OFFLINE, OFFLINE_MESSAGE, formatCode, levelsGained, makeSnapshot, scoreGained, sendMessage } from '@/lib/social';
import { FREE_FRIEND_LIMIT, isPro } from '@/lib/pro';
import { ProMark } from '@/components/ProMark';
import { STAGES } from '@/lib/progression';
import { radius, spacing, useTheme } from '@/theme';
import type { SocialEvent, SocialSnapshot } from '@/lib/types';

type Board = 'rank' | 'growth' | 'levels' | 'week';
type Row = SocialSnapshot & { id: string; code?: string; you?: boolean; photo?: string };

const BOARDS: { key: Board; label: string; value: (s: SocialSnapshot) => number; fmt: (n: number) => [string, string] }[] = [
  { key: 'rank', label: 'Rank', value: (s) => s.score, fmt: (n) => [`${Math.round(n)}`, 'pts'] },
  { key: 'growth', label: 'Growing', value: scoreGained, fmt: (n) => [`+${n}`, 'pts'] },
  { key: 'levels', label: 'Levels', value: levelsGained, fmt: (n) => [`+${n}`, 'lvl'] },
  { key: 'week', label: 'This week', value: (s) => s.weekWorkouts, fmt: (n) => [`${n}`, n === 1 ? 'workout' : 'workouts'] },
];

const MEDAL = ['#D4A12A', '#9AA6B2', '#B97A4A'];

function ago(at: number): string {
  const m = Math.max(1, Math.round((Date.now() - at) / 60_000));
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h` : `${Math.round(h / 24)}d`;
}

function dayBucket(at: number): string {
  const d = new Date(at);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (d.getTime() >= start) return 'Today';
  if (d.getTime() >= start - 86_400_000) return 'Yesterday';
  return 'Earlier this week';
}

function cheerText(who: Row, e: SocialEvent): string {
  if (e.kind === 'pr') return `Huge PR, ${who.name}! How did it feel?`;
  if (e.kind === 'rank') return `${e.text.replace('reached ', '')}, let’s go!`;
  if (e.kind === 'streak') return 'That streak is unreal. Keep it going';
  return 'Nice session!';
}

export default function FriendsScreen() {
  const { state, dispatch } = useStore();
  const { colors, dark } = useTheme();
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
  const myPerson: AvatarPerson = { name: mine?.name, avatar: state.settings.avatar, photo: state.settings.photo };

  const rows: Row[] = useMemo(() => {
    const list: Row[] = social.friends.map((f) => ({ ...f }));
    if (mine) list.push({ ...mine, id: 'me', you: true, photo: state.settings.photo });
    return list.sort((a, b) => def.value(b) - def.value(a) || b.level - a.level);
  }, [social.friends, mine, def, state.settings.photo]);
  const myPlace = rows.findIndex((r) => r.you) + 1;
  const best = Math.max(1, ...rows.map((r) => def.value(r)));

  const [allActivity, setAllActivity] = useState(false);
  const feedTotal = rows.reduce((n, r) => n + Math.min(2, r.recent?.length ?? 0), 0);
  const feed = useMemo(() => {
    const items: { who: Row; e: SocialEvent }[] = [];
    rows.forEach((r) => (r.recent ?? []).forEach((e) => items.push({ who: r, e })));
    // Newest first, at most two highlights per person so one busy friend doesn't flood the feed.
    const per: Record<string, number> = {};
    const sorted = items
      .sort((a, b) => b.e.at - a.e.at)
      .filter((it) => (per[it.who.id] = (per[it.who.id] ?? 0) + 1) <= 2)
      .slice(0, allActivity ? 10 : 3);
    const groups: { title: string; items: typeof sorted }[] = [];
    sorted.forEach((it) => {
      const t = dayBucket(it.e.at);
      const g = groups[groups.length - 1];
      if (g?.title === t) g.items.push(it);
      else groups.push({ title: t, items: [it] });
    });
    return groups;
  }, [rows, allActivity]);

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

  const openAdd = () => {
    setAddError(null);
    setAddOpen(true);
  };

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
      if (social.friends.some((x) => x.id === f.id)) throw new Error(`${f.name} is already on your friends list.`);
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
    try {
      const m = await sendMessage(me, who.id, cheerText(who, e));
      dispatch({ type: 'addMessages', friendId: who.id, messages: [m] });
    } catch {}
  };

  const share = () => {
    if (!me) return;
    Share.share({ message: `Train with me on Fitness Buddy. Add my friend code ${formatCode(me.code)} and let’s see who ranks up first.` }).catch(() => {});
  };

  const open = (r: Row) => (r.you ? router.push('/rank') : router.push(`/friend/${r.id}`));
  const myStage = STAGES[mine?.stage ?? 0] ?? STAGES[0];
  const hasFriends = social.friends.length > 0;

  const section = (title: string, right?: React.ReactNode) => (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.xl, marginBottom: spacing.sm }}>
      <T size={19} weight="800" style={{ flex: 1 }}>{title}</T>
      {right}
    </View>
  );

  const invite = (
    <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', marginRight: spacing.md }}>
          {['Mira', 'Jonas', 'Deniz'].map((n, i) => (
            <View key={n} style={{ marginLeft: i ? -12 : 0, borderRadius: 22, borderWidth: 2.5, borderColor: colors.card }}>
              <PortraitCircle config={avatarFromSeed(n)} size={38} dark={dark} />
            </View>
          ))}
        </View>
        <View style={{ flex: 1 }}>
          <T weight="800" size={16}>{hasFriends ? 'Invite someone new' : 'Train with your friends'}</T>
          <T size={13} muted>{hasFriends ? 'Share your code. They add it, and you’re linked both ways.' : 'People who train together stick with it. Add a friend to compare ranks and chat.'}</T>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardAlt, borderRadius: radius.md, paddingLeft: spacing.lg, paddingRight: 6, paddingVertical: 6, marginBottom: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <T size={11} weight="700" muted style={{ letterSpacing: 0.6 }}>YOUR FRIEND CODE</T>
          <T size={22} weight="800" style={{ letterSpacing: 3 }}>{me ? formatCode(me.code) : '···-···'}</T>
        </View>
        <PressScale onPress={share} accessibilityLabel="Share your code" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.ink, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 10 }}>
          <Ionicons name="share-outline" size={16} color={colors.onInk} />
          <T size={14} weight="700" color={colors.onInk}>Share</T>
        </PressScale>
      </View>
      <Pressable onPress={openAdd} style={{ paddingVertical: 8, alignItems: 'center' }}>
        <T size={14} weight="700" color={colors.primary}>I have a friend’s code</T>
      </Pressable>
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.lg, paddingBottom: 120 + insets.bottom }} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
        <View style={{ flex: 1 }}>
          <T size={30} weight="800">Friends</T>
          <T size={14} muted>{hasFriends ? `${social.friends.length} ${social.friends.length === 1 ? 'friend' : 'friends'} · you’re #${myPlace} by ${def.label.toLowerCase()}` : 'Compare ranks, cheer and chat'}</T>
        </View>
        <PressScale onPress={openAdd} accessibilityLabel="Add a friend" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 9 }}>
          <Ionicons name="person-add" size={15} color={colors.primary} />
          <T size={14} weight="800" color={colors.primary}>Add</T>
        </PressScale>
      </View>

      {/* You */}
      <FadeIn>
        <PressScale onPress={() => router.push('/rank')} accessibilityLabel="Your rank" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card, borderRadius: radius.lg, paddingVertical: 4, paddingLeft: 0, paddingRight: spacing.lg, borderWidth: 1, borderColor: colors.border }}>
          <Avatar person={myPerson} stage={mine?.stage ?? 0} pet={state.settings.pet ?? 'kettle'} skin={state.settings.mascotSkin} size={112} frame="ornate" mood="pumped" animate />
          <View style={{ flex: 1, minWidth: 0, marginLeft: -spacing.sm }}>
            <T size={19} weight="800" numberOfLines={1}>{mine?.name ?? 'You'}</T>
            <T size={14} weight="700" color={myStage.tier.color}>{myStage.label}</T>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
              <T size={13} muted>Lv {mine?.level ?? 1}</T>
              <T size={13} muted>{Math.round(mine?.score ?? 0)} pts</T>
              {mine?.streak ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Flame size={12} />
                  <T size={13} muted>{mine.streak}</T>
                </View>
              ) : null}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </PressScale>
      </FadeIn>

      {!hasFriends && <View style={{ marginTop: spacing.lg }}>{invite}</View>}

      {/* Leaderboard */}
      {hasFriends && (
        <>
          {section('Leaderboard')}
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: colors.border, marginBottom: 4 }}>
            {BOARDS.map((b) => {
              const on = b.key === board;
              return (
                <Pressable key={b.key} onPress={() => setBoard(b.key)} style={{ paddingVertical: 9, marginRight: spacing.lg }} accessibilityRole="tab" accessibilityState={{ selected: on }}>
                  <T size={14} weight={on ? '800' : '600'} color={on ? colors.text : colors.textMuted}>{b.label}</T>
                  <View style={{ position: 'absolute', left: 0, right: 0, bottom: -1, height: 2.5, borderRadius: 2, backgroundColor: on ? colors.primary : 'transparent' }} />
                </Pressable>
              );
            })}
          </View>
          {rows.map((r, i) => {
            const stage = STAGES[r.stage] ?? STAGES[0];
            const v = def.value(r);
            const [num, unit] = def.fmt(v);
            return (
              <FadeIn key={`${board}-${r.id}`} delay={i * 40} offset={8}>
                <Pressable
                  onPress={() => open(r)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 8, marginHorizontal: -8, borderRadius: radius.md, backgroundColor: r.you ? colors.primarySoft : 'transparent' }}
                >
                  <View style={{ width: 22, alignItems: 'center' }}>
                    <T size={15} weight="800" color={i < 3 ? MEDAL[i] : colors.textMuted}>{i + 1}</T>
                  </View>
                  <View style={{ marginVertical: -8 }}>
                    <Avatar person={r} stage={r.stage} pet={r.pet} skin={r.skin} size={76} frame="ornate" />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T size={15} weight="800" numberOfLines={1}>{r.you ? `${r.name} (you)` : r.name}</T>
                    <T size={12} muted numberOfLines={1}>{stage.label} · Lv {r.level}</T>
                    <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.track, marginTop: 5, overflow: 'hidden' }}>
                      <View style={{ width: `${Math.max(3, (v / best) * 100)}%`, height: 4, borderRadius: 2, backgroundColor: stage.tier.color }} />
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', minWidth: 48 }}>
                    <T size={17} weight="800">{num}</T>
                    <T size={11} muted>{unit}</T>
                  </View>
                </Pressable>
              </FadeIn>
            );
          })}
        </>
      )}

      {/* Messages */}
      {chats.length > 0 && (
        <>
          {section('Messages')}
          <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md }}>
            {chats.map(({ f, last, unread }, i) => (
              <Pressable key={f.id} onPress={() => router.push(`/chat/${f.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderColor: colors.border }}>
                <View style={{ marginVertical: -6 }}>
                  <Avatar person={f} stage={f.stage} size={66} frame="ornate" petBadge={false} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <T size={15} weight="800" style={{ flex: 1 }} numberOfLines={1}>{f.name}</T>
                    <T size={12} muted={!unread} color={unread ? colors.primary : undefined} weight={unread ? '700' : '400'}>{ago(last!.at)}</T>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <T size={14} muted={!unread} weight={unread ? '700' : '400'} numberOfLines={1} style={{ flex: 1 }}>
                      {last!.from === me?.id ? 'You: ' : ''}
                      {last!.text}
                    </T>
                    {unread > 0 && (
                      <View style={{ minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
                        <T size={11} weight="800" color={colors.onPrimary}>{unread}</T>
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {/* Activity */}
      {feed.length > 0 && (
        <>
          {section('Activity')}
          {feed.map((g) => (
            <View key={g.title}>
              <T size={12} weight="700" muted style={{ marginTop: spacing.sm, marginBottom: 2, letterSpacing: 0.4 }}>{g.title.toUpperCase()}</T>
              {g.items.map(({ who, e }, i) => {
                const key = `${who.id}-${e.at}`;
                const st = EVENT_STYLE[e.kind];
                const done = cheered[key];
                return (
                  <View key={key + i} style={{ flexDirection: 'row', gap: 10, paddingVertical: 7 }}>
                    <Pressable onPress={() => open(who)}>
                      <Avatar person={who} stage={who.stage} size={36} petBadge={false} />
                    </Pressable>
                    <View style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                      <T size={15}>
                        <T size={15} weight="800">{who.you ? 'You' : who.name}</T> {e.text}
                      </T>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 }}>
                        <EventGlyph kind={e.kind} size={13} />
                        <T size={12} weight="700" color={st.color}>{st.label}</T>
                        <T size={12} muted>· {ago(e.at)}</T>
                      </View>
                    </View>
                    {!who.you && (
                      <PressScale
                        onPress={() => cheer(who, e)}
                        accessibilityLabel={`Cheer ${who.name}`}
                        style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1, borderColor: done ? 'transparent' : colors.border, backgroundColor: done ? colors.primarySoft : 'transparent' }}
                      >
                        {done && <Ionicons name="checkmark" size={13} color={colors.primary} />}
                        <T size={13} weight="700" color={done ? colors.primary : colors.text}>{done ? 'Cheered' : 'Cheer'}</T>
                      </PressScale>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
          {feedTotal > 3 && (
            <Pressable onPress={() => setAllActivity((v) => !v)} accessibilityRole="button" hitSlop={6} style={{ alignSelf: 'center', paddingVertical: 8 }}>
              <T size={13} weight="800" color={colors.primary}>{allActivity ? 'Show less' : 'Show more'}</T>
            </Pressable>
          )}
        </>
      )}

      {hasFriends && (
        <>
          {section('Invite')}
          {invite}
        </>
      )}

      {error && <T size={12} color={colors.danger} center style={{ marginTop: spacing.md }}>Couldn’t reach the friends server: {error}</T>}
      {DEMO && (
        <T size={11} muted center style={{ marginTop: spacing.lg }}>
          Demo mode: friends and their replies are simulated until the friends server is connected.
        </T>
      )}

      <Sheet visible={addOpen} onClose={() => setAddOpen(false)} title="Add a friend">
        <T muted style={{ marginBottom: pro ? spacing.lg : 6 }}>
          Ask your friend for their code. They’ll find it under Friends → Invite.
        </T>
        {!pro && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.lg, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: colors.cardAlt }}>
            <ProMark />
            <T size={13} muted>
              {social.friends.length}/{FREE_FRIEND_LIMIT} free friends used · unlimited with Pro
            </T>
          </View>
        )}
        <CodeInput value={code} onChange={setCode} onSubmit={add} autoFocus />
        {addError && <T size={13} color={colors.danger} style={{ marginBottom: spacing.sm }}>{addError}</T>}
        <Button title="Add friend" onPress={add} loading={adding} disabled={!me || code.length !== 6} />
        <Button title="Share my code instead" variant="ghost" icon="share-outline" onPress={share} style={{ marginTop: spacing.sm }} />
        {DEMO && <T size={12} muted center style={{ marginTop: spacing.sm }}>In the demo, any 6-character code adds a new friend.</T>}
        {OFFLINE && <T size={12} muted center style={{ marginTop: spacing.sm }}>{OFFLINE_MESSAGE}</T>}
      </Sheet>
    </ScrollView>
  );
}
