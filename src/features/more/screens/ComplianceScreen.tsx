import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BrandScreen } from '@shared/components/BrandScreen';
import { Tap } from '@shared/components/Tap';
import { QueryState } from '@shared/components/QueryState';
import type { MoreStackParamList } from '@navigation/types';
import { useAuthStore } from '@stores/authStore';
import { brand } from '@theme/colors';
import { useTheme } from '@theme/useTheme';
import { fetchCompliance, type ComplianceItem } from '../compliance';

type Props = NativeStackScreenProps<MoreStackParamList, 'Compliance'>;

const TONE: Record<ComplianceItem['status'], string> = {
  overdue: '#b42318',
  due_soon: '#b06a00',
  upcoming: brand.deepLeaf,
};

const LABEL: Record<ComplianceItem['status'], string> = {
  overdue: 'Overdue',
  due_soon: 'Due soon',
  upcoming: 'Upcoming',
};

/**
 * The dates the programme is held to, carried into the field.
 *
 * The person who can do something about a lapsing permit is often the person
 * standing at the site, not the one at the desk — so the same list the web
 * shows travels, and taps through to the site it belongs to.
 */
export function ComplianceScreen({ navigation }: Props) {
  const { scheme } = useTheme();
  const slug = useAuthStore((state) => state.organisationSlug);

  const compliance = useQuery({
    queryKey: ['compliance', slug],
    queryFn: () => fetchCompliance(slug!),
    enabled: Boolean(slug),
  });

  return (
    <BrandScreen
      title="Compliance"
      subtitle={
        compliance.data
          ? compliance.data.counts.overdue > 0
            ? `${compliance.data.counts.overdue} overdue`
            : `${compliance.data.counts.total} in the next ${compliance.data.horizon_days} days`
          : undefined
      }
    >
      <ScrollView
        contentContainerStyle={{ gap: 12, paddingVertical: 18 }}
        refreshControl={
          <RefreshControl
            refreshing={compliance.isRefetching}
            onRefresh={compliance.refetch}
            tintColor={scheme.textMuted}
          />
        }
      >
        <QueryState
          query={compliance}
          isEmpty={(value) => value.items.length === 0}
          emptyTitle="Nothing falls due"
          emptyBody="No permit expires and no follow-up is owed in the next three months."
          skeletonRows={4}
        >
          {(value) => (
            <>
              {value.items.map((item) => (
                <Tap
                  key={`${item.kind}-${item.id}`}
                  onPress={() =>
                    navigation
                      .getParent()
                      ?.navigate('Rivers', {
                        screen: 'SiteDetail',
                        params: { siteId: item.site_id, name: item.site ?? 'Site' },
                      })
                  }
                  style={{
                    backgroundColor: scheme.surface,
                    borderColor: scheme.border,
                    borderWidth: 1,
                    borderLeftWidth: 4,
                    borderLeftColor: TONE[item.status],
                    borderRadius: 14,
                    padding: 15,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={{ color: scheme.text, fontSize: 15, fontWeight: '600' }}>{item.title}</Text>
                    <Text style={{ color: scheme.textMuted, fontSize: 13 }}>
                      {[item.site, item.river ? `${item.river} river` : null].filter(Boolean).join(' · ')}
                    </Text>
                    {item.detail ? (
                      <Text style={{ color: scheme.textMuted, fontSize: 12 }} numberOfLines={2}>
                        {item.detail}
                      </Text>
                    ) : null}
                  </View>

                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <Text style={{ color: TONE[item.status], fontSize: 13, fontWeight: '700' }}>
                      {LABEL[item.status]}
                    </Text>
                    <Text style={{ color: scheme.textMuted, fontSize: 12, fontVariant: ['tabular-nums'] }}>
                      {due(item.days)}
                    </Text>
                  </View>

                  <ChevronRight color={scheme.textMuted} size={18} />
                </Tap>
              ))}
            </>
          )}
        </QueryState>
      </ScrollView>
    </BrandScreen>
  );
}

function due(days: number): string {
  if (days < 0) {
    return `${Math.abs(days)}d ago`;
  }

  return days === 0 ? 'today' : `in ${days}d`;
}
