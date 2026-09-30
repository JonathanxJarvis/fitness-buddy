import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEY = 'fitness-buddy.anthropic-key';

/**
 * The Claude API key lives in the phone's secure keychain/keystore. On web
 * (preview only) there is no keychain, so it falls back to localStorage.
 */
export async function getApiKey(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(KEY) ?? null;
    return await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

export async function setApiKey(value: string | null): Promise<void> {
  const v = value?.trim();
  if (Platform.OS === 'web') {
    try {
      if (v) globalThis.localStorage?.setItem(KEY, v);
      else globalThis.localStorage?.removeItem(KEY);
    } catch {}
    return;
  }
  if (v) await SecureStore.setItemAsync(KEY, v);
  else await SecureStore.deleteItemAsync(KEY);
}

export function maskKey(k: string): string {
  return k.length > 12 ? `${k.slice(0, 7)}…${k.slice(-4)}` : '••••';
}
