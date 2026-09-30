import React, { useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { T } from '@/components/ui';
import { radius, useTheme } from '@/theme';

/** Six boxes (ABC-123) backed by one invisible text field, like a verification code. */
export function CodeInput({ value, onChange, onSubmit, autoFocus }: { value: string; onChange: (v: string) => void; onSubmit?: () => void; autoFocus?: boolean }) {
  const { colors } = useTheme();
  const input = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const chars = value.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6);

  const box = (i: number) => {
    const active = focused && (i === chars.length || (i === 5 && chars.length === 6));
    return (
      <View
        key={i}
        style={{
          flex: 1,
          height: 54,
          borderRadius: radius.sm,
          backgroundColor: colors.cardAlt,
          borderWidth: 1.5,
          borderColor: active ? colors.primary : chars[i] ? colors.border : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <T size={22} weight="800">{chars[i] ?? ''}</T>
      </View>
    );
  };

  return (
    <Pressable onPress={() => input.current?.focus()} accessibilityLabel="Friend code" style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {[0, 1, 2].map(box)}
        <View style={{ width: 10, height: 2, borderRadius: 1, backgroundColor: colors.textMuted, opacity: 0.5 }} />
        {[3, 4, 5].map(box)}
      </View>
      <TextInput
        ref={input}
        value={chars}
        onChangeText={(t) => onChange(t.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSubmitEditing={onSubmit}
        autoCapitalize="characters"
        autoCorrect={false}
        autoFocus={autoFocus}
        maxLength={6}
        caretHidden
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, opacity: 0.011, color: 'transparent' }}
      />
    </Pressable>
  );
}
