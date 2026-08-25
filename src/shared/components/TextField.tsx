import { Text, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '@theme/useTheme';

type Props = TextInputProps & {
  label: string;
  /** The server's own words for what is wrong with this field. */
  error?: string;
  /**
   * A box for prose rather than a value. Findings and complaints are written in
   * sentences, and a single line that scrolls sideways hides what was said
   * from the person writing it.
   */
  tall?: boolean;
};

export function TextField({ label, error, tall = false, ...input }: Props) {
  const { scheme } = useTheme();

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: scheme.textMuted, fontSize: 13, fontWeight: '600' }}>{label}</Text>
      <TextInput
        {...input}
        multiline={tall || input.multiline}
        placeholderTextColor={scheme.textMuted}
        style={[
          {
            backgroundColor: scheme.surface,
            borderWidth: 1,
            borderColor: error ? scheme.danger : scheme.border,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 13,
            color: scheme.text,
            fontSize: 16,
          },
          tall ? { minHeight: 150, textAlignVertical: 'top', lineHeight: 22 } : null,
          input.style,
        ]}
      />
      {error ? <Text style={{ color: scheme.danger, fontSize: 13 }}>{error}</Text> : null}
    </View>
  );
}
