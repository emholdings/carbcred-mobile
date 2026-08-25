import { useState } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '@api/client';
import { Button } from '@shared/components/Button';
import { BrandScreen } from '@shared/components/BrandScreen';
import { LoadState } from '@shared/components/QueryState';
import { TextField } from '@shared/components/TextField';
import { clientRef } from '@features/capture/clientRef';
import { useQueueStore } from '@features/capture/queue';
import type { MoreStackParamList } from '@navigation/types';
import { useAuthStore } from '@stores/authStore';
import { brand } from '@theme/colors';
import { useTheme } from '@theme/useTheme';

type Props = NativeStackScreenProps<MoreStackParamList, 'Discussion'>;

type Message = {
  id: number;
  body: string;
  author: string;
  author_id: number | null;
  created_at: string | null;
};

/**
 * The project thread, where decisions the field needs to know about land.
 *
 * Posting goes through the write queue like every capture, so a message typed
 * on a site with no signal is held rather than lost — and appears in the thread
 * as pending until it files.
 */
export function DiscussionScreen({ route }: Props) {
  const { scheme } = useTheme();
  const slug = useAuthStore((state) => state.organisationSlug);
  const me = useAuthStore((state) => state.user);
  const enqueue = useQueueStore((state) => state.enqueue);
  const queued = useQueueStore((state) => state.items);
  const { projectSlug, name } = route.params;

  const [body, setBody] = useState('');

  const query = useQuery({
    queryKey: ['messages', slug, projectSlug],
    queryFn: async () =>
      (
        await api.get<{ data: Message[] }>(
          `/organisations/${slug}/projects/${projectSlug}/messages`,
        )
      ).data.data,
    enabled: Boolean(slug),
  });
  const { data, refetch, isRefetching } = query;

  // Anything still on the phone for this thread, shown at the bottom where it
  // will land once it files.
  const pending = queued.filter(
    (item) => item.kind === 'message' && item.endpoint.includes(`/projects/${projectSlug}/messages`),
  );

  const post = async () => {
    await enqueue({
      kind: 'message',
      endpoint: `/organisations/${slug}/projects/${projectSlug}/messages`,
      label: 'Message',
      context: name,
      payload: { client_ref: clientRef(), body: body.trim() },
    });

    setBody('');
  };

  return (
    <BrandScreen title="Discussion" subtitle={name}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          contentContainerStyle={{ gap: 10, paddingVertical: 16 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={scheme.textMuted} />}
        >
          <LoadState query={query} rows={4} />

          {data?.map((message) => {
            const mine = message.author_id === me?.id;

            return (
              <View
                key={message.id}
                style={{
                  backgroundColor: mine ? brand.deepLeaf : scheme.surface,
                  borderColor: mine ? brand.deepLeaf : scheme.border,
                  borderWidth: 1,
                  borderRadius: 14,
                  padding: 13,
                  gap: 3,
                  maxWidth: '92%',
                  alignSelf: mine ? 'flex-end' : 'flex-start',
                }}
              >
                <Text style={{ color: mine ? brand.cream : scheme.text, fontSize: 14, lineHeight: 20 }}>
                  {message.body}
                </Text>
                <Text
                  style={{
                    color: mine ? 'rgba(250,247,241,0.7)' : scheme.textMuted,
                    fontSize: 11,
                  }}
                >
                  {message.author}
                  {message.created_at ? ` · ${message.created_at.slice(0, 16).replace('T', ' ')}` : ''}
                </Text>
              </View>
            );
          })}

          {pending.map((item) => (
            <View
              key={item.payload.client_ref}
              style={{
                backgroundColor: scheme.surface,
                borderColor: brand.leaf,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderRadius: 14,
                padding: 13,
                gap: 3,
                maxWidth: '92%',
                alignSelf: 'flex-end',
              }}
            >
              <Text style={{ color: scheme.text, fontSize: 14, lineHeight: 20 }}>
                {String(item.payload.body ?? '')}
              </Text>
              <Text style={{ color: scheme.textMuted, fontSize: 11 }}>
                {item.status === 'failed' ? item.lastError : 'Waiting for signal'}
              </Text>
            </View>
          ))}

          {data?.length === 0 && pending.length === 0 ? (
            <Text style={{ color: scheme.textMuted, fontSize: 14 }}>
              Nothing said yet. Anything posted here reaches everyone on the project.
            </Text>
          ) : null}
        </ScrollView>

        <View style={{ gap: 10, paddingBottom: 16 }}>
          <TextField label="Say something" value={body} onChangeText={setBody} placeholder="To the project" multiline />
          <Button label="Post" onPress={post} disabled={body.trim().length === 0} />
        </View>
      </KeyboardAvoidingView>
    </BrandScreen>
  );
}
