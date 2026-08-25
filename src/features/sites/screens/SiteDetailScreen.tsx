import { useMemo } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Check, Circle } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BarChart } from '@shared/components/BarChart';
import { BrandScreen } from '@shared/components/BrandScreen';
import { LoadState } from '@shared/components/QueryState';
import { usePermissions } from '@shared/hooks/usePermissions';
import type { RiversStackParamList, SiteLogKind } from '@navigation/types';
import { useAuthStore } from '@stores/authStore';
import { brand } from '@theme/colors';
import { useTheme } from '@theme/useTheme';
import { fetchSite, MOBILIZATION_STEPS, type SiteOperations } from '../api';

type Props = NativeStackScreenProps<RiversStackParamList, 'SiteDetail'>;

const LOGS: { kind: SiteLogKind; label: string }[] = [
  { kind: 'wash-reading', label: 'Daily wash' },
  { kind: 'attendance', label: 'Attendance' },
  { kind: 'inspection', label: 'Inspection' },
  { kind: 'complaint', label: 'Complaint' },
];

const SEVERITY_COLOURS: Record<string, string> = {
  high: '#f97066',
  medium: '#f5a524',
  low: '#7c9a3f',
};

/**
 * Everything happening at one site, in the order the questions get asked on the
 * ground: is it mobilised, is it guarded, who is here, is it washing, has the
 * regulator been, is anyone complaining, who speaks for the community.
 */
