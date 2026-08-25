import { Text, View } from 'react-native';
import Svg, { G, Line, Rect } from 'react-native-svg';
import { brand } from '@theme/colors';
import { useTheme } from '@theme/useTheme';

export type Bar = { label: string; actual: number; expected: number | null };

/**
 * Actual against expected, one pair of bars a day.
 *
 * Expected is drawn as a hollow outline behind the solid actual, so the gap
 * between them is the thing you see — which is the only question a wash-plant
 * chart is ever asked. No axis labels: at this size they cost more room than
 * they return, and the numbers that matter are called out beneath.
 *
 * A bar can be tapped. On a phone there is no hover and no tooltip, so a chart
 * that cannot be interrogated is only ever a shape — the day you are squinting
 * at is the day you want the numbers for. The whole slot is the target, not the
 * bar: a thin bar on a bad day is the hardest one to hit and the most likely to
 * be asked about.
 */
export function BarChart({
  bars,
  height = 120,
  selected = null,
  onSelect,
}: {
  bars: Bar[];
  height?: number;
  selected?: number | null;
  onSelect?: (index: number) => void;
}) {
  const { scheme } = useTheme();

  if (bars.length === 0) {
    return <Text style={{ color: scheme.textMuted, fontSize: 14 }}>No readings yet.</Text>;
  }

  const peak = Math.max(...bars.flatMap((bar) => [bar.actual, bar.expected ?? 0]), 1);
  const slot = 100 / bars.length;
  const barWidth = slot * 0.52;

  return (
    <View style={{ gap: 6 }}>
      <Svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
        {/* The floor, so short bars still read as bars. */}
        <Line x1="0" y1={height - 1} x2="100" y2={height - 1} stroke={scheme.border} strokeWidth="1" />

        {bars.map((bar, index) => {
          const x = index * slot + (slot - barWidth) / 2;
          const actualHeight = Math.max((bar.actual / peak) * (height - 6), 1);
          const expectedHeight = bar.expected ? Math.max((bar.expected / peak) * (height - 6), 1) : 0;
          const chosen = selected === index;

          return (
            <G key={bar.label + index} onPress={onSelect ? () => onSelect(index) : undefined}>
              {/* The whole column takes the tap, not just the drawn bar. */}
              <Rect x={index * slot} y={0} width={slot} height={height} fill="transparent" />

              {bar.expected ? (
                <Rect
                  x={x}
                  y={height - 1 - expectedHeight}
                  width={barWidth}
                  height={expectedHeight}
                  fill="none"
                  stroke={brand.deepLeaf}
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  rx="1"
                />
              ) : null}

              <Rect
                x={x}
                y={height - 1 - actualHeight}
                width={barWidth}
                height={actualHeight}
                fill={chosen ? brand.deepLeaf : brand.leaf}
                rx="1"
              />
            </G>
          );
        })}
      </Svg>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: scheme.textMuted, fontSize: 11 }}>{bars[0].label}</Text>
        <Text style={{ color: scheme.textMuted, fontSize: 11 }}>{bars[bars.length - 1].label}</Text>
      </View>
    </View>
  );
}
