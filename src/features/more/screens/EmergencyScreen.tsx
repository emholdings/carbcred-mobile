import { Linking, ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Phone } from 'lucide-react-native';
import { BrandScreen } from '@shared/components/BrandScreen';
import { Tap } from '@shared/components/Tap';
import { QueryState } from '@shared/components/QueryState';
import { useAuthStore } from '@stores/authStore';
import { useTheme } from '@theme/useTheme';
import { fetchEmergencyContacts, type EmergencyContact } from '../api';

/**
 * The directory someone opens with one hand while something is going wrong. So:
 * no search, no filters, the whole number is the tap target, and 24/7 is called
 * out because at 3am it is the only thing that matters.
 */
export function EmergencyScreen() {
  const { scheme } = useTheme();
  const organisationSlug = useAuthStore((state) => state.organisationSlug);

  const query = useQuery({
    queryKey: ['emergency-contacts', organisationSlug],
    queryFn: () => fetchEmergencyContacts(organisationSlug!),
    enabled: Boolean(organisationSlug),
    // Cached hard: this list is needed exactly when the network is worst.
    staleTime: 24 * 60 * 60 * 1000,
  });
  const { data } = query;

  return (
    <BrandScreen title="Emergency" subtitle="Tap a number to call">
      <ScrollView contentContainerStyle={{ gap: 12, paddingVertical: 20 }}>
        <QueryState
          query={query}
          isEmpty={(value) => value.length === 0}
          emptyTitle="No numbers saved"
          emptyBody="The emergency directory for your operating area appears here."
          skeletonRows={5}
        >
          {(list) => (
            <>
              {list.map((contact: EmergencyContact) => (
                <Tap
                  key={contact.id}
                  onPress={() => contact.phone && Linking.openURL(`tel:${contact.phone.replace(/\s/g, '')}`)}
                  disabled={!contact.phone}
                  accessibilityRole="button"
                  accessibilityLabel={`Call ${contact.name}`}
                  style={{
                    backgroundColor: scheme.surface,
                    borderColor: scheme.border,
                    borderWidth: 1,
                    borderRadius: 14,
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                  }}
                >
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={{ color: scheme.text, fontSize: 16, fontWeight: '600' }}>{contact.name}</Text>
                    <Text style={{ color: scheme.textMuted, fontSize: 13 }}>
                      {[contact.type, contact.is_24_7 ? '24/7' : null, contact.province].filter(Boolean).join(' · ')}
                    </Text>
                    {contact.phone ? (
                      <Text style={{ color: scheme.accent, fontSize: 16, fontWeight: '600' }}>{contact.phone}</Text>
                    ) : null}
                  </View>
                  {contact.phone ? <Phone color={scheme.accent} size={22} /> : null}
                </Tap>
              ))}
            </>
          )}
        </QueryState>
      </ScrollView>
    </BrandScreen>
  );
}
