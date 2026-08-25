import { api } from '@api/client';

export type ComplianceItem = {
  kind: 'permit' | 'follow_up';
  id: number;
  title: string;
  detail: string | null;
  due_on: string;
  days: number;
  status: 'overdue' | 'due_soon' | 'upcoming';
  site_id: number;
  site: string | null;
  river: string | null;
};

export type Compliance = {
  items: ComplianceItem[];
  counts: { overdue: number; due_soon: number; upcoming: number; total: number };
  horizon_days: number;
};

/** Permits about to lapse and inspection follow-ups falling due. */
export async function fetchCompliance(organisationSlug: string): Promise<Compliance> {
  return (await api.get<{ data: Compliance }>(`/organisations/${organisationSlug}/compliance`)).data.data;
}
