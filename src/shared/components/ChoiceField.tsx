import { Pressable, Text, View } from 'react-native';
import { brand } from '@theme/colors';
import { useTheme } from '@theme/useTheme';

export type Choice = { value: string; label: string };

/**
 * One of a fixed set, chosen by tapping.
 *
 * The choices come from the server, which is the point: a role typed by hand is
 * a role that never groups with the others, and a register full of "eco ranger",
 * "Eco-Ranger" and "ranger" cannot answer how many rangers were on the ground.
 * Everything is visible at once — no picker to open, no wheel to spin, which
 * matters when this is done standing up.
 */
export function ChoiceField({
  label,
  choices,
  value,
  onChange,
}: {
  label: string;
  choices: Choice[];
  value: string;
  onChange: (next: string) => void;
}) {
  const { scheme } = useTheme();

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: scheme.textMuted, fontSize: 13, fontWeight: '600' }}>{label}</Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {choices.map((choice) => {
          const chosen = choice.value === value;

          return (
            <Pressable
              key={choice.value}
              onPress={() => onChange(choice.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: chosen }}
              style={{
                backgroundColor: chosen ? brand.deepLeaf : scheme.surface,
                borderColor: chosen ? brand.deepLeaf : scheme.border,
                borderWidth: 1,
                borderRadius: 20,
                paddingVertical: 9,
                paddingHorizontal: 14,
              }}
            >
              <Text
                style={{
                  color: chosen ? brand.cream : scheme.text,
                  fontSize: 14,
                  fontWeight: chosen ? '700' : '500',
                }}
              >
                {choice.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
