import { api } from '@api/client';

export type ApprovalType =
  | 'contractor_application'
  | 'workflow_task'
  | 'field_submission'
  | 'plant_reading'
  | 'requisition';

export type ApprovalItem = {
  type: ApprovalType;
  id: number;
  title: string;
  subtitle: string;
  organisation: { id: number; name: string; slug: string } | null;
  awaiting: string;
  actions: ('approve' | 'reject')[];
  submitted_at: string | null;
  meta: Record<string, unknown>;
};

export type Inbox = {
  counts: Record<string, number>;
  items: ApprovalItem[];
  types: ApprovalType[];
};

/**
 * Everything awaiting this person, across every organisation they can act in —
 * the platform gathers it, so the app does not have to know which queues exist.
 */
export async function fetchInbox(type?: ApprovalType): Promise<Inbox> {
  const { data } = await api.get<{ data: Inbox }>('/approvals', {
    params: type ? { type } : undefined,
  });

  return data.data;
}

export async function decide(
  type: ApprovalType,
  id: number,
  decision: 'approve' | 'reject',
  notes?: string,
): Promise<{ status: string; message: string }> {
  const { data } = await api.post<{ data: { status: string; message: string } }>(
    `/approvals/${type}/${id}`,
    { decision, ...(notes ? { notes } : {}) },
  );

  return data.data;
}

/** Human labels for the queue names the API returns. */
export const TYPE_LABELS: Record<ApprovalType, string> = {
  contractor_application: 'Applications',
  workflow_task: 'Workflow tasks',
  field_submission: 'Field submissions',
  plant_reading: 'Wash readings',
  requisition: 'Requisitions',
};
