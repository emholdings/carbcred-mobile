import { Pressable, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { brand } from '@theme/colors';
import { useTheme } from '@theme/useTheme';

/** Today, as the server writes dates. */
export function today(): string {
  return toKey(new Date());
}

function toKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function shift(key: string, days: number): string {
  const [year, month, day] = key.split('-').map(Number);
  const moved = new Date(year, month - 1, day + days);

  return toKey(moved);
}

function spoken(key: string): string {
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

/**
 * Which day a log belongs to.
 *
 * A day at a time, in both directions, rather than a calendar: the register is
 * almost always today's and occasionally yesterday's — somebody writing up a
 * shift after the fact, or catching up a day with no signal. The future is not
 * offered because the server refuses it, and a control that offers a date the
 * server will reject is a control that lies.
 */
export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const { scheme } = useTheme();
  const now = today();
  const isToday = value === now;

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: scheme.textMuted, fontSize: 13, fontWeight: '600' }}>{label}</Text>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: scheme.surface,
          borderWidth: 1,
          borderColor: scheme.border,
          borderRadius: 12,
          paddingHorizontal: 6,
          paddingVertical: 6,
          gap: 4,
        }}
      >
        <Step icon={<ChevronLeft color={scheme.text} size={20} />} onPress={() => onChange(shift(value, -1))} label="Day before" />

        <View style={{ flex: 1, alignItems: 'center', gap: 1 }}>
          <Text style={{ color: scheme.text, fontSize: 16, fontWeight: '600' }}>
            {isToday ? 'Today' : spoken(value)}
          </Text>
          <Text style={{ color: scheme.textMuted, fontSize: 12, fontVariant: ['tabular-nums'] }}>{value}</Text>
        </View>

        <Step
          icon={<ChevronRight color={isToday ? scheme.border : scheme.text} size={20} />}
          onPress={() => (isToday ? undefined : onChange(shift(value, 1)))}
          label="Day after"
          disabled={isToday}
        />
      </View>

      {isToday ? null : (
        <Pressable onPress={() => onChange(now)} hitSlop={8} style={{ alignSelf: 'flex-start' }}>
          <Text style={{ color: brand.deepLeaf, fontSize: 13, fontWeight: '600' }}>Back to today</Text>
        </Pressable>
      )}
    </View>
  );
}

function Step({
  icon,
  onPress,
  label,
  disabled = false,
}: {
  icon: React.ReactNode;
  onPress: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
    >
      {icon}
    </Pressable>
  );
}
