import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BrandScreen } from '@shared/components/BrandScreen';
import { Tap } from '@shared/components/Tap';
import { QueryState } from '@shared/components/QueryState';
import type { RiversStackParamList } from '@navigation/types';
import { useAuthStore } from '@stores/authStore';
import { useTheme } from '@theme/useTheme';
import { fetchSites, type SiteRow } from '../api';

type Props = NativeStackScreenProps<RiversStackParamList, 'RiverSites'>;

/** The sites on one river — the middle of River → Project → Site. */
export function SitesScreen({ navigation, route }: Props) {
  const { scheme } = useTheme();
  const slug = useAuthStore((state) => state.organisationSlug);
  const { riverId, name } = route.params;

  const sites = useQuery({
    queryKey: ['sites', slug, riverId ?? 'all'],
    queryFn: () => fetchSites(slug!, riverId ? { riverId } : {}),
    enabled: Boolean(slug),
  });

  return (
    <BrandScreen
      title={name ? `${name} River` : 'All sites'}
      subtitle={sites.data ? subtitle(sites.data) : undefined}
    >
      <ScrollView
        contentContainerStyle={{ gap: 12, paddingVertical: 18 }}
        refreshControl={
          <RefreshControl refreshing={sites.isRefetching} onRefresh={sites.refetch} tintColor={scheme.textMuted} />
        }
      >
        <QueryState
          query={sites}
          isEmpty={(value) => value.length === 0}
          emptyTitle="No sites here"
          emptyBody={
            name
              ? 'No sites on this river are in reach of your organisation.'
              : 'No sites are in reach of your organisation.'
          }
          skeletonRows={4}
        >
          {(list) => (
            <>
              {list.map((site: SiteRow) => (
                <SiteCard
                  key={site.id}
                  site={site}
                  onPress={() => navigation.navigate('SiteDetail', { siteId: site.id, name: site.name })}
                />
              ))}
            </>
          )}
        </QueryState>
      </ScrollView>
    </BrandScreen>
  );
}

/**
 * One site, led by who is working it. A cell with no contractor on it is the
 * thing the programme exists to fix, so it is said plainly rather than left as
 * a blank line.
 */
function SiteCard({ site, onPress }: { site: SiteRow; onPress: () => void }) {
  const { scheme } = useTheme();

  return (
    <Tap
      onPress={onPress}
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
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ color: scheme.text, fontSize: 16, fontWeight: '600' }}>{site.name}</Text>
        <Text style={{ color: scheme.textMuted, fontSize: 13 }}>
          {[site.code, site.river, site.status].filter(Boolean).join(' · ')}
        </Text>
        <Text style={{ color: site.operator ? scheme.textMuted : '#f5a524', fontSize: 12 }}>
          {[site.project, site.operator ?? 'Not yet allocated'].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <ChevronRight color={scheme.textMuted} size={20} />
    </Tap>
  );
}

function subtitle(sites: SiteRow[]): string {
  const unallocated = sites.filter((site) => site.operator === null).length;
  const count = `${sites.length} ${sites.length === 1 ? 'site' : 'sites'}`;

  return unallocated > 0 ? `${count} · ${unallocated} not yet allocated` : count;
}
