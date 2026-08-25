import type { QueryClient } from '@tanstack/react-query';
import { fetchSite, fetchSites, type SiteDetail } from '@features/sites/api';

/** How long a site can go without a reading before somebody should chase it. */
const QUIET_AFTER_DAYS = 3;

/** The window the home screen judges the week by. */
const WEEK = 7;

/** How many days of combined wash the chart shows. */
const CHART_DAYS = 10;

export type SiteMonitor = {
  id: number;
  name: string;
  river: string | null;
  project: string | null;
  operator: string | null;
  status: string;
  stage: string | null;
  tonnesThisWeek: number;
  efficiency: number | null;
  lastReadingDate: string | null;
  daysQuiet: number | null;
  openComplaints: number;
};

export type Monitoring = {
  sites: SiteMonitor[];
  rivers: number;
  allocated: number;
  unallocated: number;
  reporting: number;
  openComplaints: number;
  tonnesThisWeek: number;
  tonnesLastWeek: number;
  series: { label: string; actual: number; expected: number | null }[];
};

/**
 * The operation as one picture: every site this person is allowed to see, and
 * what its wash plant has been doing.
 *
 * The home screen used to lead on a single project's phase count, which told an
 * administrator nothing they act on — a phase moves once a quarter, while a
 * wash plant either ran yesterday or did not. So home is built from readings
 * instead, summed across sites for the shape of the week and kept per-site for
 * the two questions that actually generate work: who has gone quiet, and which
 * cell has nobody on it.
 *
 * Scoping is the server's job: /sites already answers with what the caller may
 * see, so a contractor gets its own sites and CarbCred gets the lot, with no
 * role check written here.
 *
 * Site details come through the query cache — the same keys the site page and
 * the offline warm-up use — so this costs nothing extra when the phone has
 * already pulled them down, and works with no signal once it has.
 */
export async function fetchMonitoring(queryClient: QueryClient, slug: string): Promise<Monitoring> {
  const rows = await queryClient.ensureQueryData({
    queryKey: ['sites', slug, 'all'],
    queryFn: () => fetchSites(slug),
  });

  const details = await Promise.all(
    rows.map((row) =>
      queryClient
        .ensureQueryData({ queryKey: ['site', slug, row.id], queryFn: () => fetchSite(slug, row.id) })
        .catch((): SiteDetail | null => null),
    ),
  );

  const today = startOfDay(new Date());
  const sites: SiteMonitor[] = [];

  // Combined wash by date, so one chart speaks for the whole operation.
  const byDate = new Map<string, { actual: number; expected: number | null }>();
  let tonnesThisWeek = 0;
  let tonnesLastWeek = 0;

  rows.forEach((row, index) => {
    const detail = details[index];
    const performance = detail?.operations.performance ?? [];

    let weekTonnes = 0;
    let weighted = 0;
    let weightedDays = 0;

    for (const reading of performance) {
      const age = daysBetween(startOfDay(new Date(reading.date)), today);

      const combined = byDate.get(reading.date) ?? { actual: 0, expected: null };
      combined.actual += reading.actual;
      combined.expected = (combined.expected ?? 0) + (reading.expected ?? 0);
      byDate.set(reading.date, combined);

      if (age < WEEK) {
        weekTonnes += reading.actual;
        tonnesThisWeek += reading.actual;
      } else if (age < WEEK * 2) {
        tonnesLastWeek += reading.actual;
      }

      if (age < WEEK && reading.efficiency !== null) {
        weighted += reading.efficiency;
        weightedDays += 1;
      }
    }

    const lastReadingDate = performance.at(-1)?.date ?? null;

    sites.push({
      id: row.id,
      name: row.name,
      river: row.river,
      project: row.project,
      operator: row.operator,
      status: row.status,
      stage: detail?.operations.mobilization?.stage ?? null,
      tonnesThisWeek: weekTonnes,
      efficiency: weightedDays > 0 ? Math.round(weighted / weightedDays) : null,
      lastReadingDate,
      daysQuiet: lastReadingDate ? daysBetween(startOfDay(new Date(lastReadingDate)), today) : null,
      openComplaints: detail?.operations.open_complaints ?? 0,
    });
  });

  const series = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-CHART_DAYS)
    .map(([date, totals]) => ({
      label: date.slice(5),
      actual: totals.actual,
      expected: totals.expected || null,
    }));

  return {
    sites: sites.sort((a, b) => b.tonnesThisWeek - a.tonnesThisWeek),
    rivers: new Set(rows.map((row) => row.river).filter(Boolean)).size,
    allocated: sites.filter((site) => site.operator !== null).length,
    unallocated: sites.filter((site) => site.operator === null).length,
    reporting: sites.filter((site) => site.daysQuiet !== null && site.daysQuiet < QUIET_AFTER_DAYS).length,
    openComplaints: sites.reduce((total, site) => total + site.openComplaints, 0),
    tonnesThisWeek,
    tonnesLastWeek,
    series,
  };
}

/**
 * Sites somebody has to do something about, worst first: a plant that has
 * stopped reporting, then a cell nobody has been engaged on.
 */
export function needsAttention(monitoring: Monitoring): { site: SiteMonitor; reason: string }[] {
  const quiet = monitoring.sites
    .filter((site) => site.daysQuiet !== null && site.daysQuiet >= QUIET_AFTER_DAYS)
    .map((site) => ({ site, reason: `No wash reading for ${site.daysQuiet} days` }));

  const idle = monitoring.sites
    .filter((site) => site.operator === null)
    .map((site) => ({ site, reason: 'No contractor allocated yet' }));

  const complaining = monitoring.sites
    .filter((site) => site.openComplaints > 0)
    .map((site) => ({
      site,
      reason: `${site.openComplaints} open ${site.openComplaints === 1 ? 'complaint' : 'complaints'}`,
    }));

  return [...quiet, ...complaining, ...idle];
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}