export function SiteDetailScreen({ route, navigation }: Props) {
  const { scheme } = useTheme();
  const slug = useAuthStore((state) => state.organisationSlug);
  const can = usePermissions();
  const { siteId, name } = route.params;

  const canLog = can('edit-projects') || can('edit-contractors') || can('edit-field');

  const query = useQuery({
    queryKey: ['site', slug, siteId],
    queryFn: () => fetchSite(slug!, siteId),
    enabled: Boolean(slug),
  });
  const { data, refetch, isRefetching } = query;

  const ops = data?.operations;
  const sorted = useSortedOperations(ops);

  return (
    <BrandScreen
      title={name}
      subtitle={data ? [data.code, data.river, data.province].filter(Boolean).join(' · ') : undefined}
    >
      <ScrollView
        contentContainerStyle={{ gap: 14, paddingVertical: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={scheme.textMuted} />}
      >
        <LoadState query={query} rows={6} />

        {data ? (
          <View
            style={{
              backgroundColor: data.operator ? brand.deepLeaf : scheme.surface,
              borderColor: data.operator ? brand.deepLeaf : '#f5a524',
              borderWidth: 1,
              borderRadius: 16,
              padding: 16,
              gap: 3,
            }}
          >
            <Text
              style={{
                color: data.operator ? brand.leaf : '#b06a00',
                fontSize: 11,
                fontWeight: '800',
                letterSpacing: 0.8,
              }}
            >
              {data.operator ? 'ALLOCATED TO' : 'NOT YET ALLOCATED'}
            </Text>
            <Text
              style={{
                color: data.operator ? brand.cream : scheme.text,
                fontSize: 19,
                fontWeight: '700',
              }}
            >
              {data.operator ?? 'No contractor engaged'}
            </Text>
            <Text
              style={{
                color: data.operator ? 'rgba(250,247,241,0.75)' : scheme.textMuted,
                fontSize: 13,
              }}
            >
              {[data.project, data.river ? `${data.river} River` : null].filter(Boolean).join(' · ') ||
                'Not yet on a project'}
            </Text>
          </View>
        ) : null}

        {ops ? (
          <>
            {/* The three things a manager checks before anything else. */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pill label="Stage" value={ops.mobilization?.stage ?? 'not started'} />
              <Pill
                label="Guards"
                value={
                  ops.mobilization
                    ? `${ops.guards.length}/${ops.mobilization.required_guards}`
                    : String(ops.guards.length)
                }
                tone={
                  ops.mobilization && ops.guards.length < ops.mobilization.required_guards
                    ? scheme.danger
                    : undefined
                }
              />
              <Pill
                label="Open complaints"
                value={String(ops.open_complaints)}
                tone={ops.open_complaints > 0 ? '#b06a00' : undefined}
              />
            </View>

            {/* One row, four equal shares: these are the four things kept at a
                site, and a wrapped last button reads as an afterthought. */}
            {canLog ? (
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {LOGS.map((log) => (
                  <Pressable
                    key={log.kind}
                    onPress={() => navigation.navigate('SiteLog', { siteId, siteName: name, kind: log.kind })}
                    style={{
                      flex: 1,
                      backgroundColor: brand.deepLeaf,
                      borderRadius: 10,
                      paddingVertical: 11,
                      paddingHorizontal: 4,
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                      style={{ color: brand.cream, fontSize: 13, fontWeight: '600' }}
                    >
                      {log.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <Section title="Mobilization">
              {ops.mobilization ? (
                MOBILIZATION_STEPS.map((step) => {
                  const stamped = ops.mobilization?.[step.key] as string | null;

                  return (
                    <View key={step.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      {stamped ? (
                        <Check color={brand.deepLeaf} size={16} strokeWidth={3} />
                      ) : (
                        <Circle color={scheme.border} size={16} />
                      )}
                      <Text
                        style={{
                          color: stamped ? scheme.text : scheme.textMuted,
                          fontSize: 14,
                          flex: 1,
                        }}
                      >
                        {step.label}
                      </Text>
                      <Text
                        style={{
                          color: stamped ? scheme.textMuted : scheme.border,
                          fontSize: 12,
                          fontVariant: ['tabular-nums'],
                        }}
                      >
                        {stamped ?? '—'}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <Empty>Not mobilised yet.</Empty>
              )}
            </Section>

            <Section title="Security" count={sorted.guards.length}>
              {sorted.guards.length ? (
                <>
                  {sorted.guards.map((guard) => (
                    <Line
                      key={guard.id}
                      title={guard.name}
                      detail={`${guard.stage} · since ${guard.deployed_on}`}
                      trailing={guard.phone ?? undefined}
                    />
                  ))}
                  {ops.mobilization && ops.guards.length < ops.mobilization.required_guards ? (
                    <Text style={{ color: scheme.danger, fontSize: 13, fontWeight: '600' }}>
                      {ops.mobilization.required_guards - ops.guards.length} short of the staged requirement.
                    </Text>
                  ) : null}
                </>
              ) : (
                <Empty>Nobody deployed.</Empty>
              )}
            </Section>

            <Section title="Attendance" count={sorted.attendanceDays.length ? undefined : 0}>
              {sorted.attendanceDays.length ? (
                sorted.attendanceDays.map(([day, people]) => (
                  <View key={day} style={{ gap: 4 }}>
                    <Text
                      style={{
                        color: day === sorted.today ? brand.deepLeaf : scheme.textMuted,
                        fontSize: 12,
                        fontWeight: '700',
                      }}
                    >
                      {day === sorted.today ? 'TODAY' : day}
                      <Text style={{ fontWeight: '400' }}>{`  ${people.length} on the ground`}</Text>
                    </Text>
                    {people.map((person) => (
                      <Line key={person.id} title={person.name} detail={person.role} />
                    ))}
                  </View>
                ))
              ) : (
                <Empty>Nobody recorded in the last fortnight.</Empty>
              )}
            </Section>

            <Section title="Wash performance" hint={ops.rated_tph ? `${ops.rated_tph} t/h rated` : undefined}>
              <BarChart bars={sorted.bars} height={100} />
              {sorted.latest ? (
                <View style={{ flexDirection: 'row', gap: 18 }}>
                  <Metric label="Last day" value={`${sorted.latest.actual.toLocaleString()} t`} />
                  <Metric
                    label="Expected"
                    value={sorted.latest.expected ? `${sorted.latest.expected.toLocaleString()} t` : '—'}
                  />
                  <Metric
                    label="Efficiency"
                    value={sorted.latest.efficiency !== null ? `${sorted.latest.efficiency}%` : '—'}
                    tone={
                      sorted.latest.efficiency !== null && sorted.latest.efficiency >= 85
                        ? brand.deepLeaf
                        : '#b06a00'
                    }
                  />
                </View>
              ) : null}
            </Section>

            <Section title="Inspections" count={sorted.inspections.length}>
              {sorted.inspections.length ? (
                sorted.inspections.map((inspection) => (
                  <View key={inspection.id} style={{ gap: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ color: scheme.text, fontSize: 14, fontWeight: '600', flex: 1 }}>
                        {inspection.agency}
                      </Text>
                      <Badge label={inspection.outcome} />
                    </View>
                    <Text style={{ color: scheme.textMuted, fontSize: 12 }}>
                      {[inspection.inspected_on, inspection.follow_up].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                ))
              ) : (
                <Empty>No visits recorded.</Empty>
              )}
            </Section>

            <Section title="Complaints" count={sorted.complaints.length}>
              {sorted.complaints.length ? (
                sorted.complaints.map((complaint) => (
                  <View key={complaint.id} style={{ flexDirection: 'row', gap: 10 }}>
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        marginTop: 6,
                        backgroundColor: SEVERITY_COLOURS[complaint.severity] ?? scheme.textMuted,
                      }}
                    />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ color: scheme.text, fontSize: 14 }}>{complaint.description}</Text>
                      <Text style={{ color: scheme.textMuted, fontSize: 12 }}>
                        {complaint.reference} · {complaint.status} · {complaint.received_on}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Empty>Nothing reported.</Empty>
              )}
            </Section>

            {data.verify_url && canLog ? (
              <Pressable
                onPress={() => Linking.openURL(data.verify_url)}
                style={{
                  backgroundColor: scheme.surface,
                  borderColor: scheme.border,
                  borderWidth: 1,
                  borderRadius: 14,
                  padding: 14,
                  gap: 3,
                }}
              >
                <Text style={{ color: scheme.text, fontSize: 14, fontWeight: '600' }}>
                  Public verification page
                </Text>
                <Text style={{ color: scheme.textMuted, fontSize: 12 }}>
                  What anyone scanning this site's board sees — permits and inspection record, nothing else.
                </Text>
              </Pressable>
            ) : null}

            <Section title="Permits" count={data.permits.length}>
              {data.permits.length ? (
                data.permits.map((permit) => {
                  const expired = permit.expires_on !== null && permit.expires_on < sorted.today;

                  return (
                    <View key={permit.id} style={{ gap: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ color: scheme.text, fontSize: 14, fontWeight: '600', flex: 1 }}>
                          {permit.type}
                        </Text>
                        <Text
                          style={{
                            color: expired ? scheme.danger : brand.deepLeaf,
                            fontSize: 11,
                            fontWeight: '700',
                          }}
                        >
                          {expired ? 'EXPIRED' : 'VALID'}
                        </Text>
                      </View>
                      <Text style={{ color: scheme.textMuted, fontSize: 12 }}>
                        {[permit.reference, permit.issuing_authority, permit.expires_on ? `to ${permit.expires_on}` : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <Empty>No permits on record.</Empty>
              )}
            </Section>

            <Section title="Representatives" count={sorted.representatives.length}>
              {sorted.representatives.length ? (
                sorted.representatives.map((person) => (
                  <Line
                    key={person.id}
                    title={person.name}
                    detail={[person.designation, person.body].filter(Boolean).join(' · ')}
                  />
                ))
              ) : (
                <Empty>No community representatives chosen for this site.</Empty>
              )}
            </Section>
          </>
        ) : null}
      </ScrollView>
    </BrandScreen>
  );
}

/**
 * The API returns each list in whatever order suits the query; the page needs
 * them in the order a person reads them. Sorted once, here, rather than in six
 * places down the screen.
 */
function useSortedOperations(ops: SiteOperations | undefined) {
  const today = new Date().toISOString().slice(0, 10);

  return useMemo(() => {
    const attendance = [...(ops?.attendance ?? [])].sort((a, b) => b.attended_on.localeCompare(a.attended_on));
    const days = new Map<string, typeof attendance>();

    for (const entry of attendance) {
      days.set(entry.attended_on, [...(days.get(entry.attended_on) ?? []), entry]);
    }

    const performance = [...(ops?.performance ?? [])].sort((a, b) => a.date.localeCompare(b.date));

    return {
      today,
      // Newest first everywhere a person scans for "what just happened".
      guards: [...(ops?.guards ?? [])].sort((a, b) => b.deployed_on.localeCompare(a.deployed_on)),
      attendanceDays: [...days.entries()],
      inspections: [...(ops?.inspections ?? [])].sort((a, b) => b.inspected_on.localeCompare(a.inspected_on)),
      complaints: [...(ops?.complaints ?? [])].sort((a, b) => b.received_on.localeCompare(a.received_on)),
      representatives: [...(ops?.representatives ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
      // Chronological, because a trend read right to left is a trick question.
      bars: performance.slice(-10).map((row) => ({
        label: row.date.slice(5),
        actual: row.actual,
        expected: row.expected,
      })),
      latest: performance.at(-1),
    };
  }, [ops, today]);
}

function Section({
  title,
  hint,
  count,
  children,
}: {
  title: string;
  hint?: string;
  count?: number;
  children: React.ReactNode;
}) {
  const { scheme } = useTheme();

  return (
    <View
      style={{
        backgroundColor: scheme.surface,
        borderColor: scheme.border,
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        gap: 11,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ color: scheme.text, fontSize: 16, fontWeight: '700' }}>{title}</Text>
        {count !== undefined ? (
          <View
            style={{
              backgroundColor: scheme.background,
              borderRadius: 9,
              paddingHorizontal: 7,
              paddingVertical: 1,
            }}
          >
            <Text style={{ color: scheme.textMuted, fontSize: 12, fontWeight: '700' }}>{count}</Text>
          </View>
        ) : null}
        <View style={{ flex: 1 }} />
        {hint ? <Text style={{ color: scheme.textMuted, fontSize: 12 }}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function Line({ title, detail, trailing }: { title: string; detail: string; trailing?: string }) {
  const { scheme } = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={{ color: scheme.text, fontSize: 14 }}>{title}</Text>
        <Text style={{ color: scheme.textMuted, fontSize: 12 }}>{detail}</Text>
      </View>
      {trailing ? <Text style={{ color: scheme.textMuted, fontSize: 12 }}>{trailing}</Text> : null}
    </View>
  );
}

function Badge({ label }: { label: string }) {
  const { scheme } = useTheme();

  return (
    <View
      style={{
        backgroundColor: scheme.background,
        borderColor: scheme.border,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 2,
      }}
    >
      <Text style={{ color: scheme.textMuted, fontSize: 11, fontWeight: '700' }}>{label.toUpperCase()}</Text>
    </View>
  );
}

function Pill({ label, value, tone }: { label: string; value: string; tone?: string }) {
  const { scheme } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: scheme.surface,
        borderColor: tone ?? scheme.border,
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        gap: 1,
      }}
    >
      <Text style={{ color: tone ?? scheme.text, fontSize: 17, fontWeight: '700' }} numberOfLines={1}>
        {value}
      </Text>
      <Text style={{ color: scheme.textMuted, fontSize: 11 }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  const { scheme } = useTheme();

  return (
    <View style={{ gap: 1 }}>
      <Text style={{ color: tone ?? scheme.text, fontSize: 16, fontWeight: '700' }}>{value}</Text>
      <Text style={{ color: scheme.textMuted, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

function Empty({ children }: { children: string }) {
  const { scheme } = useTheme();

  return <Text style={{ color: scheme.textMuted, fontSize: 14 }}>{children}</Text>;
}
