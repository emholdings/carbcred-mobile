/**
 * Everything the app can file from the field.
 *
 * Each kind names the endpoint it posts to and carries its own payload; the
 * queue and the sync engine treat them all alike, so adding a capture is a
 * matter of describing it rather than of writing another send path.
 */
export type CaptureKind =
  | 'field-submission'
  | 'wash-reading'
  | 'attendance'
  | 'inspection'
  | 'complaint'
  | 'permit'
  | 'equipment'
  | 'cost'
  | 'message'
  | 'photo';

export type SubmissionType = 'planting' | 'survival' | 'monitoring' | 'incident';

export type QueueStatus = 'pending' | 'sending' | 'failed';

/** A file to send as multipart, copied somewhere the queue can still find it. */
export type QueuedFile = {
  uri: string;
  name: string;
  type: string;
};

export type QueuedWrite = {
  kind: CaptureKind;
  /**
   * Path under /api/v1. May contain `{parent}`, which is replaced with the id
   * of the record `dependsOn` created — a photo is queued before the submission
   * it belongs to exists, so its endpoint cannot be known until that filed.
   */
  endpoint: string;
  /** The client_ref of a queued write that must land before this one can. */
  dependsOn?: string;
  file?: QueuedFile;
  payload: Record<string, unknown> & { client_ref: string };
  /** What to call this row in the queue list — the officer's own words for it. */
  label: string;
  context: string;
  status: QueueStatus;
  attempts: number;
  lastError: string | null;
  queuedAt: string;
};

export const KIND_LABELS: Record<CaptureKind, string> = {
  'field-submission': 'Field submission',
  'wash-reading': 'Wash reading',
  attendance: 'Meeting register',
  inspection: 'Inspection',
  complaint: 'Complaint',
  permit: 'Permit',
  equipment: 'Equipment',
  cost: 'Site cost',
  message: 'Message',
  photo: 'Photo',
};
