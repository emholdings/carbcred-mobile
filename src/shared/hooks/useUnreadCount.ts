import { useQuery } from '@tanstack/react-query';
import { fetchNotifications } from '@features/notifications/api';
import { useAuthStore } from '@stores/authStore';

/**
 * How much has happened that this person has not seen, for the bell.
 *
 * The bell used to count the approvals inbox, which the Tasks tab already
 * carries — two controls counting the same thing, and nowhere at all for an
 * event that needs no decision. The bell now belongs to the notification
 * centre, and Tasks keeps the queue.
 */
export function useUnreadCount(): number {
  const token = useAuthStore((state) => state.token);

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    enabled: Boolean(token),
    staleTime: 60 * 1000,
  });

  return data?.unread ?? 0;
}
