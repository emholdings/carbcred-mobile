import { api } from '@api/client';

export type Dashboard = {
  overview: {
    programmes: number;
    projects: number;
    active_workflows: number;
    open_tasks: number;
    open_requisitions: number;
  };
  insights: { tone: string; title: string; body: string; href: string | null }[];
  tip: { title: string; body: string };
};

/**
 * The platform's own read on the day — the counts, the insights it thinks are
 * worth raising, and the field tip. Everything else on home is built from site
 * readings; see monitoring.ts.
 */
export async function fetchDashboard(): Promise<Dashboard> {
  return (await api.get<{ data: Dashboard }>('/dashboard')).data.data;
}
