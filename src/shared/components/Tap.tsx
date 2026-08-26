import { useState } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

/**
 * A Pressable that visibly answers a tap.
 *
 * The obvious way to do this — `style={({ pressed }) => …}` — silently loses
 * every style in this app: NativeWind processes each style prop and drops the
 * function form, taking backgrounds and borders with it. So the pressed state
 * is held here and the style stays a plain array, which NativeWind understands.
 *
 * Worth having at all because a tap on a card was silent: on a good connection
 * the next screen covers that up, but in the field a request can sit for
 * seconds and a silent tap reads as a miss — so people tap again, and arrive
 * three screens deep, or file the same reading twice.
 */
export function Tap({
  style,
  children,
  ...rest
}: PressableProps & { style?: StyleProp<ViewStyle> }) {
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      {...rest}
      onPressIn={(event) => {
        setPressed(true);
        rest.onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        rest.onPressOut?.(event);
      }}
      style={[style, pressed ? { opacity: 0.62 } : null]}
    >
      {children}
    </Pressable>
  );
}
