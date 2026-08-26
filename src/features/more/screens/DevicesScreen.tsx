import { Alert, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Smartphone } from 'lucide-react-native';
import { errorMessage } from '@api/client';
import { BrandScreen } from '@shared/components/BrandScreen';
import { Tap } from '@shared/components/Tap';
import { QueryState } from '@shared/components/QueryState';
import { useTheme } from '@theme/useTheme';
import { fetchDevices, revokeDevice, revokeOtherDevices, type Device } from '../devices';

/**
 * Every handset signed in as this person.
 *
 * A phone that walks off a site keeps working until somebody takes the key
 * back, and until now nobody could see that the key existed. Here they can, and
 * they can cut it off from any other phone they are still holding.
 */
export function DevicesScreen() {
  const { scheme } = useTheme();
  const queryClient = useQueryClient();

  const devices = useQuery({ queryKey: ['devices'], queryFn: fetchDevices });

  const cutOff = useMutation({
    mutationFn: (id: number | 'others') => (id === 'others' ? revokeOtherDevices() : revokeDevice(id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['devices'] }),
    onError: (error) => Alert.alert('Not done', errorMessage(error, 'That handset was not cut off.')),
  });

  const confirm = (device: Device) =>
    Alert.alert(
      `Cut off ${device.name}?`,
      'That phone is signed out immediately and has to sign in again to reach anything.',
      [
        { text: 'Keep it', style: 'cancel' },
        { text: 'Cut it off', style: 'destructive', onPress: () => cutOff.mutate(device.id) },
      ],
    );

  const confirmOthers = () =>
    Alert.alert(
      'Cut off every other handset?',
      'Every phone except this one is signed out immediately.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Cut them off', style: 'destructive', onPress: () => cutOff.mutate('others') },
      ],
    );

  return (
    <BrandScreen title="Handsets" subtitle="Signed in as you">
      <ScrollView
        contentContainerStyle={{ gap: 12, paddingVertical: 18 }}
        refreshControl={
          <RefreshControl refreshing={devices.isRefetching} onRefresh={devices.refetch} tintColor={scheme.textMuted} />
        }
      >
        <QueryState
          query={devices}
          isEmpty={(value) => value.length === 0}
          emptyTitle="No handsets listed"
          emptyBody="Phones signed in as you appear here."
          skeletonRows={3}
        >
          {(list) => (
            <>
              {list.map((device) => (
                <View
                  key={device.id}
                  style={{
                    backgroundColor: scheme.surface,
                    borderColor: device.current ? scheme.accent : scheme.border,
                    borderWidth: 1,
                    borderRadius: 14,
                    padding: 15,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <Smartphone color={device.current ? scheme.accent : scheme.textMuted} size={20} />

                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ color: scheme.text, fontSize: 15, fontWeight: '600' }}>
                      {device.name}
                      {device.current ? ' · this phone' : ''}
                    </Text>
                    <Text style={{ color: scheme.textMuted, fontSize: 13 }}>{lastSeen(device)}</Text>
                  </View>

                  {device.current ? null : (
                    <Tap onPress={() => confirm(device)} hitSlop={8} disabled={cutOff.isPending}>
                      <Text style={{ color: scheme.danger, fontSize: 14, fontWeight: '600' }}>Cut off</Text>
                    </Tap>
                  )}
                </View>
              ))}

              {list.length > 1 ? (
                <Tap onPress={confirmOthers} style={{ alignItems: 'center', paddingVertical: 10 }}>
                  <Text style={{ color: scheme.danger, fontSize: 15, fontWeight: '700' }}>
                    Cut off every other handset
                  </Text>
                </Tap>
              ) : null}

              <Text style={{ color: scheme.textMuted, fontSize: 13, lineHeight: 19 }}>
                A handset that is not used for a long stretch expires on its own. Cutting one off takes
                effect at once — the phone has to sign in again to reach anything.
              </Text>
            </>
          )}
        </QueryState>
      </ScrollView>
    </BrandScreen>
  );
}

function lastSeen(device: Device): string {
  if (!device.last_used_at) {
    return 'Never used since it signed in';
  }

  const days = Math.round((Date.now() - new Date(device.last_used_at).getTime()) / 86_400_000);

  if (days <= 0) {
    return 'Used today';
  }

  return days === 1 ? 'Used yesterday' : `Last used ${days} days ago`;
}
