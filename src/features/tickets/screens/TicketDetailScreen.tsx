import { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { errorMessage } from '@api/client';
import { BrandScreen } from '@shared/components/BrandScreen';
import { LoadState } from '@shared/components/QueryState';
import { TextField } from '@shared/components/TextField';
import { Button } from '@shared/components/Button';
import type { MoreStackParamList } from '@navigation/types';
import { useAuthStore } from '@stores/authStore';
import { brand } from '@theme/colors';
import { useTheme } from '@theme/useTheme';
import {
  commentOnTicket,
  fetchTicket,
  label,
  PRIORITY_COLOURS,
  transitionTicket,
  type TicketEvent,
  type TicketStatus,
} from '../api';

type Props = NativeStackScreenProps<MoreStackParamList, 'TicketDetail'>;

/**
 * One ticket, its timeline, and the moves the platform will accept from where
 * it stands. The buttons come from the ticket's own available_transitions, so
 * the app never offers a move the server would refuse.
 */
export function TicketDetailScreen({ route }: Props) {
  const { scheme } = useTheme();
  const queryClient = useQueryClient();
  const slug = useAuthStore((state) => state.organisationSlug);
  const { ticketId, reference } = route.params;
  const [note, setNote] = useState('');

  const query = useQuery({
    queryKey: ['ticket', slug, ticketId],
    queryFn: () => fetchTicket(slug!, ticketId),
    enabled: Boolean(slug),
  });
  const { data, refetch, isRefetching } = query;

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['ticket', slug, ticketId] });
    void queryClient.invalidateQueries({ queryKey: ['tickets'] });
    void queryClient.invalidateQueries({ queryKey: ['approvals'] });
  };

  const move = useMutation({
    mutationFn: (status: TicketStatus) => transitionTicket(slug!, ticketId, status, note.trim() || undefined),
    onSuccess: () => {
      setNote('');
      refresh();
    },
    onError: (error) => Alert.alert('Not moved', errorMessage(error, 'That move was refused.')),
  });

  const comment = useMutation({
    mutationFn: () => commentOnTicket(slug!, ticketId, note.trim()),
    onSuccess: () => {
      setNote('');
      refresh();
    },
    onError: (error) => Alert.alert('Not saved', errorMessage(error, 'That note did not save.')),
  });

  const busy = move.isPending || comment.isPending;

  return (
    <BrandScreen title={reference} subtitle={data?.category?.name ?? undefined}>
      <ScrollView
        contentContainerStyle={{ gap: 14, paddingVertical: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={scheme.textMuted} />}
      >
        <LoadState query={query} rows={4} />

        {data ? (
          <>
            <View
              style={{
                backgroundColor: scheme.surface,
                borderColor: scheme.border,
                borderWidth: 1,
                borderLeftWidth: 5,
                borderLeftColor: PRIORITY_COLOURS[data.priority],
                borderRadius: 16,
                padding: 16,
                gap: 6,
              }}
            >
              <Text style={{ color: scheme.text, fontSize: 18, fontWeight: '700' }}>{data.title}</Text>
              {data.description ? (
                <Text style={{ color: scheme.textMuted, fontSize: 14, lineHeight: 20 }}>{data.description}</Text>
              ) : null}
              <Text style={{ color: scheme.textMuted, fontSize: 13 }}>
                {[label(data.status), `${data.priority} priority`, data.site, data.assignee ? `with ${data.assignee}` : 'unassigned']
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              {data.due_at ? (
                <Text style={{ color: data.is_overdue ? scheme.danger : scheme.textMuted, fontSize: 13, fontWeight: '600' }}>
                  {data.is_overdue ? 'Overdue' : 'Due'} {data.due_at.slice(0, 16).replace('T', ' ')}
                </Text>
              ) : null}
              {data.grievance_reference ? (
                <Text style={{ color: scheme.textMuted, fontSize: 12 }}>
                  Community record {data.grievance_reference}
                </Text>
              ) : null}
            </View>

            <TextField
              label="Add a note"
              value={note}
              onChangeText={setNote}
              placeholder="What happened, or why you are moving it"
              multiline
            />

            <Button
              label="Save note"
              onPress={() => comment.mutate()}
              loading={comment.isPending}
              disabled={note.trim().length === 0 || busy}
            />

            {data.available_transitions.length ? (
              <View style={{ gap: 8 }}>
                <Text style={{ color: scheme.textMuted, fontSize: 13, fontWeight: '600' }}>Move it to</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {data.available_transitions.map((status) => (
                    <Pressable
                      key={status}
                      onPress={() => move.mutate(status)}
                      disabled={busy}
                      style={{
                        backgroundColor: scheme.surface,
                        borderColor: brand.deepLeaf,
                        borderWidth: 1,
                        borderRadius: 10,
                        paddingVertical: 10,
                        paddingHorizontal: 14,
                        opacity: busy ? 0.5 : 1,
                      }}
                    >
                      <Text style={{ color: brand.deepLeaf, fontSize: 14, fontWeight: '600' }}>{label(status)}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            <View
              style={{
                backgroundColor: scheme.surface,
                borderColor: scheme.border,
                borderWidth: 1,
                borderRadius: 16,
                padding: 16,
                gap: 12,
              }}
            >
              <Text style={{ color: scheme.text, fontSize: 16, fontWeight: '700' }}>Timeline</Text>
              {(data.events ?? []).map((event: TicketEvent) => (
                <View key={event.id} style={{ flexDirection: 'row', gap: 10 }}>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      marginTop: 6,
                      backgroundColor: event.kind === 'comment' ? scheme.textMuted : brand.deepLeaf,
                    }}
                  />
                  <View style={{ flex: 1, gap: 1 }}>
                    <Text style={{ color: scheme.text, fontSize: 14 }}>{describe(event)}</Text>
                    <Text style={{ color: scheme.textMuted, fontSize: 12 }}>
                      {[event.actor, event.created_at?.slice(0, 16).replace('T', ' ')].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </BrandScreen>
  );
}

/** The event in a sentence, using the meta the API attached to it. */
function describe(event: TicketEvent): string {
  const from = event.meta.from as string | undefined;
  const to = event.meta.to as string | undefined;

  switch (event.kind) {
    case 'created':
      return `Opened as ${event.meta.priority ?? 'a ticket'} via ${event.meta.channel ?? 'the platform'}`;
    case 'assigned':
      return `Assigned to ${event.meta.assignee ?? 'someone'}`;
    case 'status_changed':
      return `Moved from ${label(from ?? '')} to ${label(to ?? '')}${event.note ? ` — ${event.note}` : ''}`;
    case 'priority_changed':
      return `Priority ${from} to ${to}`;
    default:
      return event.note ?? 'Note';
  }
}
