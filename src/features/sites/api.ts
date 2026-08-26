import { api } from '@api/client';

export type SiteRow = {
  id: number;
  code: string;
  name: string;
  status: string;
  river: string | null;
  province: string | null;
  project: string | null;
  operator: string | null;
  project_id: number | null;
  latitude: number | null;
  longitude: number | null;
};

export type Mobilization = {
  started_on: string | null;
  machinery_ready_on: string | null;
  washplant_ready_on: string | null;
  setup_completed_on: string | null;
  running_since: string | null;
  stage: string;
  required_guards: number;
  notes: string | null;
};

export type SiteOperations = {
  /** The choices each capture form offers, straight from the server. */
  vocabulary: {
    attendance_roles: string[];
    attendance_purposes: string[];
    cost_categories: string[];
    equipment_types: string[];
    equipment_units: string[];
    inspection_outcomes: string[];
    complaint_severities: string[];
  };
  mobilization: Mobilization | null;
  guards: { id: number; name: string; phone: string | null; stage: string; deployed_on: string }[];
  attendance: {
    id: number;
    attended_on: string;
    name: string;
    role: string;
    body: string | null;
    contact: string | null;
    purpose: string | null;
  }[];
  performance: {
    id: number;
    date: string;
    actual: number;
    expected: number | null;
    efficiency: number | null;
    /** unverified · verified · queried — the standing of the number. */
    status: string;
    verified_by: string | null;
    reviewed_at: string | null;
    review_notes: string | null;
    has_photo: boolean;
    /** Frame ids, fetched through the authenticated photo route. */
    photos: number[];
    located: boolean;
  }[];
  unverified_readings: number;
  rated_tph: number | null;
  inspections: {
    id: number;
    agency: string;
    inspected_on: string;
    inspector: string | null;
    outcome: string;
    findings: string | null;
    follow_up: string | null;
    follow_up_due: string | null;
  }[];
  complaints: { id: number; reference: string; status: string; severity: string; description: string; received_on: string }[];
  open_complaints: number;
  representatives: { id: number; name: string; designation: string; body: string | null; kind: string | null }[];
  /** People already named on an engagement body in this province. */
  available_people: { id: number; label: string }[];
  /** What this cell cost to run, most recent first. */
  costs: {
    id: number;
    paid_on: string;
    category: string | null;
    description: string;
    paid_to: string | null;
    amount: number;
  }[];
  costs_this_month: number;
};

export type SiteDetail = SiteRow & {
  area_hectares: number | null;
  length_km: number | null;
  permits: { id: number; type: string; reference: string | null; issuing_authority: string | null; expires_on: string | null }[];
  equipment: { id: number; type: string; label: string | null; rating: number | null; unit: string | null; quantity: number }[];
  operations: SiteOperations;
  verify_url: string;
};

/**
 * Sites, optionally narrowed to a step of the hierarchy — one river's, or one
 * project's. The server does the narrowing; the phone does not fetch the lot.
 */
export async function fetchSites(
  organisationSlug: string,
  filters: { riverId?: number; projectId?: number } = {},
): Promise<SiteRow[]> {
  const { data } = await api.get<{ data: SiteRow[] }>(`/organisations/${organisationSlug}/sites`, {
    params: {
      ...(filters.riverId ? { river_id: filters.riverId } : {}),
      ...(filters.projectId ? { project_id: filters.projectId } : {}),
    },
  });

  return data.data;
}

/** Everything about one site in a single call — the whole operations picture. */
export async function fetchSite(organisationSlug: string, siteId: number): Promise<SiteDetail> {
  return (await api.get<{ data: SiteDetail }>(`/organisations/${organisationSlug}/sites/${siteId}`)).data.data;
}

/** The five mobilization stamps, in the order they are meant to happen. */
export const MOBILIZATION_STEPS: { key: keyof Mobilization; label: string }[] = [
  { key: 'started_on', label: 'Mobilization started' },
  { key: 'machinery_ready_on', label: 'Machinery on site' },
  { key: 'washplant_ready_on', label: 'Wash plant ready' },
  { key: 'setup_completed_on', label: 'Set-up complete' },
  { key: 'running_since', label: 'Running' },
];
