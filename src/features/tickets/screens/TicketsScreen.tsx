import { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Plus } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BrandScreen } from '@shared/components/BrandScreen';
import { Tap } from '@shared/components/Tap';
import { QueryState } from '@shared/components/QueryState';
import type { MoreStackParamList } from '@navigation/types';
import { useAuthStore } from '@stores/authStore';
import { brand } from '@theme/colors';
import { useTheme } from '@theme/useTheme';
import { fetchTickets, fetchVocabulary, label, PRIORITY_COLOURS, type Ticket, type TicketFilters } from '../api';

type Props = NativeStackScreenProps<MoreStackParamList, 'Tickets'>;

/**
 * The one queue: complaints, security incidents, breakdowns, safety issues.
 * Filters are the ones a person actually works by — mine, unassigned, overdue —
 * rather than every field the API can narrow on.
 */
export function TicketsScreen({ navigation }: Props) {
  const { scheme } = useTheme();
  const slug = useAuthStore((state) => state.organisationSlug);
  const [filters, setFilters] = useState<TicketFilters>({});

  const vocabulary = useQuery({ queryKey: ['ticket-vocabulary'], queryFn: fetchVocabulary, staleTime: 60 * 60 * 1000 });

  const query = useQuery({
    queryKey: ['tickets', slug, filters],
    queryFn: () => fetchTickets(slug!, filters),
    enabled: Boolean(slug),
  });
  const { data, refetch, isRefetching } = query;

  const toggle = (change: TicketFilters) =>
    setFilters((current) => {
      const [key] = Object.keys(change) as (keyof TicketFilters)[];

      return current[key] === change[key] ? { ...current, [key]: undefined } : { ...current, ...change };
    });

  return (
    <BrandScreen title="Tickets" subtitle={data ? `${data.length} in the queue` : undefined}>
      <ScrollView
        contentContainerStyle={{ gap: 12, paddingVertical: 18 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={scheme.textMuted} />}
      >
        <Tap
          onPress={() => navigation.navigate('LogTicket')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: brand.deepLeaf,
            borderRadius: 14,
            padding: 15,
          }}
        >
          <Plus color={brand.cream} size={20} />
          <Text style={{ color: brand.cream, fontSize: 16, fontWeight: '700' }}>Log something</Text>
        </Tap>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Chip label="Mine" on={filters.assigned === 'me'} onPress={() => toggle({ assigned: 'me' })} />
          <Chip label="Unassigned" on={filters.assigned === 'unassigned'} onPress={() => toggle({ assigned: 'unassigned' })} />
          <Chip label="Overdue" on={filters.overdue === true} onPress={() => toggle({ overdue: true })} />
          {vocabulary.data?.categories.map((category) => (
            <Chip
              key={category.slug}
              label={category.name}
              on={filters.category === category.slug}
              onPress={() => toggle({ category: category.slug })}
            />
          ))}
        </ScrollView>
        <QueryState
          query={query}
          isEmpty={(value) => value.length === 0}
          emptyTitle="No tickets here"
          emptyBody="Tickets you raise or are assigned show up in this list."
          skeletonRows={4}
        >
          {(list) => (
            <>
              {list.map((ticket: Ticket) => (
                <Tap
                  key={ticket.id}
                  onPress={() => navigation.navigate('TicketDetail', { ticketId: ticket.id, reference: ticket.reference })}
                  style={{
                    backgroundColor: scheme.surface,
                    borderColor: ticket.is_overdue ? scheme.danger : scheme.border,
                    borderWidth: 1,
                    borderLeftWidth: 5,
                    borderLeftColor: PRIORITY_COLOURS[ticket.priority],
                    borderRadius: 14,
                    padding: 15,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={{ color: scheme.text, fontSize: 15, fontWeight: '600' }}>{ticket.title}</Text>
                    <Text style={{ color: scheme.textMuted, fontSize: 12 }}>
                      {[ticket.reference, ticket.category?.name, label(ticket.status)].filter(Boolean).join(' · ')}
                    </Text>
                    <Text style={{ color: ticket.is_overdue ? scheme.danger : scheme.textMuted, fontSize: 12 }}>
                      {ticket.is_overdue ? 'Overdue' : ticket.assignee ? `With ${ticket.assignee}` : 'Nobody assigned'}
                    </Text>
                  </View>
                  <ChevronRight color={scheme.textMuted} size={20} />
                </Tap>
              ))}
            </>
          )}
        </QueryState>
      </ScrollView>
    </BrandScreen>
  );
}

function Chip({ label: text, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const { scheme } = useTheme();

  return (
    <Tap
      onPress={onPress}
      style={{
        backgroundColor: on ? brand.deepLeaf : scheme.surface,
        borderColor: on ? brand.deepLeaf : scheme.border,
        borderWidth: 1,
        borderRadius: 18,
        paddingVertical: 7,
        paddingHorizontal: 13,
      }}
    >
      <Text style={{ color: on ? brand.cream : scheme.text, fontSize: 13, fontWeight: '600' }}>{text}</Text>
    </Tap>
  );
}
