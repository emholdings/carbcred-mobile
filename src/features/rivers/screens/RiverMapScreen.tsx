import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BrandScreen } from '@shared/components/BrandScreen';
import { Tap } from '@shared/components/Tap';
import { LoadState } from '@shared/components/QueryState';
import { fetchSites, type SiteRow } from '@features/sites/api';
import type { RiversStackParamList } from '@navigation/types';
import { useAuthStore } from '@stores/authStore';
import { brand } from '@theme/colors';
import { useTheme } from '@theme/useTheme';
import { fetchRivers } from '../api';

type Props = NativeStackScreenProps<RiversStackParamList, 'RiverMap'>;

/**
 * The programme's geography in one view: every approved river drawn along its
 * authorised reach, and every site the caller can see placed on it.
 *
 * Rivers are always this blue — the same value the web maps use — so a reach is
 * recognisable wherever it appears. Tapping a site says who is allocated to it
 * and opens the site.
 */
export function RiverMapScreen({ navigation }: Props) {
  const { scheme } = useTheme();
  const slug = useAuthStore((state) => state.organisationSlug);
  const [selected, setSelected] = useState<SiteRow | null>(null);

  const rivers = useQuery({ queryKey: ['rivers'], queryFn: fetchRivers, staleTime: 24 * 60 * 60 * 1000 });
  const sites = useQuery({
    queryKey: ['sites', slug],
    queryFn: () => fetchSites(slug!),
    enabled: Boolean(slug),
  });

  const located = useMemo(
    () => (sites.data ?? []).filter((site) => site.latitude !== null && site.longitude !== null),
    [sites.data],
  );

  // Frame the whole programme: every reach boundary and every site.
  const region = useMemo(() => {
    const points = [
      ...(rivers.data ?? []).flatMap((river) => [river.start, river.end]),
      ...located.map((site) => ({ lat: site.latitude as number, lng: site.longitude as number })),
    ];

    if (points.length === 0) {
      return { latitude: -19, longitude: 30, latitudeDelta: 8, longitudeDelta: 8 };
    }

    const lats = points.map((point) => point.lat);
    const lngs = points.map((point) => point.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(maxLat - minLat, 0.5) * 1.4,
      longitudeDelta: Math.max(maxLng - minLng, 0.5) * 1.4,
    };
  }, [rivers.data, located]);

  return (
    <BrandScreen title="The programme" subtitle={`${rivers.data?.length ?? 0} rivers · ${located.length} sites`}>
      <View style={{ flex: 1, paddingVertical: 14, gap: 12 }}>
        {rivers.data === undefined ? (
          <LoadState query={rivers} rows={3} />
        ) : (
          <View style={{ flex: 1, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: scheme.border }}>
            <MapView provider={PROVIDER_DEFAULT} style={{ flex: 1 }} initialRegion={region}>
              {rivers.data?.map((river) => (
                <Polyline
                  key={river.id}
                  coordinates={[
                    { latitude: river.start.lat, longitude: river.start.lng },
                    { latitude: river.end.lat, longitude: river.end.lng },
                  ]}
                  strokeColor={river.color}
                  strokeWidth={4}
                />
              ))}

              {located.map((site) => (
                <Marker
                  key={site.id}
                  coordinate={{ latitude: site.latitude as number, longitude: site.longitude as number }}
                  title={site.name}
                  description={site.operator ? `Operated by ${site.operator}` : 'Not yet allocated'}
                  pinColor={site.operator ? brand.deepLeaf : '#f5a524'}
                  onPress={() => setSelected(site)}
                />
              ))}
            </MapView>
          </View>
        )}

        {selected ? (
          <Tap
            onPress={() => navigation.navigate('SiteDetail', { siteId: selected.id, name: selected.name })}
            style={{
              backgroundColor: scheme.surface,
              borderColor: scheme.border,
              borderWidth: 1,
              borderRadius: 14,
              padding: 14,
              gap: 3,
            }}
          >
            <Text style={{ color: scheme.text, fontSize: 16, fontWeight: '700' }}>{selected.name}</Text>
            <Text style={{ color: scheme.textMuted, fontSize: 13 }}>
              {[selected.river ? `${selected.river} River` : null, selected.project].filter(Boolean).join(' · ')}
            </Text>
            <Text style={{ color: selected.operator ? brand.deepLeaf : '#b06a00', fontSize: 13, fontWeight: '600' }}>
              {selected.operator ? `Allocated to ${selected.operator}` : 'Not yet allocated'}
            </Text>
          </Tap>
        ) : (
          <Text style={{ color: scheme.textMuted, fontSize: 13 }}>
            Tap a site to see who is allocated to it.
          </Text>
        )}
      </View>
    </BrandScreen>
  );
}
