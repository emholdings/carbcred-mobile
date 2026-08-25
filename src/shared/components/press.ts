import type { StyleProp, ViewStyle } from 'react-native';

/** How far a surface dims while a finger is on it. */
const PRESSED: ViewStyle = { opacity: 0.62 };

/**
 * The feedback every tappable surface gives.
 *
 * Without it a tap on a card is silent: nothing moves until the next screen
 * arrives, and on a bad connection — which is most of the time in the field —
 * people tap again, and again, and end up three screens deep or filing the
 * same reading twice. One dim, the same everywhere, so a tap is always seen to
 * have landed.
 *
 * Written as a wrapper around the style rather than a component so a Pressable
 * keeps its own layout exactly as it was.
 */
export function press(style?: StyleProp<ViewStyle>) {
  return ({ pressed }: { pressed: boolean }): StyleProp<ViewStyle> => [style, pressed ? PRESSED : null];
}
