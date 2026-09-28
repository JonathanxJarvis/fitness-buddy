import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ActionSheet, Button, Card, IconButton, T } from '@/components/ui';
import { FadeIn, PressScale, TypingDots } from '@/components/motion';
import { tabBarHeight, useKeyboardVisible } from '@/components/TabBar';
import { useStore } from '@/store/StoreProvider';
import { uid } from '@/store/reducer';
import { askCoach, friendlyError } from '@/lib/ai';
import { getApiKey } from '@/lib/secrets';
import { pickMealPhoto, type MealPhoto } from '@/lib/photos';
import { font, nutrientColors, radius, spacing, useTheme } from '@/theme';
import type { ChatMessage } from '@/lib/types';

const SUGGESTIONS = [
  'What should I eat to hit my protein today?',
  'How am I doing so far today?',
  'High-protein snacks under 200 calories',
  'Plan tomorrow’s meals for my goal',
];

/** Renders **bold** and "- " bullets, the only formatting the coach uses. */
function RichText({ text, color }: { text: string; color: string }) {
  const lines = text.split('\n');
  return (
    <View style={{ gap: 4 }}>
      {lines.map((line, i) => {
        if (!line.trim()) return <View key={i} style={{ height: 2 }} />;
        const bullet = /^\s*([-•*]|\d+\.)\s+/.exec(line);
        const body = bullet ? line.slice(bullet[0].length) : line;
        const parts = body.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
        const content = parts.map((p, j) =>
          p.startsWith('**') && p.endsWith('**') ? (
            <T key={j} size={15} weight="700" color={color}>
              {p.slice(2, -2)}
            </T>
          ) : (
            p
          ),
        );
        return bullet ? (
          <View key={i} style={{ flexDirection: 'row', gap: 8, paddingLeft: 2 }}>
            <T size={15} color={color}>{/\d/.test(bullet[1]) ? bullet[1] : '•'}</T>
            <T size={15} color={color} style={{ flex: 1, lineHeight: 22 }}>
              {content}
            </T>
          </View>
        ) : (
          <T key={i} size={15} color={color} style={{ lineHeight: 22 }}>
            {content}
          </T>
        );
      })}
    </View>
  );
}

function Bubble({ m }: { m: ChatMessage }) {
  const { colors } = useTheme();
  const mine = m.role === 'user';
  return (
    <FadeIn offset={8} style={{ alignItems: mine ? 'flex-end' : 'flex-start', marginBottom: spacing.md }}>
      {m.photo && <Image source={{ uri: m.photo }} style={{ width: 180, height: 180, borderRadius: 20, marginBottom: 6 }} />}
      {m.text ? (
        <View
          style={{
            maxWidth: '86%',
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 20,
            borderBottomRightRadius: mine ? 6 : 20,
            borderBottomLeftRadius: mine ? 20 : 6,
            backgroundColor: mine ? colors.ink : m.error ? colors.warningSoft : colors.card,
          }}
        >
          {mine ? (
            <T size={15} color={colors.onInk} style={{ lineHeight: 22 }}>
              {m.text}
            </T>
          ) : (
            <RichText text={m.text} color={m.error ? colors.warning : colors.text} />
          )}
        </View>
      ) : null}
    </FadeIn>
  );
}

