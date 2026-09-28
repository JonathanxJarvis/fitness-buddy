import React, { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, IconButton, Screen, T } from '@/components/ui';
import { useStore } from '@/store/StoreProvider';
import { cacheFood } from '@/store/session';
import { extractGtin, lookupBarcode } from '@/lib/openFoodFacts';
import { spacing, useTheme } from '@/theme';

export default function Scan() {
  const params = useLocalSearchParams<{ meal?: string; date?: string; target?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const { state } = useStore();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const busy = useRef(false);
  const [status, setStatus] = useState<'scanning' | 'looking' | 'notfound' | 'error' | 'notproduct'>('scanning');
  const [code, setCode] = useState('');

  if (!permission) return <View style={{ flex: 1, backgroundColor: '#000' }} />;

  if (!permission.granted) {
    return (
      <Screen topInset>
        <IconButton label="Close" icon="close" onPress={() => router.back()} />
        <View style={{ alignItems: 'center', marginTop: 80 }}>
          <T size={22} weight="800" center>Camera access needed</T>
          <T muted center style={{ marginVertical: spacing.lg }}>
            Fitness Buddy uses the camera only to read food barcodes. Nothing is recorded or uploaded.
          </T>
          <Button title="Allow camera" icon="camera" onPress={requestPermission} />
        </View>
      </Screen>
    );
  }

  const onScanned = async (r: BarcodeScanningResult) => {
    if (busy.current) return;
    busy.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    // QR and DataMatrix codes on newer packs carry the same product number (GS1).
    const gtin = extractGtin(r.data);
    if (!gtin) {
      setCode(r.data);
      setStatus('notproduct');
      return;
    }
    setCode(gtin);

    const custom = state.customFoods.find((f) => f.barcode === gtin);
    if (custom) return openFood(custom.id);

    setStatus('looking');
    try {
      const food = await lookupBarcode(gtin, undefined, state.settings.foodRegion);
      if (food) return openFood(cacheFood(food));
      setStatus('notfound');
    } catch {
      setStatus('error');
    }
  };

  const openFood = (foodId: string) => {
    router.replace({ pathname: '/food', params: { foodId, meal: params.meal ?? '', date: params.date ?? '', target: params.target ?? '' } });
  };

  const retry = () => {
    busy.current = false;
    setStatus('scanning');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr', 'datamatrix'] }}
        onBarcodeScanned={status === 'scanning' ? onScanned : undefined}
      />
      <View style={{ position: 'absolute', top: insets.top + 8, left: 16 }}>
        <IconButton label="Close scanner" icon="close" color="#fff" size={30} onPress={() => router.back()} />
      </View>
      <View pointerEvents="none" style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 280, height: 160, borderRadius: 18, borderWidth: 3, borderColor: colors.primary }} />
        <T color="#fff" weight="600" style={{ marginTop: spacing.lg }}>Point at a barcode or QR code</T>
      </View>
      {status !== 'scanning' && (
        <View style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 24, backgroundColor: colors.card, borderRadius: 20, padding: spacing.lg }}>
          {status === 'looking' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <ActivityIndicator color={colors.primary} />
              <T>Looking up {code}…</T>
            </View>
          )}
          {status === 'notfound' && (
            <>
              <T weight="700" size={16}>Product not found</T>
              <T muted style={{ marginVertical: spacing.sm }}>
                {code} isn’t in Open Food Facts yet. You can add it as a custom food and it will be recognized next time.
              </T>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Button small title="Scan again" variant="secondary" style={{ flex: 1 }} onPress={retry} />
                <Button
                  small
                  title="Create food"
                  style={{ flex: 1 }}
                  onPress={() => router.replace({ pathname: '/custom-food', params: { barcode: code, meal: params.meal ?? '', date: params.date ?? '', target: params.target ?? '' } })}
                />
              </View>
            </>
          )}
          {status === 'notproduct' && (
            <>
              <T weight="700" size={16}>That code isn’t a product</T>
              <T muted style={{ marginVertical: spacing.sm }} numberOfLines={3}>
                This QR code doesn’t contain a product number. Try the barcode or the GS1 QR code on the pack.
              </T>
              <Button small title="Scan again" onPress={retry} />
            </>
          )}
          {status === 'error' && (
            <>
              <T weight="700" size={16}>Couldn’t look that up</T>
              <T muted style={{ marginVertical: spacing.sm }}>Check your internet connection and try again.</T>
              <Button small title="Try again" onPress={retry} />
            </>
          )}
        </View>
      )}
    </View>
  );
}
