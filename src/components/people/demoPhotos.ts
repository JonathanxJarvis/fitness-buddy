import type { ImageSourcePropType } from 'react-native';
import { DEMO } from '@/lib/social';

/**
 * Stock photos for the demo friends, so the preview looks like a real
 * friends list. Only used while the social server isn't connected (DEMO);
 * real friends show their own avatar. Sources: Flowbite and MUI docs sample
 * avatars (MIT-licensed repos). Remove before shipping if unwanted.
 */
const PHOTOS: Record<string, ImageSourcePropType> = {
  LENA26: require('@/assets/demo/lena.jpg'),
  MRC777: require('@/assets/demo/marco.jpg'),
  AISHA1: require('@/assets/demo/aisha.jpg'),
  TOMFIT: require('@/assets/demo/tom.jpg'),
  SOFIA9: require('@/assets/demo/sofia.jpg'),
};

export function demoPhoto(code?: string): ImageSourcePropType | undefined {
  return DEMO && code ? PHOTOS[code.toUpperCase()] : undefined;
}
