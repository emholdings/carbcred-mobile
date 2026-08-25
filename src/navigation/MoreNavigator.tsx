import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { EngagementsScreen } from '@features/engagements/screens/EngagementsScreen';
import { OnboardingScreen } from '@features/engagements/screens/OnboardingScreen';
import { DiscussionScreen } from '@features/projects/screens/DiscussionScreen';
import { ProjectDetailScreen } from '@features/projects/screens/ProjectDetailScreen';
import { ProjectsScreen } from '@features/projects/screens/ProjectsScreen';
import { DevicesScreen } from '@features/more/screens/DevicesScreen';
import { EmergencyScreen } from '@features/more/screens/EmergencyScreen';
import { MoreScreen } from '@features/more/screens/MoreScreen';
import { OrganisationScreen } from '@features/more/screens/OrganisationScreen';
import { LogTicketScreen } from '@features/tickets/screens/LogTicketScreen';
import { TicketDetailScreen } from '@features/tickets/screens/TicketDetailScreen';
import { TicketsScreen } from '@features/tickets/screens/TicketsScreen';
import { VerifyScreen } from '@features/more/screens/VerifyScreen';
import type { MoreStackParamList } from './types';

const Stack = createNativeStackNavigator<MoreStackParamList>();

export function MoreNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MoreMenu" component={MoreScreen} />
      <Stack.Screen name="Organisation" component={OrganisationScreen} />
      <Stack.Screen name="Tickets" component={TicketsScreen} />
      <Stack.Screen name="TicketDetail" component={TicketDetailScreen} />
      <Stack.Screen name="LogTicket" component={LogTicketScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Discussion" component={DiscussionScreen} />
      <Stack.Screen name="Emergency" component={EmergencyScreen} />
      <Stack.Screen name="Verify" component={VerifyScreen} />
      <Stack.Screen name="Devices" component={DevicesScreen} />
      <Stack.Screen name="Engagements" component={EngagementsScreen} />
      <Stack.Screen name="Projects" component={ProjectsScreen} />
      <Stack.Screen name="ProjectDetail" component={ProjectDetailScreen} />
    </Stack.Navigator>
  );
}
