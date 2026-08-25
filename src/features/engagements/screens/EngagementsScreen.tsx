import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { BarChart } from '@shared/components/BarChart';
import { BrandScreen } from '@shared/components/BrandScreen';
import { QueryState } from '@shared/components/QueryState';
import { useAuthStore } from '@stores/authStore';
import { brand } from '@theme/colors';
import { useTheme } from '@theme/useTheme';
import { fetchEngagements, type Engagement } from '../api';

/**
 * A contractor's own view of the work: the projects it is engaged on, the
 * contract behind each, and how the sites it operates are actually running.
 * Deliberately not the internal Projects tab — a contractor has no business
 * seeing the lead organisation's whole delivery pipeline.
 */
export function EngagementsScreen() {
  const { scheme } = useTheme();
  const slug = useAuthStore((state) => state.organisationSlug);
  const organisation = useAuthStore((state) => state.currentOrganisation)();

  const query = useQuery({
    queryKey: ['engagements', slug],
    queryFn: () => fetchEngagements(slug!),
    enabled: Boolean(slug),
  });
  const { data, refetch, isRefetching } = query;

  return (
    <BrandScreen
      title="My projects"
      subtitle={organisation?.name ?? undefined}
      header={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <HeaderStat label="Engagements" value={data?.length ?? 0} />
          <HeaderStat label="Sites operated" value={data?.reduce((n, e) => n + e.sites.length, 0) ?? 0} />
        </View>
      }
    >
      <ScrollView
        contentContainerStyle={{ gap: 14, paddingVertical: 18 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={scheme.textMuted} />}
      >
        <QueryState
          query={query}
          isEmpty={(value) => value.length === 0}
          emptyTitle="No engagements yet"
          emptyBody="Once your organisation is engaged on a project, it appears here."
          skeletonRows={3}
        >
          {(list) => (
            <>
              {list.map((engagement: Engagement) => (
                <View
                  key={engagement.id}
                  style={{
                    backgroundColor: scheme.surface,
                    borderColor: scheme.border,
                    borderWidth: 1,
                    borderRadius: 16,
                    padding: 16,
                    gap: 12,
                  }}
                >
                  <View style={{ gap: 3 }}>
                    <Text style={{ color: scheme.text, fontSize: 17, fontWeight: '700' }}>{engagement.name}</Text>
                    <Text style={{ color: scheme.textMuted, fontSize: 13 }}>
                      {[engagement.role, engagement.status, engagement.lead ? `led by ${engagement.lead}` : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>

                  {engagement.contract ? (
                    <View
                      style={{
                        backgroundColor: scheme.background,
                        borderRadius: 12,
                        padding: 12,
                        gap: 2,
                      }}
                    >
                      <Text style={{ color: scheme.text, fontSize: 14, fontWeight: '600' }}>
                        {engagement.contract.reference}
                      </Text>
                      <Text style={{ color: scheme.textMuted, fontSize: 13 }}>
                        {engagement.contract.title}
                      </Text>
                      <Text style={{ color: scheme.textMuted, fontSize: 12 }}>
                        {engagement.contract.status}
                        {engagement.contract.end_date ? ` · to ${engagement.contract.end_date}` : ''}
                      </Text>
                    </View>
                  ) : null}

                  {engagement.sites.map((site) => (
                    <View key={site.id} style={{ gap: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ color: scheme.text, fontSize: 15, fontWeight: '600', flex: 1 }}>
                          {site.name}
                        </Text>
                        <Text style={{ color: scheme.textMuted, fontSize: 12 }}>
                          {site.readings_count} readings
                        </Text>
                      </View>
                      <BarChart
                        height={70}
                        bars={[...site.recent]
                          .reverse()
                          .map((reading) => ({
                            label: reading.reading_date.slice(5),
                            actual: reading.tonnes_processed,
                            expected: null,
                          }))}
                      />
                      {site.last_reading ? (
                        <Text style={{ color: scheme.textMuted, fontSize: 12 }}>
                          Last reading {site.last_reading}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              ))}
            </>
          )}
        </QueryState>
      </ScrollView>
    </BrandScreen>
  );
}

function HeaderStat({ label, value }: { label: string; value: number }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: 'rgba(250, 247, 241, 0.10)',
        borderColor: 'rgba(166, 196, 67, 0.35)',
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        gap: 1,
      }}
    >
      <Text style={{ color: brand.cream, fontSize: 22, fontWeight: '700' }}>{value}</Text>
      <Text style={{ color: brand.leaf, fontSize: 12, fontWeight: '500' }}>{label}</Text>
    </View>
  );
}
