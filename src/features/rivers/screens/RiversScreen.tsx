import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Map } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BrandScreen } from '@shared/components/BrandScreen';
import { QueryState } from '@shared/components/QueryState';
import type { RiversStackParamList } from '@navigation/types';
import { useAuthStore } from '@stores/authStore';
import { brand } from '@theme/colors';
import { useTheme } from '@theme/useTheme';
import { fetchSites } from '@features/sites/api';
import { fetchRivers, type River } from '../api';

type Props = NativeStackScreenProps<RiversStackParamList, 'RiversList'>;

/**
 * The top of the hierarchy: River → Project → Site → its logs. Everything the
 * programme does happens on one of these five approved reaches, so this is
 * where a person starts when they are looking for somewhere rather than for
 * something.
 */
export function RiversScreen({ navigation }: Props) {
  const { scheme } = useTheme();

  const slug = useAuthStore((state) => state.organisationSlug);

  const rivers = useQuery({
    queryKey: ['rivers'],
    queryFn: fetchRivers,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const sites = useQuery({
    queryKey: ['sites', slug, 'all'],
    queryFn: () => fetchSites(slug!),
    enabled: Boolean(slug),
  });

  const allocated = sites.data?.filter((site) => site.operator).length ?? 0;
  const unallocated = (sites.data?.length ?? 0) - allocated;

  return (
    <BrandScreen
      title="Rivers"
      subtitle={rivers.data ? `${rivers.data.length} approved reaches` : undefined}
    >
      <ScrollView
        contentContainerStyle={{ gap: 12, paddingVertical: 18 }}
        refreshControl={
          <RefreshControl refreshing={rivers.isRefetching} onRefresh={rivers.refetch} tintColor={scheme.textMuted} />
        }
      >
        {sites.data ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Count label="Allocated" value={allocated} colour={brand.deepLeaf} />
            <Count label="Not yet allocated" value={unallocated} colour="#f5a524" />
          </View>
        ) : null}

        <Pressable
          onPress={() => navigation.navigate('RiverMap')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: '#3b82f6',
            borderRadius: 14,
            padding: 16,
          }}
        >
          <Map color="#ffffff" size={22} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '700' }}>See them on a map</Text>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>
              Every reach, every site, and who is allocated where
            </Text>
          </View>
        </Pressable>

        <QueryState
          query={rivers}
          isEmpty={(value) => value.length === 0}
          emptyTitle="No rivers yet"
          emptyBody="The approved reaches appear here once the programme registers them."
          skeletonRows={4}
        >
          {(list) => (
            <>
              {list.map((river: River) => (
                <RiverCard
                  key={river.id}
                  river={river}
                  onPress={() => navigation.navigate('RiverSites', { riverId: river.id, name: river.name })}
                />
              ))}
            </>
          )}
        </QueryState>

        {/* A site not yet on an approved river would otherwise be invisible
            from here — the web view groups them as "Not yet on an approved
            river"; this is the same promise, reached from one entry. */}
        <Pressable
          onPress={() => navigation.navigate('RiverSites', {})}
          style={{
            backgroundColor: scheme.surface,
            borderColor: scheme.border,
            borderWidth: 1,
            borderRadius: 14,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: scheme.text, fontSize: 16, fontWeight: '600' }}>All sites</Text>
            <Text style={{ color: scheme.textMuted, fontSize: 13 }}>
              Including any not yet on an approved river
            </Text>
          </View>
          <ChevronRight color={scheme.textMuted} size={20} />
        </Pressable>
      </ScrollView>
    </BrandScreen>
  );
}

/** One reach: its province, how many sites sit on it, and where it stands. */
function RiverCard({ river, onPress }: { river: River; onPress: () => void }) {
  const { scheme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: scheme.surface,
        borderColor: scheme.border,
        borderWidth: 1,
        borderLeftWidth: 5,
        // A river is always drawn in its own blue, here as everywhere.
        borderLeftColor: river.color,
        borderRadius: 14,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ color: scheme.text, fontSize: 16, fontWeight: '600' }}>{river.name} River</Text>
        <Text style={{ color: scheme.textMuted, fontSize: 13 }}>
          {river.province} · {river.sites_count} {river.sites_count === 1 ? 'site' : 'sites'} · {river.status}
        </Text>
      </View>
      <ChevronRight color={scheme.textMuted} size={20} />
    </Pressable>
  );
}

/** A programme-wide allocation count, in the colour that state uses everywhere. */
function Count({ label, value, colour }: { label: string; value: number; colour: string }) {
  const { scheme } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: scheme.surface,
        borderColor: colour,
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        gap: 1,
      }}
    >
      <Text style={{ color: colour, fontSize: 20, fontWeight: '700' }}>{value}</Text>
      <Text style={{ color: scheme.textMuted, fontSize: 12 }}>{label}</Text>
    </View>
  );
}
