import type { ReactNode } from 'react';
import { CloudOff, Inbox, TriangleAlert } from 'lucide-react-native';
import type { UseQueryResult } from '@tanstack/react-query';
import { errorMessage } from '@api/client';
import { useIsOnline } from '@shared/hooks/useIsOnline';
import { useTheme } from '@theme/useTheme';
import { SkeletonList } from './Skeleton';
import { StateMessage } from './StateMessage';

/**
 * What a screen says before it has content: still asking, could not ask, or
 * nothing saved for this phone yet — and nothing at all once content arrives.
 *
 * Split out from QueryState because a detail page cannot hand its whole body
 * to a render prop without being rewritten around it, and the failure it would
 * otherwise show is the dangerous one: a page that dies quietly looks like a
 * page with no data, and the person standing on the site believes there are no
 * inspections when the request simply never landed.
 */
export function LoadState<T>({ query, rows }: { query: UseQueryResult<T>; rows?: number }) {
  const { scheme } = useTheme();
  const online = useIsOnline();

  if (query.data !== undefined) {
    return null;
  }

  if (query.isLoading) {
    return <SkeletonList rows={rows ?? 3} />;
  }

  if (query.isError) {
    return online ? (
      <StateMessage
        icon={<TriangleAlert color={scheme.danger} size={30} />}
        tone="problem"
        title="That did not load"
        body={errorMessage(query.error, 'The server did not answer.')}
        action="Try again"
        onAction={() => query.refetch()}
      />
    ) : (
      <StateMessage
        icon={<CloudOff color={scheme.textMuted} size={30} />}
        title="Nothing saved for this yet"
        body="This phone has not seen this screen while online, so there is nothing to show until you have signal."
      />
    );
  }

  return null;
}

/**
 * The same three answers, plus the fourth a list can give: it loaded, and it is
 * empty. Hands the data to its children once there is any.
 */
export function QueryState<T>({
  query,
  isEmpty,
  emptyTitle,
  emptyBody,
  skeletonRows,
  children,
}: {
  query: UseQueryResult<T>;
  isEmpty?: (data: T) => boolean;
  emptyTitle: string;
  emptyBody?: string;
  skeletonRows?: number;
  children: (data: T) => ReactNode;
}) {
  const { scheme } = useTheme();

  // Cached data beats every message here: if there is something to show, show
  // it, even while a refetch is failing in the background.
  if (query.data !== undefined) {
    if (isEmpty?.(query.data)) {
      return <StateMessage icon={<Inbox color={scheme.textMuted} size={30} />} title={emptyTitle} body={emptyBody} />;
    }

    return <>{children(query.data)}</>;
  }

  return <LoadState query={query} rows={skeletonRows} />;
}
