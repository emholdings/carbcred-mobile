import { Alert, ScrollView, Text, View } from 'react-native';
import { BadgeCheck, Bell, Building2, CalendarClock, ChevronRight, FolderKanban, HardHat, LogOut, Phone, ShieldCheck, Smartphone, Ticket } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { logout } from '@features/auth/api';
import { BrandScreen } from '@shared/components/BrandScreen';
import { Tap } from '@shared/components/Tap';
import type { MoreStackParamList } from '@navigation/types';
import { usePermissions } from '@shared/hooks/usePermissions';
import { useAuthStore } from '@stores/authStore';
import { brand } from '@theme/colors';
import { useTheme } from '@theme/useTheme';

type Props = NativeStackScreenProps<MoreStackParamList, 'MoreMenu'>;

export function MoreScreen({ navigation }: Props) {
  const { scheme } = useTheme();
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const organisation = useAuthStore((state) => state.currentOrganisation)();
  const can = usePermissions();
  // Both jobs at once: the tab shows delivery, so engagements live here.
  const organisations = useAuthStore((state) => state.organisations);
  const seesDelivery = can('view-projects');
  const seesEngagements = can('view-contractors');

  const confirmSignOut = () => {
    Alert.alert('Sign out', 'Anything still queued on this phone stays queued until you sign back in.', [
      { text: 'Stay', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          // Tell the server first so the token dies server-side too, but never
          // trap someone on a dead session if that call cannot get out.
          try {
            await logout();
          } catch {
            // Offline, or the token was already revoked. Either way, leave.
          }

          await signOut();
        },
      },
    ]);
  };

  return (
    <BrandScreen title="More" subtitle={organisation?.name ?? undefined}>
      <ScrollView contentContainerStyle={{ gap: 12, paddingVertical: 18 }}>
        <View
          style={{
            backgroundColor: scheme.surface,
            borderColor: scheme.border,
            borderWidth: 1,
            borderRadius: 14,
            padding: 16,
            gap: 3,
          }}
        >
          <Text style={{ color: scheme.text, fontSize: 17, fontWeight: '700' }}>{user?.name}</Text>
          <Text style={{ color: scheme.textMuted, fontSize: 14 }}>{user?.email}</Text>
          {user?.platform_role_label ? (
            <Text style={{ color: brand.deepLeaf, fontSize: 13, fontWeight: '600', marginTop: 2 }}>
              {user.platform_role_label}
            </Text>
          ) : null}
        </View>

        {/* Only worth a row when there is a choice to make. */}
        {organisations.length > 1 ? (
          <Row
            icon={<Building2 color={brand.deepLeaf} size={20} />}
            label="Organisation"
            hint={organisation?.name ?? 'Choose where you are working'}
            onPress={() => navigation.navigate('Organisation')}
          />
        ) : null}

        {seesDelivery ? (
          <Row
            icon={<FolderKanban color={brand.deepLeaf} size={20} />}
            label="Projects"
            hint="The delivery pipeline and its workflow"
            onPress={() => navigation.navigate('Projects')}
          />
        ) : null}
        {seesEngagements ? (
          <>
            <Row
              icon={<HardHat color={brand.deepLeaf} size={20} />}
              label="My projects"
              hint="Contracts and the sites you operate"
              onPress={() => navigation.navigate('Engagements')}
            />
            <Row
              icon={<BadgeCheck color={brand.deepLeaf} size={20} />}
              label="Onboarding"
              hint="Approval, due diligence, documents to sign"
              onPress={() => navigation.navigate('Onboarding')}
            />
          </>
        ) : null}
        <Row
          icon={<Bell color={brand.deepLeaf} size={20} />}
          label="What happened"
          hint="Decisions on your work, tickets, complaints"
          onPress={() => navigation.navigate('Notifications')}
        />
        <Row
          icon={<CalendarClock color={brand.deepLeaf} size={20} />}
          label="Compliance"
          hint="Permits lapsing, EMA follow-ups falling due"
          onPress={() => navigation.navigate('Compliance')}
        />
        <Row
          icon={<Ticket color={brand.deepLeaf} size={20} />}
          label="Tickets"
          hint="Complaints, incidents, breakdowns, safety"
          onPress={() => navigation.navigate('Tickets')}
        />
        <Row
          icon={<Phone color={brand.deepLeaf} size={20} />}
          label="Emergency directory"
          hint="Hospitals, police, mine rescue"
          onPress={() => navigation.navigate('Emergency')}
        />
        <Row
          icon={<ShieldCheck color={brand.deepLeaf} size={20} />}
          label="Verify a site"
          hint="Scan a board's QR code"
          onPress={() => navigation.navigate('Verify')}
        />
        <Row
          icon={<Smartphone color={brand.deepLeaf} size={20} />}
          label="Handsets"
          hint="Phones signed in as you — cut off a lost one"
          onPress={() => navigation.navigate('Devices')}
        />

        <Tap
          onPress={confirmSignOut}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: scheme.surface,
            borderColor: scheme.danger,
            borderWidth: 1,
            borderRadius: 14,
            padding: 16,
            marginTop: 8,
          }}
        >
          <LogOut color={scheme.danger} size={20} />
          <Text style={{ color: scheme.danger, fontSize: 16, fontWeight: '600' }}>Sign out</Text>
        </Tap>
      </ScrollView>
    </BrandScreen>
  );
}

function Row({
  icon,
  label,
  hint,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  onPress: () => void;
}) {
  const { scheme } = useTheme();

  return (
    <Tap
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: scheme.surface,
        borderColor: scheme.border,
        borderWidth: 1,
        borderRadius: 14,
        padding: 16,
      }}
    >
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={{ color: scheme.text, fontSize: 16, fontWeight: '600' }}>{label}</Text>
        <Text style={{ color: scheme.textMuted, fontSize: 13 }}>{hint}</Text>
      </View>
      <ChevronRight color={scheme.textMuted} size={20} />
    </Tap>
  );
}
