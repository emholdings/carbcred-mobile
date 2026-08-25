import { Pressable, ScrollView, Text, View } from 'react-native';
import { ChevronRight, Droplets, Sprout } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BrandScreen } from '@shared/components/BrandScreen';
import type { CaptureStackParamList } from '@navigation/types';
import { brand } from '@theme/colors';
import { useTheme } from '@theme/useTheme';
import { QueueStatus } from '../components/QueueStatus';
import { KIND_LABELS } from '../types';
import { useQueueStore } from '../queue';

type Props = NativeStackScreenProps<CaptureStackParamList, 'CaptureMenu'>;

/**
 * What can be filed from here. The daily wash sits first because it is the one
 * thing owed every single day, whether or not anything else happened.
 */
export function CaptureMenuScreen({ navigation }: Props) {
  const { scheme } = useTheme();
  const items = useQueueStore((state) => state.items);
  const retry = useQueueStore((state) => state.retry);

  return (
    <BrandScreen title="Capture" subtitle="Saved on the phone first">
      <ScrollView contentContainerStyle={{ gap: 12, paddingVertical: 18 }}>
        <QueueStatus />

        <Option
          icon={<Droplets color={brand.deepLeaf} size={22} />}
          title="Daily wash reading"
          hint="Tonnes, hours run, downtime — owed every day"
          onPress={() => navigation.navigate('DailyWash')}
        />
        <Option
          icon={<Sprout color={brand.deepLeaf} size={22} />}
          title="Field submission"
          hint="Planting, survival check, monitoring, incident"
          onPress={() => navigation.navigate('FieldSubmission')}
        />

        {items.length > 0 ? (
          <View style={{ gap: 8, marginTop: 8 }}>
            <Text style={{ color: scheme.text, fontSize: 17, fontWeight: '700' }}>On this phone</Text>
            {items.map((item) => (
              <View
                key={item.payload.client_ref}
                style={{
                  backgroundColor: scheme.surface,
                  borderColor: item.status === 'failed' ? scheme.danger : scheme.border,
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 13,
                  gap: 3,
                }}
              >
                <Text style={{ color: scheme.text, fontSize: 15, fontWeight: '600' }}>
                  {KIND_LABELS[item.kind]}
                  <Text style={{ color: scheme.textMuted, fontWeight: '400' }}> · {item.context}</Text>
                </Text>
                <Text style={{ color: scheme.textMuted, fontSize: 12 }}>
                  {item.status === 'sending'
                    ? 'Sending…'
                    : item.status === 'failed'
                      ? item.lastError
                      : 'Waiting for signal'}
                </Text>
                {item.status === 'failed' ? (
                  <Pressable onPress={() => retry(item.payload.client_ref)}>
                    <Text style={{ color: brand.deepLeaf, fontSize: 13, fontWeight: '700', marginTop: 2 }}>
                      Try again
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </BrandScreen>
  );
}

function Option({
  icon,
  title,
  hint,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  onPress: () => void;
}) {
  const { scheme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: scheme.surface,
        borderColor: scheme.border,
        borderWidth: 1,
        borderRadius: 14,
        padding: 16,
      }}
    >
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={{ color: scheme.text, fontSize: 16, fontWeight: '600' }}>{title}</Text>
        <Text style={{ color: scheme.textMuted, fontSize: 13 }}>{hint}</Text>
      </View>
      <ChevronRight color={scheme.textMuted} size={20} />
    </Pressable>
  );
}
