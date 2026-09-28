import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { IconButton, T } from '@/components/ui';
import { FadeIn, PressScale } from '@/components/motion';
import { Kettle, PETS, SKINS } from '@/components/Mascot';
import { useStore } from '@/store/StoreProvider';
import { isPro, PLANS, PREVIEW, PRO_FEATURES } from '@/lib/pro';
import { radius, spacing } from '@/theme';

const GOLD = '#FFD66B';
const INK = '#0B120E';

const REASON: Record<string, string> = {
  snap: 'Snap a meal is a Pro feature',
  coach: 'The AI coach is a Pro feature',
  friends: 'Your crew is full',
  skins: 'Outfits are a Pro feature',
  pets: 'That pet comes with Pro',
};

export default function ProScreen() {
  const { feature } = useLocalSearchParams<{ feature?: string }>();
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const pro = isPro(state);
  const [plan, setPlan] = useState<string>('yearly');
  const [note, setNote] = useState<string | null>(null);
  const [skin, setSkin] = useState(0);
  const skins = Object.keys(SKINS);

  const buy = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (__DEV__) {
      // Development builds can unlock Pro to test it; store builds use the App Store.
      dispatch({ type: 'updateSettings', settings: { pro: true } });
      setNote('Pro unlocked on this device (development build).');
      return;
    }
    setNote('Subscriptions open when the app launches on the App Store.');
  };

  return (
    <View style={{ flex: 1, backgroundColor: INK }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 140 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#1A3B2B', INK]} style={{ paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <IconButton label="Close" icon="close" color="#fff" onPress={() => router.back()} />
          </View>
          <FadeIn style={{ alignItems: 'center' }}>
            <Pressable onPress={() => setSkin((s) => s + 1)} accessibilityLabel="Show another pet">
              <Kettle species={PETS[skin % PETS.length].key} size={110} mood="proud" band={GOLD} skin={skins[skin % skins.length]} />
            </Pressable>
            <T size={11} color="rgba(255,255,255,0.5)" style={{ marginTop: 2 }}>Tap to meet the Pro pets</T>
            {feature && REASON[feature] ? (
              <T size={13} weight="700" color={GOLD} style={{ marginTop: spacing.md }}>{REASON[feature]}</T>
            ) : null}
            <T size={30} weight="800" color="#fff" center style={{ marginTop: 6 }}>
              Fitness Buddy <T size={30} weight="800" color={GOLD}>Pro</T>
            </T>
            <T size={14} color="rgba(255,255,255,0.7)" center style={{ marginTop: 6, maxWidth: 300 }}>
              Everything you need is free. Pro adds the AI, your whole crew and a little style.
            </T>
          </FadeIn>
        </LinearGradient>

        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
          {PRO_FEATURES.map((f, i) => (
            <FadeIn key={f.title} delay={80 + i * 60}>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' }}>
                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,214,107,0.14)', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={f.icon as never} size={18} color={GOLD} />
                </View>
                <View style={{ flex: 1 }}>
                  <T weight="800" color="#fff">{f.title}</T>
                  <T size={13} color="rgba(255,255,255,0.65)" style={{ marginTop: 2 }}>{f.body}</T>
                </View>
              </View>
            </FadeIn>
          ))}

          {!pro && (
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
              {PLANS.map((p) => {
                const on = plan === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => setPlan(p.id)}
                    style={{ flex: 1, borderRadius: radius.md, padding: spacing.md, borderWidth: 2, borderColor: on ? GOLD : 'rgba(255,255,255,0.12)', backgroundColor: on ? 'rgba(255,214,107,0.08)' : 'transparent' }}
                  >
                    {p.best && (
                      <View style={{ position: 'absolute', top: -10, right: 10, backgroundColor: GOLD, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <T size={10} weight="800" color={INK}>BEST VALUE</T>
                      </View>
                    )}
                    <T size={13} weight="700" color="rgba(255,255,255,0.7)">{p.label}</T>
                    <T size={22} weight="800" color="#fff">
                      {p.price}
                      <T size={12} color="rgba(255,255,255,0.6)"> {p.per}</T>
                    </T>
                    <T size={11} color="rgba(255,255,255,0.55)">{p.note}</T>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg, paddingBottom: insets.bottom + spacing.md, backgroundColor: INK }}>
        {pro ? (
          <View style={{ alignItems: 'center', gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="checkmark-circle" size={20} color={GOLD} />
              <T weight="800" color="#fff">{PREVIEW ? 'Pro is unlocked in this preview' : 'You’re Pro. Thank you!'}</T>
            </View>
            <T size={12} color="rgba(255,255,255,0.6)">Every feature above is on.</T>
          </View>
        ) : (
          <>
            <PressScale onPress={buy}>
              <LinearGradient colors={['#FFE08F', '#E9B53A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.pill, paddingVertical: 15, alignItems: 'center' }}>
                <T weight="800" size={16} color={INK}>{plan === 'yearly' ? 'Start 7-day free trial' : 'Get Pro monthly'}</T>
              </LinearGradient>
            </PressScale>
            <T size={11} color="rgba(255,255,255,0.5)" center style={{ marginTop: 8 }}>
              {note ?? 'Billed through your App Store account. Cancel anytime in Settings.'}
            </T>
          </>
        )}
      </View>
    </View>
  );
}
