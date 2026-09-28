import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Badge, Button, Card, Chip, CountUp, IconButton, IconTile, Stepper, T } from '@/components/ui';
import { FadeIn, nativeDriver } from '@/components/motion';
import { HealthScoreCard } from '@/components/HealthScore';
import { mealForNow } from '@/components/TabBar';
import { useStore } from '@/store/StoreProvider';
import { uid } from '@/store/reducer';
import { estimateMeal, estimateToFood, friendlyError, MissingKeyError, type MealEstimate } from '@/lib/ai';
import { getApiKey } from '@/lib/secrets';
import { pickMealPhoto, type MealPhoto } from '@/lib/photos';
import { healthScore, scaleNutrients } from '@/lib/nutrition';
import { todayKey } from '@/lib/dates';
import { font, nutrientColors, radius, spacing, useTheme } from '@/theme';
import { MEALS, type MealType } from '@/lib/types';

type Phase = 'pick' | 'analyzing' | 'result' | 'error';

/** A clearly labeled example, so the flow can be tried before adding an API key. */
const SAMPLE: MealEstimate = {
  isFood: true,
  name: 'Steak with side salad (sample)',
  items: [
    { name: 'Sirloin steak', grams: 170, calories: 330, protein: 44, carbs: 0, fat: 17 },
    { name: 'Mixed greens & tomato', grams: 120, calories: 30, protein: 2, carbs: 6, fat: 0.3 },
    { name: 'Olive-oil vinaigrette', grams: 15, calories: 90, protein: 0, carbs: 1, fat: 10 },
    { name: 'Roasted baby potatoes', grams: 100, calories: 90, protein: 2, carbs: 20, fat: 0.2 },
  ],
  totals: { calories: 540, protein: 48, carbs: 27, fat: 27.5, fiber: 5, sugar: 4, sodium: 480 },
  confidence: 'medium',
  notes: 'Sample result for trying the flow. Add your Claude API key in Profile to analyze your own photos.',
};

function Scanner({ uri }: { uri: string }) {
  const { colors } = useTheme();
  const line = useRef(new Animated.Value(0)).current;
  const [h, setH] = useState(300);
  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(line, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: nativeDriver }),
        Animated.timing(line, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: nativeDriver }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [line]);
  return (
    <View onLayout={(e) => setH(e.nativeEvent.layout.height)} style={{ borderRadius: 28, overflow: 'hidden', aspectRatio: 1, width: '100%' }}>
      <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(8,30,20,0.25)' }]} />
      <Animated.View style={{ position: 'absolute', left: 0, right: 0, height: 80, transform: [{ translateY: line.interpolate({ inputRange: [0, 1], outputRange: [-40, h - 40] }) }] }}>
        <LinearGradient colors={['transparent', colors.primary + '66', 'transparent']} style={{ flex: 1 }} />
        <View style={{ position: 'absolute', top: 39, left: 0, right: 0, height: 2, backgroundColor: '#B9F6D2' }} />
      </Animated.View>
      {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
        <View
          key={c}
          style={{
            position: 'absolute',
            width: 34,
            height: 34,
            borderColor: '#fff',
            [c[0] === 't' ? 'top' : 'bottom']: 16,
            [c[1] === 'l' ? 'left' : 'right']: 16,
            borderTopWidth: c[0] === 't' ? 3 : 0,
            borderBottomWidth: c[0] === 'b' ? 3 : 0,
            borderLeftWidth: c[1] === 'l' ? 3 : 0,
            borderRightWidth: c[1] === 'r' ? 3 : 0,
            borderRadius: 6,
          }}
        />
      ))}
    </View>
  );
}

function Tile({ icon, label, value, unit, color, delay }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: number; unit: string; color: string; delay: number }) {
  const { colors } = useTheme();
  return (
    <FadeIn delay={delay} style={{ width: '48%', marginBottom: spacing.md }}>
      <View style={{ backgroundColor: colors.card, borderRadius: 20, padding: 14, gap: 10, borderWidth: 1, borderColor: colors.border }}>
        <IconTile icon={icon} color={color} size={36} />
        <View>
          <T size={12} muted weight="600">{label}</T>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
            <CountUp value={value} size={22} weight="800" delay={delay} />
            <T size={13} muted weight="600">{unit}</T>
          </View>
        </View>
      </View>
    </FadeIn>
  );
}

