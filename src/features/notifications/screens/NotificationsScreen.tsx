import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CircleDollarSign,
  MapPin,
  MessageSquareWarning,
  ShieldAlert,
  ShieldCheck,
  Ticket as TicketIcon,
} from 'lucide-react-native';
import { BrandScreen } from '@shared/components/BrandScreen';
import { Tap } from '@shared/components/Tap';
import { QueryState } from '@shared/components/QueryState';
import { brand } from '@theme/colors';
import { useTheme } from '@theme/useTheme';
import { fetchNotifications, markAllRead, markRead, type Notice } from '../api';

type Navigate = (screen: string, params?: object) => void;

/**
 * What happened while you were not looking.
 *
 * Deliberately not the Tasks queue: that answers "what is waiting for you to
 * decide", and burying an event nobody has to act on inside a list of pending
 * decisions is how both get ignored. Your reading was queried, a ticket landed
 * on you, a complaint came in at your site — none of those are decisions, and
 * all of them are things somebody needs to know today.
 */
export function NotificationsScreen({ navigation }: { navigation: { navigate: Navigate; goBack: () => void } }) {
  const { scheme } = useTheme();
  const queryClient = useQueryClient();

  const centre = useQuery({ queryKey: ['notifications'], queryFn: fetchNotifications });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });

  const read = useMutation({ mutationFn: markRead, onSuccess: refresh });
  const readAll = useMutation({ mutationFn: markAllRead, onSuccess: refresh });

  const open = (notice: Notice) => {
    if (!notice.read_at) {
      read.mutate(notice.id);
    }

    if (notice.site_id !== null) {
      navigation.navigate('Rivers', {
        screen: 'SiteDetail',
        params: { siteId: notice.site_id, name: notice.site ?? 'Site' },
      });
    }
  };

  return (
    <BrandScreen
      title="What happened"
      subtitle={centre.data?.unread ? `${centre.data.unread} unread` : 'Nothing unread'}
    >
      <ScrollView
        contentContainerStyle={{ gap: 12, paddingVertical: 18 }}
        refreshControl={
          <RefreshControl refreshing={centre.isRefetching} onRefresh={centre.refetch} tintColor={scheme.textMuted} />
        }
      >
        <QueryState
          query={centre}
          isEmpty={(value) => value.items.length === 0}
          emptyTitle="Nothing yet"
          emptyBody="When a reading of yours is decided, a ticket lands on you, or a complaint comes in at your site, it appears here."
          skeletonRows={4}
        >
          {(value) => (
            <>
              {value.unread > 0 ? (
                <Tap
                  onPress={() => readAll.mutate()}
                  style={{ alignSelf: 'flex-end' }}
                  hitSlop={8}
                  disabled={readAll.isPending}
                >
                  <Text style={{ color: brand.deepLeaf, fontSize: 14, fontWeight: '700' }}>Mark all read</Text>
                </Tap>
              ) : null}

              {value.items.map((notice) => (
                <Tap
                  key={notice.id}
                  onPress={() => open(notice)}
                  style={{
                    flexDirection: 'row',
                    gap: 12,
                    backgroundColor: notice.read_at ? scheme.background : scheme.surface,
                    borderColor: notice.read_at ? scheme.border : brand.leaf,
                    borderWidth: 1,
                    borderRadius: 14,
                    padding: 15,
                  }}
                >
                  <View style={{ paddingTop: 2 }}>
                    <NoticeIcon kind={notice.kind} />
                  </View>

                  <View style={{ flex: 1, gap: 3 }}>
                    <Text
                      style={{
                        color: scheme.text,
                        fontSize: 15,
                        fontWeight: notice.read_at ? '500' : '700',
                      }}
                    >
                      {notice.title}
                    </Text>
                    {notice.body ? (
                      <Text style={{ color: scheme.textMuted, fontSize: 13, lineHeight: 19 }}>{notice.body}</Text>
                    ) : null}
                    <Text style={{ color: scheme.textMuted, fontSize: 12 }}>{when(notice.created_at)}</Text>
                  </View>
                </Tap>
              ))}
            </>
          )}
        </QueryState>
      </ScrollView>
    </BrandScreen>
  );
}

/** The kind of thing that happened, at a glance. */
function NoticeIcon({ kind }: { kind: string }) {
  const { scheme } = useTheme();

  if (kind === 'reading.verified' || kind === 'submission.approved') {
    return <ShieldCheck color={brand.deepLeaf} size={20} />;
  }

  if (kind === 'reading.queried' || kind === 'submission.flagged') {
    return <ShieldAlert color={scheme.danger} size={20} />;
  }

  if (kind === 'ticket.assigned') {
    return <TicketIcon color={brand.deepLeaf} size={20} />;
  }

  if (kind === 'complaint.logged') {
    return <MessageSquareWarning color="#b06a00" size={20} />;
  }

  if (kind === 'site.allocated') {
    return <MapPin color={brand.deepLeaf} size={20} />;
  }

  return <CircleDollarSign color={scheme.textMuted} size={20} />;
}

function when(iso: string | null): string {
  if (!iso) {
    return '';
  }

  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);

  if (minutes < 1) {
    return 'just now';
  }

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.round(minutes / 60);

  if (hours < 24) {
    return hours === 1 ? 'an hour ago' : `${hours} hours ago`;
  }

  const days = Math.round(hours / 24);

  return days === 1 ? 'yesterday' : `${days} days ago`;
}
