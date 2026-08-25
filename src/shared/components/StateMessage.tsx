import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { brand } from '@theme/colors';
import { useTheme } from '@theme/useTheme';

/**
 * What a screen says when it has nothing to show, or could not find out.
 *
 * Both cases used to be a line of grey text, which reads as a bug either way.
 * An empty list and a failed request are different facts and deserve different
 * words — and a failure deserves a way to try again.
 */
export function StateMessage({
  icon,
  title,
  body,
  action,
  onAction,
  tone = 'quiet',
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: string;
  onAction?: () => void;
  tone?: 'quiet' | 'problem';
}) {
  const { scheme } = useTheme();
  const accent = tone === 'problem' ? scheme.danger : scheme.textMuted;

  return (
    <View style={{ alignItems: 'center', gap: 8, paddingVertical: 36, paddingHorizontal: 20 }}>
      {icon ? <View style={{ marginBottom: 2, opacity: 0.75 }}>{icon}</View> : null}
      <Text style={{ color: scheme.text, fontSize: 16, fontWeight: '600', textAlign: 'center' }}>{title}</Text>
      {body ? (
        <Text style={{ color: accent, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>{body}</Text>
      ) : null}
      {action && onAction ? (
        <Pressable
          onPress={onAction}
          // A plain object, not the ({ pressed }) => ... form: NativeWind
          // processes every style prop and drops the function, taking the whole
          // style with it — a button with no border on no background.
          style={{
            marginTop: 8,
            paddingVertical: 10,
            paddingHorizontal: 18,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: brand.deepLeaf,
          }}
        >
          <Text style={{ color: brand.deepLeaf, fontSize: 14, fontWeight: '700' }}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
