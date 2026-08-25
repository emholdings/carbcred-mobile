/** Route params, in one place so every navigator and screen agrees. */
export type AuthStackParamList = {
  Login: undefined;
};

/**
 * Tabs are not fixed: which of these exist depends on what the signed-in person
 * can do in the organisation they are working in. See MainTabNavigator.
 */
export type MainTabParamList = {
  Home: undefined;
  Rivers: undefined;
  Capture: undefined;
  Tasks: undefined;
  More: undefined;
};

/**
 * The browse stack follows the platform's own hierarchy:
 * River → its sites → one site → the logs kept at that site.
 */
export type RiversStackParamList = {
  RiversList: undefined;
  RiverMap: undefined;
  RiverSites: { riverId?: number; name?: string };
  SiteDetail: { siteId: number; name: string };
  SiteLog: { siteId: number; siteName: string; kind: SiteLogKind };
};

export type SiteLogKind = 'wash-reading' | 'attendance' | 'inspection' | 'complaint';

export type CaptureStackParamList = {
  CaptureMenu: undefined;
  DailyWash: undefined;
  FieldSubmission: undefined;
};

export type MoreStackParamList = {
  MoreMenu: undefined;
  Emergency: undefined;
  Verify: undefined;
  Engagements: undefined;
  Organisation: undefined;
  Devices: undefined;
  Compliance: undefined;
  Tickets: undefined;
  TicketDetail: { ticketId: number; reference: string };
  LogTicket: undefined;
  Onboarding: undefined;
  Discussion: { projectSlug: string; name: string };
  Projects: undefined;
  ProjectDetail: { slug: string; name: string };
};
