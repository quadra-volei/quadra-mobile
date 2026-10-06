// NativeWind v4 only wires `className` → `style` onto React Native core
// components. Third-party components like `expo-image`'s <Image> are NOT
// registered, so `className` sizing (h-*/w-*/rounded-*) produces no style and
// the image collapses to 0×0 — rendering nothing (see `Avatar`, and the home
// `MatchCardCompact` avatar stack). Registering it once here maps `className`
// onto its `style` prop app-wide. Imported for its side effect from the root
// layout, before any screen mounts.
//
// This is the interop NativeWind documents for expo-image specifically.
import { Image } from 'expo-image';
import { cssInterop } from 'nativewind';

cssInterop(Image, { className: 'style' });
