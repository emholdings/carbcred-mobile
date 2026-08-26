import { api } from '@api/client';

export type Notice = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  record: string | null;
  record_id: number | null;
  site_id: number | null;
  site: string | null;
  organisation_id: number | null;
  read_at: string | null;
  created_at: string | null;
};

export type Centre = { unread: number; items: Notice[] };

/** What happened, as against what is waiting for you to decide. */
export async function fetchNotifications(): Promise<Centre> {
  return (await api.get<{ data: Centre }>('/notifications')).data.data;
}

export async function markRead(id: string): Promise<void> {
  await api.post(`/notifications/${id}/read`);
}

export async function markAllRead(): Promise<void> {
  await api.post('/notifications/read-all');
}
