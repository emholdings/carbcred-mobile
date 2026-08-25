import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react-native';
import { fetchInbox, type ApprovalItem } from '@features/tasks/api';
import { BarChart } from '@shared/components/BarChart';
import { BrandScreen } from '@shared/components/BrandScreen';
import { QueryState } from '@shared/components/QueryState';
import { useAuthStore } from '@stores/authStore';
import { brand } from '@theme/colors';
import { useTheme } from '@theme/useTheme';
import { fetchDashboard } from '../api';
import { fetchMonitoring, needsAttention, type Monitoring, type SiteMonitor } from '../monitoring';

const TONE_COLOURS: Record<string, string> = {
  action: '#f97066',
  warning: '#f5a524',
  info: brand.deepLeaf,
  success: brand.leaf,
  tip: brand.leaf,
};

type Navigate = (screen: string, params?: object) => void;

/**
 * Home answers one question: is the operation running?
 *
 * That is the wash plants, so the wash plants lead — the week's tonnage across
 * every site this person can see, then each site's own line, then the ones that
 * need chasing. Programme phases used to sit at the top; they moved out,
 * because a phase changes once a quarter and nobody opens a phone to check it.
 */
export function HomeScreen({ navigation }: { navigation: { navigate: Navigate } }) {
  const { scheme } = useTheme();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const slug = useAuthStore((state) => state.organisationSlug);

  const dashboard = useQuery({ queryKey: ['dashboard'], queryFn: fetchDashboard });
  const inbox = useQuery({ queryKey: ['approvals', null], queryFn: () => fetchInbox() });

  const monitoring = useQuery({
    queryKey: ['monitoring', slug],
    queryFn: () => fetchMonitoring(queryClient, slug!),
    enabled: Boolean(slug),
  });

  const data = monitoring.data;
  const attention = data ? needsAttention(data) : [];
  const actions = inbox.data?.items ?? [];

  const openSite = (site: SiteMonitor) =>
    navigation.navigate('Rivers', { screen: 'SiteDetail', params: { siteId: site.id, name: site.name } });

  const refresh = () => {
    void dashboard.refetch();
    void inbox.refetch();
    void monitoring.refetch();
  };

  return (
    <BrandScreen
      title={user?.name ? `Hello, ${user.name.split(' ')[0]}` : 'Welcome back'}
      subtitle={subtitle(data)}
      header={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <HeaderStat label="Sites" value={String(data?.sites.length ?? 0)} />
          <HeaderStat
            label="Reporting"
            value={data ? `${data.reporting}/${data.sites.length}` : '—'}
          />
          <HeaderStat label="On you" value={String(inbox.data?.counts.total ?? 0)} />
        </View>
      }
    >
      <ScrollView
        contentContainerStyle={{ gap: 16, paddingVertical: 18 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={monitoring.isRefetching} onRefresh={refresh} tintColor={scheme.textMuted} />
        }
      >
        <QueryState
          query={monitoring}
          isEmpty={(value) => value.sites.length === 0}
          emptyTitle="No sites yet"
          emptyBody="Once a site is registered on a river, its daily wash shows up here."
          skeletonRows={4}
        >
          {(value) => (
            <>
              {/* The whole operation's week, in one chart. */}
              <Card>
                <CardTitle title="Daily wash" hint="all sites" onPress={() => navigation.navigate('Rivers')} />
                <BarChart bars={value.series} />
                <View style={{ flexDirection: 'row', gap: 18 }}>
                  <Metric label="This week" value={`${Math.round(value.tonnesThisWeek).toLocaleString()} t`} />
                  <Metric
                    label="vs last week"
                    value={change(value.tonnesThisWeek, value.tonnesLastWeek)}
                    tone={value.tonnesThisWeek >= value.tonnesLastWeek ? brand.deepLeaf : '#f5a524'}
                  />
                  <Metric label="Sites washing" value={`${value.reporting} of ${value.sites.length}`} />
                </View>
              </Card>

              {/* Each site's own line — one river can hold several. */}
              <Card>
                <CardTitle title="By site" hint={`${value.rivers} ${value.rivers === 1 ? 'river' : 'rivers'}`} />
                {value.sites.map((site) => (
                  <SiteRow key={site.id} site={site} onPress={() => openSite(site)} />
                ))}
              </Card>

              {attention.length > 0 ? (
                <Card>
                  <CardTitle title="Needs attention" hint={String(attention.length)} />
                  {attention.slice(0, 5).map((entry) => (
                    <Pressable
                      key={`${entry.site.id}-${entry.reason}`}
                      onPress={() => openSite(entry.site)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
                    >
                      <View style={{ width: 3, height: 30, borderRadius: 2, backgroundColor: '#f5a524' }} />
                      <View style={{ flex: 1, gap: 1 }}>
                        <Text style={{ color: scheme.text, fontSize: 15, fontWeight: '600' }}>{entry.site.name}</Text>
                        <Text style={{ color: scheme.textMuted, fontSize: 13 }}>{entry.reason}</Text>
                      </View>
                      <ChevronRight color={scheme.textMuted} size={18} />
                    </Pressable>
                  ))}
                </Card>
              ) : null}
            </>
          )}
        </QueryState>

        {actions.length > 0 ? (
          <Card>
            <CardTitle
              title="Action items"
              hint={`${actions.length} waiting`}
              onPress={() => navigation.navigate('Tasks')}
            />
            {actions.slice(0, 4).map((item: ApprovalItem) => (
              <View key={`${item.type}-${item.id}`} style={{ gap: 1 }}>
                <Text style={{ color: scheme.text, fontSize: 15, fontWeight: '600' }}>{item.title}</Text>
                <Text style={{ color: scheme.textMuted, fontSize: 13 }}>
                  {[item.meta.project as string | undefined, item.awaiting].filter(Boolean).join(' · ')}
                </Text>
              </View>
            ))}
          </Card>
        ) : null}

        {dashboard.data?.insights.length ? (
          <Text style={{ color: scheme.text, fontSize: 18, fontWeight: '700' }}>Today's focus</Text>
        ) : null}

        {dashboard.data?.insights.map((insight) => (
          <View
            key={insight.title}
            style={{
              backgroundColor: scheme.surface,
              borderColor: scheme.border,
              borderWidth: 1,
              borderLeftWidth: 4,
              borderLeftColor: TONE_COLOURS[insight.tone] ?? brand.deepLeaf,
              borderRadius: 14,
              padding: 14,
              gap: 4,
            }}
          >
            <Text style={{ color: scheme.text, fontSize: 15, fontWeight: '600' }}>{insight.title}</Text>
            <Text style={{ color: scheme.textMuted, fontSize: 14, lineHeight: 20 }}>{insight.body}</Text>
          </View>
        ))}

        {dashboard.data?.tip ? (
          <View style={{ backgroundColor: brand.deepLeaf, borderRadius: 16, padding: 16, gap: 5 }}>
            <Text style={{ color: brand.leaf, fontSize: 12, fontWeight: '800', letterSpacing: 1 }}>FIELD TIP</Text>
            <Text style={{ color: brand.cream, fontSize: 17, fontWeight: '700' }}>{dashboard.data.tip.title}</Text>
            <Text style={{ color: brand.cream, fontSize: 14, opacity: 0.88, lineHeight: 20 }}>
              {dashboard.data.tip.body}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </BrandScreen>
  );
}

/** One site's week: what it washed, how well, and when it last said anything. */
function SiteRow({ site, onPress }: { site: SiteMonitor; onPress: () => void }) {
  const { scheme } = useTheme();
  const quiet = site.daysQuiet === null || site.daysQuiet >= 3;

  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: scheme.text, fontSize: 15, fontWeight: '600' }}>{site.name}</Text>
        <Text style={{ color: scheme.textMuted, fontSize: 13 }}>
          {[site.river ? `${site.river} river` : null, site.operator ?? 'Not yet allocated']
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>

      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Text style={{ color: scheme.text, fontSize: 15, fontWeight: '700' }}>
          {site.tonnesThisWeek > 0 ? `${Math.round(site.tonnesThisWeek).toLocaleString()} t` : '—'}
        </Text>
        <Text style={{ color: quiet ? '#f5a524' : scheme.textMuted, fontSize: 12 }}>
          {lastSeen(site)}
        </Text>
      </View>

      <ChevronRight color={scheme.textMuted} size={18} />
    </Pressable>
  );
}

function subtitle(data: Monitoring | undefined): string {
  if (!data) {
    return 'CarbCred Africa';
  }

  const sites = `${data.sites.length} ${data.sites.length === 1 ? 'site' : 'sites'}`;
  const rivers = `${data.rivers} ${data.rivers === 1 ? 'river' : 'rivers'}`;

  return data.unallocated > 0 ? `${sites} on ${rivers} · ${data.unallocated} unallocated` : `${sites} on ${rivers}`;
}

function lastSeen(site: SiteMonitor): string {
  if (site.daysQuiet === null) {
    return 'No readings';
  }

  if (site.daysQuiet === 0) {
    return 'Washed today';
  }

  if (site.daysQuiet === 1) {
    return 'Yesterday';
  }

  return `${site.daysQuiet} days ago`;
}

function change(current: number, previous: number): string {
  if (previous === 0) {
    return current > 0 ? 'new' : '—';
  }

  const percentage = Math.round(((current - previous) / previous) * 100);

  return `${percentage > 0 ? '+' : ''}${percentage}%`;
}

function Card({ children }: { children: React.ReactNode }) {
  const { scheme } = useTheme();

  return (
    <View
      style={{
        backgroundColor: scheme.surface,
        borderColor: scheme.border,
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        gap: 12,
      }}
    >
      {children}
    </View>
  );
}

function CardTitle({ title, hint, onPress }: { title: string; hint?: string; onPress?: () => void }) {
  const { scheme } = useTheme();

  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Text style={{ color: scheme.text, fontSize: 17, fontWeight: '700', flex: 1 }}>{title}</Text>
      {hint ? <Text style={{ color: scheme.textMuted, fontSize: 13 }}>{hint}</Text> : null}
      {onPress ? <ChevronRight color={scheme.textMuted} size={18} /> : null}
    </View>
  );

  return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content;
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  const { scheme } = useTheme();

  return (
    <View style={{ gap: 1 }}>
      <Text style={{ color: tone ?? scheme.text, fontSize: 17, fontWeight: '700' }}>{value}</Text>
      <Text style={{ color: scheme.textMuted, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

function HeaderStat({ label, value }: { label: string; value: string }) {
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
