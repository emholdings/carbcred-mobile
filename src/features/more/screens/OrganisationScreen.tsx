import { ScrollView, Text, View, Pressable } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Home } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BrandScreen } from '@shared/components/BrandScreen';
import type { MoreStackParamList } from '@navigation/types';
import { useAuthStore } from '@stores/authStore';
import { brand } from '@theme/colors';
import { useTheme } from '@theme/useTheme';

type Props = NativeStackScreenProps<MoreStackParamList, 'Organisation'>;

/**
 * Which organisation the app is working in.
 *
 * A Super Admin reaches every organisation on the platform, so without this the
 * app would show them one and silently keep the other eight out of reach. Most
 * people have exactly one and never see this screen.
 */
export function OrganisationScreen({ navigation }: Props) {
  const { scheme } = useTheme();
  const queryClient = useQueryClient();

  const organisations = useAuthStore((state) => state.organisations);
  const current = useAuthStore((state) => state.organisationSlug);
  const setOrganisation = useAuthStore((state) => state.setOrganisation);
  const seesEvery = useAuthStore((state) => state.user?.sees_every_organisation ?? false);

  const choose = async (slug: string) => {
    if (slug === current) {
      navigation.goBack();

      return;
    }

    setOrganisation(slug);

    // Every cached answer was scoped to the old organisation, so none of it is
    // true any more. Clearing beats refetching: a stale site list from another
    // organisation on screen for even a moment is worse than a spinner.
    await queryClient.invalidateQueries();

    navigation.goBack();
  };

  return (
    <BrandScreen
      title="Organisation"
      subtitle={seesEvery ? 'You can work in any of these' : 'The organisations you belong to'}
    >
      <ScrollView contentContainerStyle={{ gap: 10, paddingVertical: 18 }}>
        {organisations.map((organisation) => {
          const selected = organisation.slug === current;

          return (
            <Pressable
              key={organisation.id}
              onPress={() => choose(organisation.slug)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                backgroundColor: scheme.surface,
                borderColor: selected ? brand.deepLeaf : scheme.border,
                borderWidth: selected ? 2 : 1,
                borderRadius: 14,
                padding: 16,
              }}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: scheme.text, fontSize: 16, fontWeight: selected ? '700' : '500' }}>
                  {organisation.name}
                </Text>
                <Text style={{ color: scheme.textMuted, fontSize: 13 }}>
                  {organisation.modules.length} {organisation.modules.length === 1 ? 'module' : 'modules'}
                  {organisation.permissions.length ? ` · ${organisation.permissions.length} permissions` : ' · no access yet'}
                </Text>
              </View>

              {organisation.is_primary ? (
                <Home color={scheme.textMuted} size={16} />
              ) : null}
              {selected ? <Check color={brand.deepLeaf} size={20} strokeWidth={3} /> : null}
            </Pressable>
          );
        })}

        {organisations.length === 0 ? (
          <Text style={{ color: scheme.textMuted, fontSize: 14 }}>
            You do not belong to an organisation yet. An administrator has to add you to one.
          </Text>
        ) : null}
      </ScrollView>
    </BrandScreen>
  );
}
