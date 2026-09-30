import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/**
 * Lets the user pick a square profile photo and returns it as a small JPEG
 * data URI (so it survives cache clears). Photos stay on this phone: the
 * friends server has no image storage, so friends see the illustrated avatar.
 */
export async function pickProfilePhoto(): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.9 });
  if (res.canceled || !res.assets?.[0]) return null;
  const ctx = ImageManipulator.manipulate(res.assets[0].uri);
  ctx.resize({ width: 320 });
  const img = await ctx.renderAsync();
  const out = await img.saveAsync({ format: SaveFormat.JPEG, compress: 0.72, base64: true });
  if (!out.base64) throw new Error('Couldn’t read that photo.');
  return `data:image/jpeg;base64,${out.base64}`;
}
