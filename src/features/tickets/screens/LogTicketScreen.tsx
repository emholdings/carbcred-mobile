import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { MapPin } from 'lucide-react-native';
import { Button } from '@shared/components/Button';
import { BrandScreen } from '@shared/components/BrandScreen';
import { TextField } from '@shared/components/TextField';
import { clientRef } from '@features/capture/clientRef';
import { useQueueStore } from '@features/capture/queue';
import { fetchSites } from '@features/sites/api';
import type { MoreStackParamList } from '@navigation/types';
import { useAuthStore } from '@stores/authStore';
import { brand } from '@theme/colors';
import { useTheme } from '@theme/useTheme';
import { fetchVocabulary, PRIORITY_COLOURS, type TicketPriority } from '../api';

type Props = NativeStackScreenProps<MoreStackParamList, 'LogTicket'>;

/**
 * Log anything reported: a complaint, an incident, a breakdown, a safety issue.
 * The category decides the priority and the SLA clock unless the person says
 * otherwise, so the form asks for as little as it can get away with.
 */
export function LogTicketScreen({ navigation }: Props) {
  const { scheme } = useTheme();
  const slug = useAuthStore((state) => state.organisationSlug);
  const enqueue = useQueueStore((state) => state.enqueue);

  const [category, setCategory] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority | null>(null);
  const [siteId, setSiteId] = useState<number | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const vocabulary = useQuery({ queryKey: ['ticket-vocabulary'], queryFn: fetchVocabulary, staleTime: 60 * 60 * 1000 });
  const sites = useQuery({ queryKey: ['sites', slug, 'all'], queryFn: () => fetchSites(slug!), enabled: Boolean(slug) });

  const chosen = vocabulary.data?.categories.find((candidate) => candidate.slug === category);

  const takeLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      return;
    }

    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
  };

  const file = async () => {
    if (!category || !title.trim()) {
      return;
    }

    await enqueue({
      kind: 'complaint',
      endpoint: `/organisations/${slug}/tickets`,
      label: 'Ticket',
      context: sites.data?.find((site) => site.id === siteId)?.name ?? chosen?.name ?? 'Ticket',
      payload: {
        client_ref: clientRef(),
        category,
        title: title.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(priority ? { priority } : {}),
        ...(siteId ? { site_id: siteId } : {}),
        ...(coords ? { latitude: coords.latitude, longitude: coords.longitude } : {}),
      },
    });

    Alert.alert('Logged', 'Saved on the phone. It files itself when you have signal.');
    navigation.goBack();
  };

  return (
    <BrandScreen title="Log something" subtitle="Complaint, incident, breakdown or safety">
      <ScrollView contentContainerStyle={{ gap: 16, paddingVertical: 18 }} keyboardShouldPersistTaps="handled">
        <Field label="What kind">
          <View style={{ gap: 8 }}>
            {vocabulary.data?.categories.map((option) => (
              <Choice
                key={option.slug}
                label={option.name}
                hint={option.sla_hours ? `${option.sla_hours}h to respond · starts ${option.default_priority}` : 'No SLA'}
                selected={category === option.slug}
                onPress={() => setCategory(option.slug)}
              />
            ))}
          </View>
        </Field>

        <TextField label="What happened" value={title} onChangeText={setTitle} placeholder="One line" />
        <TextField
          label="Detail"
          value={description}
          onChangeText={setDescription}
          placeholder="Optional — what a person arriving would need to know"
          multiline
        />

        {chosen ? (
          <Field label={`Priority — ${chosen.default_priority} unless you change it`}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {vocabulary.data?.priorities.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setPriority(priority === option ? null : option)}
                  style={{
                    backgroundColor: priority === option ? PRIORITY_COLOURS[option] : scheme.surface,
                    borderColor: PRIORITY_COLOURS[option],
                    borderWidth: 1,
                    borderRadius: 10,
                    paddingVertical: 9,
                    paddingHorizontal: 14,
                  }}
                >
                  <Text
                    style={{
                      color: priority === option ? '#ffffff' : scheme.text,
                      fontSize: 14,
                      fontWeight: '600',
                    }}
                  >
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Field>
        ) : null}

        {sites.data?.length ? (
          <Field label="Where (optional)">
            <View style={{ gap: 8 }}>
              {sites.data.map((site) => (
                <Choice
                  key={site.id}
                  label={site.name}
                  hint={site.code}
                  selected={siteId === site.id}
                  onPress={() => setSiteId(siteId === site.id ? null : site.id)}
                />
              ))}
            </View>
          </Field>
        ) : null}

        <Pressable
          onPress={takeLocation}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: scheme.surface,
            borderColor: scheme.border,
            borderWidth: 1,
            borderRadius: 12,
            padding: 14,
          }}
        >
          <MapPin color={coords ? brand.deepLeaf : scheme.textMuted} size={18} />
          <Text style={{ color: coords ? scheme.text : scheme.textMuted, fontSize: 15 }}>
            {coords
              ? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
              : 'Tap to record where you are'}
          </Text>
        </Pressable>

        <Button label="Log it" onPress={file} disabled={!category || title.trim().length === 0} />
      </ScrollView>
    </BrandScreen>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const { scheme } = useTheme();

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: scheme.textMuted, fontSize: 13, fontWeight: '600' }}>{label}</Text>
      {children}
    </View>
  );
}

function Choice({
  label,
  hint,
  selected,
  onPress,
}: {
  label: string;
  hint: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { scheme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: selected ? brand.deepLeaf : scheme.surface,
        borderColor: selected ? brand.deepLeaf : scheme.border,
        borderWidth: 1,
        borderRadius: 12,
        padding: 13,
        gap: 1,
      }}
    >
      <Text style={{ color: selected ? brand.cream : scheme.text, fontSize: 15, fontWeight: '600' }}>{label}</Text>
      <Text style={{ color: selected ? 'rgba(250,247,241,0.75)' : scheme.textMuted, fontSize: 12 }}>{hint}</Text>
    </Pressable>
  );
}
