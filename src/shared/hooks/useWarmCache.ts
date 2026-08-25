import { useEffect } from 'react';
import { onlineManager, useQueryClient } from '@tanstack/react-query';
import { fetchDashboard } from '@features/home/api';
import { fetchCompliance } from '@features/more/compliance';
import { fetchEmergencyContacts } from '@features/more/api';
import { fetchRivers } from '@features/rivers/api';
import { fetchSite, fetchSites } from '@features/sites/api';
import { fetchInbox } from '@features/tasks/api';
import { fetchVocabulary } from '@features/tickets/api';
import { useAuthStore } from '@stores/authStore';

/** Site details are the heaviest thing here; enough for a trip, not the world. */
const SITE_LIMIT = 25;

/**
 * Pull down what someone will need before they lose signal.
 *
 * The query cache is persisted, so anything fetched once is readable offline —
 * but only what they happened to open. Somebody who drives to a river without
 * opening the site page first arrives with nothing. So while there is signal,
 * the app quietly fetches the things that answer questions on the ground: the
 * geography, every site it can reach and that site's whole operations picture,
 * the emergency numbers, and what is waiting on them.
 *
 * Runs on sign-in and again whenever connectivity returns.
 */
export function useWarmCache(): void {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const slug = useAuthStore((state) => state.organisationSlug);

  useEffect(() => {
    if (!token || !slug) {
      return;
    }

    let cancelled = false;

    const warm = async () => {
      if (!onlineManager.isOnline() || cancelled) {
        return;
      }

      const prefetch = <T,>(key: unknown[], fn: () => Promise<T>) =>
        queryClient.prefetchQuery({ queryKey: key, queryFn: fn }).catch(() => {
          // A screen this person cannot reach is not an error worth surfacing;
          // the warm-up takes what it is allowed and leaves the rest.
        });

      await Promise.all([
        prefetch(['dashboard'], fetchDashboard),
        prefetch(['rivers'], fetchRivers),
        prefetch(['approvals', null], () => fetchInbox()),
        prefetch(['ticket-vocabulary'], fetchVocabulary),
        prefetch(['emergency-contacts', slug], () => fetchEmergencyContacts(slug)),
        prefetch(['compliance', slug], () => fetchCompliance(slug)),
        prefetch(['sites', slug, 'all'], () => fetchSites(slug)),
      ]);

      if (cancelled) {
        return;
      }

      // Each site's full operations picture — the page most likely to be wanted
      // standing on the site itself, where there is least chance of signal.
      const sites = queryClient.getQueryData<{ id: number }[]>(['sites', slug, 'all']) ?? [];

      for (const site of sites.slice(0, SITE_LIMIT)) {
        if (cancelled || !onlineManager.isOnline()) {
          break;
        }

        await prefetch(['site', slug, site.id], () => fetchSite(slug, site.id));
      }
    };

    void warm();

    const unsubscribe = onlineManager.subscribe((online) => {
      if (online) {
        void warm();
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [queryClient, token, slug]);
}