export default function CoachScreen() {
  const { state, dispatch } = useStore();
  const { colors, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardVisible();
  const params = useLocalSearchParams<{ prompt?: string }>();
  const scroll = useRef<ScrollView>(null);
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<MealPhoto | null>(null);
  const [busy, setBusy] = useState(false);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [attachOpen, setAttachOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getApiKey().then((k) => setHasKey(!!k));
    }, []),
  );

  useEffect(() => {
    if (params.prompt) setText(params.prompt);
  }, [params.prompt]);

  useEffect(() => {
    const t = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [state.chat.length, busy]);

  const send = async (raw?: string) => {
    const body = (raw ?? text).trim();
    if ((!body && !photo) || busy) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const msg: ChatMessage = { id: uid(), role: 'user', text: body, photo: photo?.thumb, createdAt: Date.now() };
    const attached = photo?.base64;
    dispatch({ type: 'addChat', message: msg });
    setText('');
    setPhoto(null);
    setBusy(true);
    try {
      const reply = await askCoach(state, [...state.chat, msg], attached);
      dispatch({ type: 'addChat', message: { id: uid(), role: 'assistant', text: reply, createdAt: Date.now() } });
    } catch (e) {
      dispatch({ type: 'addChat', message: { id: uid(), role: 'assistant', text: friendlyError(e), createdAt: Date.now(), error: true } });
    } finally {
      setBusy(false);
    }
  };

  const attach = async (source: 'camera' | 'library') => {
    try {
      const p = await pickMealPhoto(source);
      if (p) setPhoto(p);
    } catch (e) {
      dispatch({ type: 'addChat', message: { id: uid(), role: 'assistant', text: friendlyError(e), createdAt: Date.now(), error: true } });
    }
  };

  // Clear the tab bar and the + button that rises above it.
  const bottom = keyboard ? spacing.sm : tabBarHeight(insets.bottom) + 28;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <LinearGradient colors={[nutrientColors.protein, colors.hero[2]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="sparkles" size={22} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <T size={22} weight="800">Coach</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: hasKey ? colors.primary : colors.warning }} />
            <T size={12} muted>{hasKey ? 'Powered by Claude · knows your goals & log' : 'Needs a Claude API key'}</T>
          </View>
        </View>
        {state.chat.length > 0 && <IconButton label="Clear chat" icon="trash-outline" color={colors.textMuted} onPress={() => dispatch({ type: 'clearChat' })} />}
      </View>

      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.sm }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {hasKey === false && (
          <FadeIn>
            <Card style={{ borderColor: colors.warning, borderWidth: 1 }}>
              <T weight="800">Connect Claude to chat</T>
              <T size={14} muted style={{ marginTop: 4, marginBottom: spacing.md }}>
                Coach and meal-photo estimates use your own Claude API key. Add it once in your profile; it stays in this phone’s secure storage.
              </T>
              <Button title="Add API key" icon="key-outline" onPress={() => router.push('/profile')} />
            </Card>
          </FadeIn>
        )}

        {state.chat.length === 0 && (
          <FadeIn delay={80}>
            <View style={{ alignItems: 'flex-start', marginBottom: spacing.lg }}>
              <View style={{ backgroundColor: colors.card, borderRadius: 20, borderBottomLeftRadius: 6, padding: 14, maxWidth: '90%' }}>
                <T size={15} style={{ lineHeight: 22 }}>
                  Hi{state.profile?.name ? ` ${state.profile.name}` : ''}! I’m your coach. I can see today’s log and your goals ({state.goals?.calories.toLocaleString()} kcal, {state.goals?.protein} g protein). Ask me anything, or send a photo of your meal and I’ll break it down.
                </T>
              </View>
            </View>
            <T size={12} weight="800" muted style={{ letterSpacing: 0.8, marginBottom: spacing.sm }}>TRY ASKING</T>
            {SUGGESTIONS.map((s, i) => (
              <FadeIn key={s} delay={160 + i * 60}>
                <PressScale
                  onPress={() => send(s)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8 }}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
                  <T size={14} weight="600" style={{ flex: 1 }}>{s}</T>
                  <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
                </PressScale>
              </FadeIn>
            ))}
          </FadeIn>
        )}

        {state.chat.map((m) => (
          <Bubble key={m.id} m={m} />
        ))}
        {busy && (
          <View style={{ alignSelf: 'flex-start', backgroundColor: colors.card, borderRadius: 20, borderBottomLeftRadius: 6, paddingHorizontal: 16, paddingVertical: 12 }}>
            <TypingDots color={colors.primary} />
          </View>
        )}
      </ScrollView>

      {/* Composer */}
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: bottom }}>
        {photo && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Image source={{ uri: photo.thumb }} style={{ width: 52, height: 52, borderRadius: 12 }} />
            <T size={13} muted style={{ flex: 1 }}>Photo attached. Ask a question or just send it.</T>
            <IconButton label="Remove photo" icon="close-circle" color={colors.textMuted} onPress={() => setPhoto(null)} />
          </View>
        )}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: 8,
            backgroundColor: colors.card,
            borderRadius: 26,
            padding: 6,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: '#000',
            shadowOpacity: dark ? 0 : 0.06,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
          }}
        >
          <Pressable accessibilityLabel="Attach a meal photo" onPress={() => setAttachOpen(true)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="camera" size={20} color={colors.primary} />
          </Pressable>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Ask Coach anything…"
            placeholderTextColor={colors.textMuted}
            multiline
            style={{ flex: 1, color: colors.text, fontSize: 15, ...font('500'), maxHeight: 110, paddingVertical: 10, paddingHorizontal: 4 }}
            onSubmitEditing={() => send()}
            blurOnSubmit={false}
          />
          <PressScale
            accessibilityLabel="Send"
            onPress={() => send()}
            disabled={busy || (!text.trim() && !photo)}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: text.trim() || photo ? colors.ink : colors.track, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="arrow-up" size={20} color={text.trim() || photo ? colors.onInk : colors.textMuted} />
          </PressScale>
        </View>
      </View>

      <ActionSheet
        visible={attachOpen}
        onClose={() => setAttachOpen(false)}
        title="Show Coach a meal"
        actions={[
          { label: 'Take a photo', icon: 'camera', onPress: () => attach('camera') },
          { label: 'Choose from library', icon: 'images-outline', color: nutrientColors.fat, onPress: () => attach('library') },
        ]}
      />
    </KeyboardAvoidingView>
  );
}
