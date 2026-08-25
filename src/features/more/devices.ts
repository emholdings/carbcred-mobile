import { api } from '@api/client';

export type Device = {
  id: number;
  name: string;
  last_used_at: string | null;
  created_at: string | null;
  expires_at: string | null;
  /** The handset making the request — never cut off by accident. */
  current: boolean;
};

export async function fetchDevices(): Promise<Device[]> {
  return (await api.get<{ data: Device[] }>('/auth/devices')).data.data;
}

export async function revokeDevice(id: number): Promise<void> {
  await api.delete(`/auth/devices/${id}`);
}

export async function revokeOtherDevices(): Promise<void> {
  await api.delete('/auth/devices/others');
}
