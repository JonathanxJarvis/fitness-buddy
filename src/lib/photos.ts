import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export interface MealPhoto {
  /** ~1024 px JPEG for Claude, base64 without a data: prefix. */
  base64: string;
  /** Small JPEG data URI kept with the diary entry. */
  thumb: string;
}

async function resize(uri: string, width: number, compress: number) {
  const ctx = ImageManipulator.manipulate(uri);
  ctx.resize({ width });
  const img = await ctx.renderAsync();
  return img.saveAsync({ format: SaveFormat.JPEG, compress, base64: true });
}

/** Opens the camera or photo library and returns the photo, resized for upload. */
export async function pickMealPhoto(source: 'camera' | 'library'): Promise<MealPhoto | null> {
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error('Camera access is off. Allow it in Settings, or choose a photo from your library.');
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.85 };
  const res = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (res.canceled || !res.assets?.[0]) return null;
  const asset = res.assets[0];
  const w = Math.min(1024, asset.width || 1024);
  const [big, small] = await Promise.all([resize(asset.uri, w, 0.72), resize(asset.uri, 320, 0.6)]);
  if (!big.base64 || !small.base64) throw new Error('Couldn’t read that photo.');
  return { base64: big.base64, thumb: `data:image/jpeg;base64,${small.base64}` };
}
