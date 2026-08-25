import { useMemo, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Camera, Check, Circle, MapPin, Plus, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react-native';
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

  const log = (kind: SiteLogKind) => navigation.navigate('SiteLog', { siteId, siteName: name, kind });

  const canLog = can('edit-projects') || can('edit-contractors') || can('edit-field');

  const query = useQuery({
    queryKey: ['site', slug, siteId],
    queryFn: () => fetchSite(slug!, siteId),
    enabled: Boolean(slug),
  });
  const { data, refetch, isRefetching } = query;

  const ops = data?.operations;
  const sorted = useSortedOperations(ops);
  const [chosenBar, setChosenBar] = useState<number | null>(null);

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

            <Section
              title="Wash performance"
              hint={ops.rated_tph ? `${ops.rated_tph} t/h rated` : undefined}
            >
              <BarChart
                bars={sorted.bars}
                height={100}
                selected={chosenBar}
                onSelect={(index) => setChosenBar((current) => (current === index ? null : index))}
              />

              {/* What the tapped day actually was. There is no hover on a phone,
                  so a chart nobody can interrogate is only ever a shape. */}
              {chosenBar !== null && sorted.charted[chosenBar] ? (
                <View
                  style={{
                    backgroundColor: scheme.background,
                    borderRadius: 12,
                    padding: 12,
                    gap: 6,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: scheme.text, fontSize: 14, fontWeight: '700', flex: 1 }}>
                      {sorted.charted[chosenBar].date}
                    </Text>
                    <Standing status={sorted.charted[chosenBar].status} />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 18 }}>
                    <Metric label="Washed" value={`${sorted.charted[chosenBar].actual.toLocaleString()} t`} />
                    <Metric
                      label="Expected"
                      value={
                        sorted.charted[chosenBar].expected
                          ? `${sorted.charted[chosenBar].expected!.toLocaleString()} t`
                          : '—'
                      }
                    />
                    <Metric
                      label="Efficiency"
                      value={
                        sorted.charted[chosenBar].efficiency !== null
                          ? `${sorted.charted[chosenBar].efficiency}%`
                          : '—'
                      }
                      tone={
                        (sorted.charted[chosenBar].efficiency ?? 0) >= 85 ? brand.deepLeaf : '#b06a00'
                      }
                    />
                  </View>
                </View>
              ) : null}

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

            {/* The readings themselves, out of the chart's card: a list is read
                a row at a time, and every row has to carry its own standing. */}
            <Section
              title="Readings"
              count={ops.performance.length}
              hint={ops.unverified_readings > 0 ? `${ops.unverified_readings} unverified` : undefined}
              onAdd={canLog ? () => log('wash-reading') : undefined}
              addLabel="Record a wash reading"
            >
              {ops.performance.length ? (
                <ScrollView
                  style={{ maxHeight: 300 }}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator
                  contentContainerStyle={{ gap: 0 }}
                >
                  {[...ops.performance].reverse().map((reading, index) => (
                  <View
                    key={reading.id}
                    style={{
                      gap: 5,
                      paddingTop: index === 0 ? 0 : 11,
                      borderTopWidth: index === 0 ? 0 : 1,
                      borderTopColor: scheme.border,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                      <Text style={{ color: scheme.text, fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                        {`${reading.actual.toLocaleString()} t`}
                      </Text>
                      <Text style={{ color: scheme.textMuted, fontSize: 13, flex: 1, fontVariant: ['tabular-nums'] }}>
                        {reading.expected ? `of ${reading.expected.toLocaleString()} t expected` : 'no plant rating'}
                      </Text>
                      <Text
                        style={{
                          color: reading.efficiency !== null && reading.efficiency >= 85 ? brand.deepLeaf : '#b06a00',
                          fontSize: 14,
                          fontWeight: '700',
                          fontVariant: ['tabular-nums'],
                        }}
                      >
                        {reading.efficiency !== null ? `${reading.efficiency}%` : '—'}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ color: scheme.textMuted, fontSize: 13, fontVariant: ['tabular-nums'] }}>
                        {reading.date}
                      </Text>
                      {reading.has_photo ? <Camera color={scheme.textMuted} size={13} /> : null}
                      {reading.located ? <MapPin color={scheme.textMuted} size={13} /> : null}
                      <View style={{ flex: 1 }} />
                      <Standing status={reading.status} />
                      </View>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <Empty>No readings filed yet.</Empty>
              )}
            </Section>

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

            <Section
              title="Attendance"
              count={sorted.attendanceDays.length ? undefined : 0}
              onAdd={canLog ? () => log('attendance') : undefined}
              addLabel="Record who is on the ground"
            >
              {sorted.attendanceDays.length ? (
                <ScrollView style={{ maxHeight: 320 }} nestedScrollEnabled showsVerticalScrollIndicator>
                  {sorted.attendanceDays.map(([day, people], index) => (
                    <View
                      key={day}
                      style={{
                        gap: 6,
                        paddingTop: index === 0 ? 0 : 12,
                        marginTop: index === 0 ? 0 : 12,
                        borderTopWidth: index === 0 ? 0 : 1,
                        borderTopColor: scheme.border,
                      }}
                    >
                      {/* The day is the heading, because a register is read a
                          day at a time: who was here on the day in question. */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text
                          style={{
                            color: day === sorted.today ? brand.deepLeaf : scheme.text,
                            fontSize: 14,
                            fontWeight: '700',
                          }}
                        >
                          {day === sorted.today ? 'Today' : spokenDay(day)}
                        </Text>
                        <View style={{ flex: 1 }} />
                        <Text style={{ color: scheme.textMuted, fontSize: 12, fontWeight: '600' }}>
                          {`${people.length} on the ground`}
                        </Text>
                      </View>

                      {people.map((person) => (
                        <Line key={person.id} title={person.name} detail={person.role} />
                      ))}
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <Empty>Nobody recorded in the last fortnight.</Empty>
              )}
            </Section>

            <Section
              title="Inspections"
              count={sorted.inspections.length}
              onAdd={canLog ? () => log('inspection') : undefined}
              addLabel="Record an inspection"
            >
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

            <Section
              title="Complaints"
              count={sorted.complaints.length}
              onAdd={canLog ? () => log('complaint') : undefined}
              addLabel="Log a complaint"
            >
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
      charted: performance.slice(-10),
      bars: performance.slice(-10).map((row) => ({
        label: row.date.slice(5),
        actual: row.actual,
        expected: row.expected,
      })),
      latest: performance.at(-1),
    };
  }, [ops, today]);
}

/**
 * One part of the site's record.
 *
 * Where something can be added to it, the control sits in this header rather
 * than in a row of buttons at the top of the page: a plus beside "Attendance"
 * says what it will add, and a person who has just read a section is already
 * where they need to be to add to it.
 */
/**
 * Where a reading stands: unverified until somebody who is neither its author
 * nor the contractor being measured has looked at the evidence.
 */
function spokenDay(day: string): string {
  const [year, month, date] = day.split('-').map(Number);

  return new Date(year, month - 1, date).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function Standing({ status }: { status: string }) {
  const { scheme } = useTheme();

  if (status === 'verified') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        <ShieldCheck color={brand.deepLeaf} size={14} />
        <Text style={{ color: brand.deepLeaf, fontSize: 12, fontWeight: '600' }}>Verified</Text>
      </View>
    );
  }

  if (status === 'queried') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        <ShieldAlert color={scheme.danger} size={14} />
        <Text style={{ color: scheme.danger, fontSize: 12, fontWeight: '600' }}>Queried</Text>
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <ShieldQuestion color="#b06a00" size={14} />
      <Text style={{ color: '#b06a00', fontSize: 12, fontWeight: '600' }}>Unverified</Text>
    </View>
  );
}

function Section({
  title,
  hint,
  count,
  onAdd,
  addLabel,
  children,
}: {
  title: string;
  hint?: string;
  count?: number;
  onAdd?: () => void;
  addLabel?: string;
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
        {onAdd ? (
          <Pressable
            onPress={onAdd}
            accessibilityRole="button"
            accessibilityLabel={addLabel ?? `Add to ${title}`}
            hitSlop={10}
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: brand.deepLeaf,
            }}
          >
            <Plus color={brand.cream} size={18} strokeWidth={3} />
          </Pressable>
        ) : null}
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
