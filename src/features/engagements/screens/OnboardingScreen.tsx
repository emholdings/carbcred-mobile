import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Check, Circle, FileText } from 'lucide-react-native';
import { BrandScreen } from '@shared/components/BrandScreen';
import { LoadState } from '@shared/components/QueryState';
import { useAuthStore } from '@stores/authStore';
import { brand } from '@theme/colors';
import { useTheme } from '@theme/useTheme';
import { fetchOnboarding, type Requirement } from '../onboarding';

/**
 * Where this contractor stands with CarbCred: approved or not, how much
 * due diligence is done, what is still outstanding, and what has been issued to
 * sign. Read-only by design — uploading a document and signing one are web
 * work, and saying so plainly beats a button that opens a file picker nobody
 * can use standing in a river.
 */
export function OnboardingScreen() {
  const { scheme } = useTheme();
  const slug = useAuthStore((state) => state.organisationSlug);

  const query = useQuery({
    queryKey: ['onboarding', slug],
    queryFn: () => fetchOnboarding(slug!),
    enabled: Boolean(slug),
  });

  const { data, refetch, isRefetching } = query;

  const kyc = data?.kyc;
  const outstanding = data?.requirements.filter((requirement) => !requirement.uploaded) ?? [];

  return (
    <BrandScreen title="Onboarding" subtitle={data?.organisation.name ?? undefined}>
      <ScrollView
        contentContainerStyle={{ gap: 14, paddingVertical: 18 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={scheme.textMuted} />}
      >
        <LoadState query={query} rows={4} />

        {data ? (
          <View
            style={{
              backgroundColor: data.organisation.status === 'approved' ? brand.deepLeaf : scheme.surface,
              borderColor: data.organisation.status === 'approved' ? brand.deepLeaf : '#f5a524',
              borderWidth: 1,
              borderRadius: 16,
              padding: 16,
              gap: 3,
            }}
          >
            <Text
              style={{
                color: data.organisation.status === 'approved' ? brand.leaf : '#b06a00',
                fontSize: 11,
                fontWeight: '800',
                letterSpacing: 0.8,
              }}
            >
              {data.organisation.status_label.toUpperCase()}
            </Text>
            <Text
              style={{
                color: data.organisation.status === 'approved' ? brand.cream : scheme.text,
                fontSize: 18,
                fontWeight: '700',
              }}
            >
              {data.organisation.approved_at
                ? `Approved ${data.organisation.approved_at}`
                : 'Not yet approved'}
            </Text>
            {kyc?.river ? (
              <Text
                style={{
                  color: data.organisation.status === 'approved' ? 'rgba(250,247,241,0.75)' : scheme.textMuted,
                  fontSize: 13,
                }}
              >
                {kyc.river} River · {kyc.province}
              </Text>
            ) : null}
          </View>
        ) : null}

        {kyc ? (
          <Section title="Due diligence" hint={`${kyc.uploaded_count} of ${kyc.total_requirements}`}>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: scheme.border, overflow: 'hidden' }}>
              <View style={{ width: `${kyc.completion}%`, height: 8, backgroundColor: brand.deepLeaf }} />
            </View>
            <Text style={{ color: scheme.textMuted, fontSize: 13 }}>
              {kyc.status_label}
              {kyc.reference ? ` · ${kyc.reference}` : ''}
            </Text>
            {kyc.review_notes ? (
              <Text style={{ color: scheme.danger, fontSize: 13 }}>{kyc.review_notes}</Text>
            ) : null}
          </Section>
        ) : null}

        <Section
          title={outstanding.length ? 'Still outstanding' : 'Documents'}
          hint={outstanding.length ? `${outstanding.length} to send` : 'all in'}
        >
          {data?.requirements.map((requirement: Requirement) => (
            <View key={requirement.key} style={{ flexDirection: 'row', gap: 10 }}>
              {requirement.uploaded ? (
                <Check color={brand.deepLeaf} size={16} strokeWidth={3} style={{ marginTop: 2 }} />
              ) : (
                <Circle color={scheme.border} size={16} style={{ marginTop: 2 }} />
              )}
              <View style={{ flex: 1, gap: 1 }}>
                <Text
                  style={{
                    color: requirement.uploaded ? scheme.textMuted : scheme.text,
                    fontSize: 14,
                    fontWeight: requirement.uploaded ? '400' : '600',
                  }}
                >
                  {requirement.title}
                </Text>
                {!requirement.uploaded && requirement.note ? (
                  <Text style={{ color: scheme.textMuted, fontSize: 12 }}>{requirement.note}</Text>
                ) : null}
                {requirement.uploaded && requirement.uploaded_at ? (
                  <Text style={{ color: scheme.textMuted, fontSize: 12 }}>Sent {requirement.uploaded_at}</Text>
                ) : null}
              </View>
            </View>
          ))}
          {outstanding.length ? (
            <Text style={{ color: scheme.textMuted, fontSize: 12, fontStyle: 'italic' }}>
              Send these from the web workspace — they need files from a computer.
            </Text>
          ) : null}
        </Section>

        {data?.documents.length ? (
          <Section title="Issued to you" count={data.documents.length}>
            {data.documents.map((document) => (
              <View key={document.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <FileText color={scheme.textMuted} size={16} />
                <View style={{ flex: 1, gap: 1 }}>
                  <Text style={{ color: scheme.text, fontSize: 14 }}>{document.title}</Text>
                  <Text style={{ color: scheme.textMuted, fontSize: 12 }}>
                    {[document.category, document.requires_signature ? 'needs signing' : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
                {document.acknowledged ? (
                  <Check color={brand.deepLeaf} size={16} strokeWidth={3} />
                ) : (
                  <Text style={{ color: '#b06a00', fontSize: 11, fontWeight: '700' }}>UNREAD</Text>
                )}
              </View>
            ))}
          </Section>
        ) : null}
      </ScrollView>
    </BrandScreen>
  );
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
        <Text style={{ color: scheme.text, fontSize: 16, fontWeight: '700', flex: 1 }}>{title}</Text>
        {hint ?? count !== undefined ? (
          <Text style={{ color: scheme.textMuted, fontSize: 12 }}>{hint ?? count}</Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}
