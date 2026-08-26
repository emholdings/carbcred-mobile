import { ActivityIndicator, Text, View } from 'react-native';
import { CloudOff, TriangleAlert, Check } from 'lucide-react-native';
import { useIsOnline } from '@shared/hooks/useIsOnline';
import { useTheme } from '@theme/useTheme';
import { useQueueStore } from '../queue';

/**
 * What the queue is doing right now, in one line.
 *
 * An officer who has just filed six submissions in a valley needs to know they
 * are held, not lost — and needs to see them leave when signal returns. Silence
 * is the one thing this must never be.
 */
export function QueueStatus() {
  const { scheme } = useTheme();
  const online = useIsOnline();
  const items = useQueueStore((state) => state.items);
  const draining = useQueueStore((state) => state.isDraining);

  const failed = items.filter((item) => item.status === 'failed' && item.lastError);
  const waiting = items.length;

  if (waiting === 0 && online) {
    return null;
  }

  const tone = failed.length > 0 ? scheme.danger : online ? scheme.accent : scheme.textMuted;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: scheme.surface,
        borderColor: tone,
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
      }}
    >
      {draining ? (
        <ActivityIndicator size="small" color={tone} />
      ) : failed.length > 0 ? (
        <TriangleAlert color={tone} size={18} />
      ) : online ? (
        <Check color={tone} size={18} />
      ) : (
        <CloudOff color={tone} size={18} />
      )}

      <View style={{ flex: 1 }}>
        <Text style={{ color: scheme.text, fontSize: 14, fontWeight: '600' }}>
          {draining
            ? 'Sending…'
            : !online
              ? `Offline — ${waiting} held on this phone`
              : failed.length > 0
                ? `${failed.length} need attention`
                : `${waiting} waiting to send`}
        </Text>
        <Text style={{ color: scheme.textMuted, fontSize: 13 }}>
          {failed.length > 0
            ? failed[0].lastError
            : !online
              ? 'They upload by themselves as soon as there is signal.'
              : 'Nothing is lost — these are saved on the phone.'}
        </Text>
      </View>
    </View>
  );
}