export default function SnapMeal() {
  const params = useLocalSearchParams<{ meal?: string; date?: string }>();
  const { dispatch } = useStore();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>('pick');
  const [photo, setPhoto] = useState<MealPhoto | null>(null);
  const [hint, setHint] = useState('');
  const [est, setEst] = useState<MealEstimate | null>(null);
  const [sample, setSample] = useState(false);
  const [error, setError] = useState<{ text: string; needsKey: boolean } | null>(null);
  const [portion, setPortion] = useState(1);
  const [name, setName] = useState('');
  const [meal, setMeal] = useState<MealType>((MEALS.find((m) => m.key === params.meal)?.key ?? mealForNow()) as MealType);
  const [hasKey, setHasKey] = useState(true);
  const date = params.date || todayKey();

  useEffect(() => {
    getApiKey().then((k) => setHasKey(!!k));
  }, []);

  const analyze = async (p: MealPhoto) => {
    setPhase('analyzing');
    setError(null);
    try {
      const r = await estimateMeal(p.base64, hint.trim() || undefined);
      if (!r.isFood || r.items.length === 0) {
        setError({ text: 'That doesn’t look like food. Try another photo with the whole plate in view.', needsKey: false });
        setPhase('error');
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setEst(r);
      setName(r.name);
      setPortion(1);
      setPhase('result');
    } catch (e) {
      setError({ text: friendlyError(e), needsKey: e instanceof MissingKeyError });
      setPhase('error');
    }
  };

  const take = async (source: 'camera' | 'library') => {
    try {
      const p = await pickMealPhoto(source);
      if (!p) return;
      setPhoto(p);
      setSample(false);
      analyze(p);
    } catch (e) {
      setError({ text: friendlyError(e), needsKey: false });
      setPhase('error');
    }
  };

  const showSample = () => {
    setSample(true);
    setPhoto(null);
    setEst(SAMPLE);
    setName(SAMPLE.name);
    setPortion(1);
    setPhase('result');
  };

  const log = () => {
    if (!est) return;
    const food = { ...estimateToFood({ ...est, name: name.trim() || est.name }, uid()) };
    dispatch({
      type: 'addEntries',
      entries: [{ id: uid(), date, meal, food, servingIndex: 0, quantity: portion, createdAt: Date.now(), photo: photo?.thumb }],
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.dismissTo('/');
  };

  const askCoach = () => {
    if (!est) return;
    const n = scaleNutrients(est.totals, portion);
    const prompt = `I'm about to eat ${name || est.name} (about ${Math.round(n.calories)} kcal, ${Math.round(n.protein)} g protein, ${Math.round(n.carbs)} g carbs, ${Math.round(n.fat)} g fat). How does it fit my day, and what would you change?`;
    router.dismissTo({ pathname: '/coach', params: { prompt } });
  };

  const close = (
    <Pressable accessibilityLabel="Close" onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="close" size={22} color="#fff" />
    </Pressable>
  );

  // ------------------------------------------------------------ pick
  if (phase === 'pick' || phase === 'analyzing' || phase === 'error') {
    return (
      <LinearGradient colors={colors.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl, paddingHorizontal: spacing.lg }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl }}>
            {close}
            <View style={{ flex: 1 }} />
            <Badge label="AI · CLAUDE" color="#fff" icon="sparkles" />
          </View>

          {phase === 'analyzing' && photo ? (
            <FadeIn>
              <Scanner uri={photo.thumb} />
              <T size={24} weight="800" color="#fff" center style={{ marginTop: spacing.xl }}>Analyzing your meal…</T>
              <T size={14} color="rgba(255,255,255,0.75)" center style={{ marginTop: 6 }}>
                Identifying each food, estimating portions and nutrition.
              </T>
            </FadeIn>
          ) : (
            <FadeIn style={{ flex: 1 }}>
              <View style={{ alignItems: 'center', marginTop: spacing.lg }}>
                <View style={{ width: 120, height: 120, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="camera" size={54} color="#fff" />
                </View>
                <T size={30} weight="800" color="#fff" center style={{ marginTop: spacing.xl }}>Snap your meal</T>
                <T size={15} color="rgba(255,255,255,0.8)" center style={{ marginTop: spacing.sm, maxWidth: 320 }}>
                  Take a photo of your plate and AI estimates calories, protein, carbs and fat for each food it sees.
                </T>
              </View>

              {phase === 'error' && error && (
                <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: radius.md, padding: spacing.md, marginTop: spacing.xl, flexDirection: 'row', gap: 10 }}>
                  <Ionicons name="alert-circle" size={20} color="#FFD29A" />
                  <T size={14} color="#fff" style={{ flex: 1 }}>{error.text}</T>
                </View>
              )}

              <View style={{ marginTop: spacing.xl, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: radius.md, paddingHorizontal: spacing.md }}>
                <TextInput
                  value={hint}
                  onChangeText={setHint}
                  placeholder="Optional details, e.g. “cooked in butter, large bowl”"
                  placeholderTextColor="rgba(255,255,255,0.55)"
                  style={{ color: '#fff', fontSize: 15, paddingVertical: 14, ...font('500') }}
                />
              </View>

              <View style={{ flex: 1, minHeight: spacing.xl }} />
              {error?.needsKey || !hasKey ? (
                <>
                  <Pressable onPress={() => router.push('/profile')} style={{ backgroundColor: '#fff', borderRadius: radius.pill, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="key-outline" size={20} color={colors.hero[1]} />
                    <T weight="800" color={colors.hero[1]}>Add Claude API key</T>
                  </Pressable>
                  <Pressable onPress={showSample} style={{ paddingVertical: 14, alignItems: 'center' }}>
                    <T weight="700" color="#fff">See a sample result</T>
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable onPress={() => take('camera')} style={{ backgroundColor: '#fff', borderRadius: radius.pill, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="camera" size={20} color={colors.hero[1]} />
                    <T weight="800" color={colors.hero[1]}>{phase === 'error' ? 'Try another photo' : 'Take photo'}</T>
                  </Pressable>
                  <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                    <Pressable onPress={() => take('library')} style={{ flex: 1, borderRadius: radius.pill, paddingVertical: 15, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' }}>
                      <T weight="700" color="#fff">Choose from library</T>
                    </Pressable>
                    {phase === 'error' && photo && !error?.needsKey && (
                      <Pressable onPress={() => analyze(photo)} style={{ flex: 1, borderRadius: radius.pill, paddingVertical: 15, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' }}>
                        <T weight="700" color="#fff">Retry</T>
                      </Pressable>
                    )}
                  </View>
                </>
              )}
            </FadeIn>
          )}
        </ScrollView>
      </LinearGradient>
    );
  }

  // ------------------------------------------------------------ result
  const e = est!;
  const n = scaleNutrients(e.totals, portion);
  const score = healthScore(n);
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 110 }} showsVerticalScrollIndicator={false}>
        <View style={{ height: 300 }}>
          {photo ? (
            <Image source={{ uri: photo.thumb }} style={{ width: '100%', height: '100%' }} />
          ) : (
            <LinearGradient colors={colors.hero} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="restaurant" size={72} color="rgba(255,255,255,0.85)" />
            </LinearGradient>
          )}
          <LinearGradient colors={['rgba(0,0,0,0.35)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 110 }} />
          <View style={{ position: 'absolute', top: insets.top + spacing.sm, left: spacing.lg, right: spacing.lg, flexDirection: 'row', justifyContent: 'space-between' }}>
            {close}
            <Pressable accessibilityLabel="Retake" onPress={() => setPhase('pick')} style={{ height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.35)', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="camera-reverse" size={18} color="#fff" />
              <T size={13} weight="700" color="#fff">Retake</T>
            </Pressable>
          </View>
        </View>

        <View style={{ marginTop: -28, backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: spacing.lg }}>
          <FadeIn>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: spacing.sm }}>
              <Badge label={sample ? 'SAMPLE' : 'AI ESTIMATE'} color={colors.primary} icon="sparkles" />
              <Badge label={`${e.confidence.toUpperCase()} CONFIDENCE`} color={e.confidence === 'high' ? colors.primary : e.confidence === 'medium' ? nutrientColors.fat : colors.warning} />
            </View>
            <TextInput value={name} onChangeText={setName} style={{ color: colors.text, fontSize: 24, ...font('800'), padding: 0, letterSpacing: -0.5 }} multiline />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.md }}>
              {MEALS.map((m) => (
                <Chip key={m.key} label={m.label} active={meal === m.key} onPress={() => setMeal(m.key)} />
              ))}
            </View>
          </FadeIn>

          <T size={17} weight="800" style={{ marginTop: spacing.md, marginBottom: spacing.md }}>Nutritional breakdown</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <Tile icon="flame" label="Calories" value={Math.round(n.calories)} unit="kcal" color={nutrientColors.calories} delay={60} />
            <Tile icon="barbell" label="Protein" value={Math.round(n.protein)} unit="g" color={nutrientColors.protein} delay={120} />
            <Tile icon="flash" label="Carbs" value={Math.round(n.carbs)} unit="g" color={nutrientColors.carbs} delay={180} />
            <Tile icon="water" label="Fat" value={Math.round(n.fat)} unit="g" color={nutrientColors.fat} delay={240} />
          </View>

          <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <T weight="800">Portion</T>
              <T size={12} muted>{portion === 1 ? 'As pictured' : `${portion}× the pictured plate`}</T>
            </View>
            <Stepper value={portion} onChange={(v) => setPortion(Math.max(0.25, v))} step={0.25} min={0.25} />
          </Card>

          {score && <HealthScoreCard score={score} />}

          <Card>
            <T weight="800" style={{ marginBottom: spacing.sm }}>What we spotted</T>
            {e.items.map((it, i) => (
              <FadeIn key={it.name + i} delay={300 + i * 60} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: [nutrientColors.calories, nutrientColors.protein, nutrientColors.carbs, nutrientColors.fat][i % 4] }} />
                <View style={{ flex: 1 }}>
                  <T weight="700">{it.name}</T>
                  <T size={12} muted>
                    ~{Math.round(it.grams * portion)} g · P {Math.round(it.protein * portion)} · C {Math.round(it.carbs * portion)} · F {Math.round(it.fat * portion)}
                  </T>
                </View>
                <T weight="800">{Math.round(it.calories * portion)}</T>
              </FadeIn>
            ))}
            {e.notes ? (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing.sm, backgroundColor: colors.cardAlt, borderRadius: 12, padding: 10 }}>
                <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
                <T size={13} muted style={{ flex: 1 }}>{e.notes}</T>
              </View>
            ) : null}
          </Card>

          <Pressable onPress={askCoach} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 20, padding: spacing.lg, borderWidth: 1, borderColor: colors.border }}>
            <IconTile icon="chatbubbles" color={nutrientColors.protein} size={40} />
            <View style={{ flex: 1 }}>
              <T weight="800">Ask Coach about this meal</T>
              <T size={12} muted>How it fits your day, and smarter swaps</T>
            </View>
            <IconButton label="Ask Coach" icon="arrow-forward" color={colors.textMuted} onPress={askCoach} />
          </Pressable>
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.lg, paddingBottom: insets.bottom + spacing.md, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border }}>
        <Button title={`Add ${Math.round(n.calories)} kcal to ${MEALS.find((m) => m.key === meal)!.label.toLowerCase()}`} icon="add-circle" onPress={log} />
      </View>
    </View>
  );
}
