import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@shared/components/Button';
import { BrandScreen } from '@shared/components/BrandScreen';
import { DateField, today as todayKey } from '@shared/components/DateField';
import { TextField } from '@shared/components/TextField';
import { useAuthStore } from '@stores/authStore';
import { brand } from '@theme/colors';
import { useTheme } from '@theme/useTheme';
import { fetchSites } from '../api';
import { clientRef } from '../clientRef';
import { EvidenceFields } from '../components/EvidenceFields';
import { pickPhoto } from '../photos';
import type { QueuedFile } from '../types';
import { useCoordinates } from '../useCoordinates';
import { QueueStatus } from '../components/QueueStatus';
import { useQueueStore } from '../queue';

/**
 * The daily wash reading — the one number the operation is judged on, and a
 * contractual obligation whether or not there is signal at the plant.
 *
 * Expected tonnes are derived server-side from the plant's rating and the hours
 * run, so this asks only for what a person on site actually knows.
 */
export function DailyWashScreen() {
  const { scheme } = useTheme();
  const slug = useAuthStore((state) => state.organisationSlug);
  const enqueue = useQueueStore((state) => state.enqueue);

  const [siteId, setSiteId] = useState<number | null>(null);
  const [date, setDate] = useState(todayKey());
  const [tonnes, setTonnes] = useState('');
  const [hours, setHours] = useState('');
  const [downtime, setDowntime] = useState('');
  const [recovered, setRecovered] = useState('');
  const [notes, setNotes] = useState('');
  const { coords, locating, locate } = useCoordinates();
  const [photos, setPhotos] = useState<QueuedFile[]>([]);

  const addPhoto = async () => {
    const photo = await pickPhoto('camera');

    if (photo) {
      setPhotos((current) => [...current, photo]);
    }
  };

  const { data: sites } = useQuery({
    queryKey: ['sites', slug],
    queryFn: () => fetchSites(slug!),
    enabled: Boolean(slug),
  });

  // A contractor usually operates one site; do not make them pick it.
  const operating = sites?.filter((site) => site.project_id !== null) ?? [];
  const chosen = siteId ?? (operating.length === 1 ? operating[0].id : null);

  const canFile = chosen !== null && Number(tonnes) >= 0 && tonnes !== '' && hours !== '' && Number(hours) > 0;

  const file = async () => {
    const site = operating.find((candidate) => candidate.id === chosen);

    if (!site) {
      return;
    }

    const ref = clientRef();

    await enqueue({
      kind: 'wash-reading',
      endpoint: `/organisations/${slug}/sites/${site.id}/readings`,
      label: 'Wash reading',
      context: site.name,
      payload: {
        client_ref: ref,
        reading_date: date,
        captured_at: new Date().toISOString(),
        ...(coords ? { latitude: coords.latitude, longitude: coords.longitude } : {}),
        tonnes_processed: Number(tonnes),
        hours_run: Number(hours),
        ...(downtime ? { downtime_hours: Number(downtime) } : {}),
        ...(recovered ? { recovered_output: Number(recovered), recovered_unit: 'g' } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      },
    });

    setDate(todayKey());
    // The frames queue behind the reading and fill in {parent} once it lands.
    for (const photo of photos) {
      await enqueue({
        kind: 'photo',
        endpoint: `/organisations/${slug}/sites/${site.id}/readings/{parent}/photos`,
        dependsOn: ref,
        file: photo,
        label: 'Reading photo',
        context: site.name,
        payload: {
          client_ref: clientRef(),
          ...(coords ? { latitude: coords.latitude, longitude: coords.longitude } : {}),
        },
      });
    }

    setPhotos([]);
    setTonnes('');
    setHours('');
    setDowntime('');
    setRecovered('');
    setNotes('');

    Alert.alert('Reading is in', 'Saved on the phone. It files itself when you have signal.');
  };

  return (
    <BrandScreen title="Daily wash" subtitle={new Date().toDateString()}>
      <ScrollView contentContainerStyle={{ gap: 16, paddingVertical: 18 }} keyboardShouldPersistTaps="handled">
        <QueueStatus />

        {operating.length > 1 ? (
          <View style={{ gap: 8 }}>
            <Text style={{ color: scheme.textMuted, fontSize: 13, fontWeight: '600' }}>Site</Text>
            {operating.map((site) => (
              <Text
                key={site.id}
                onPress={() => setSiteId(site.id)}
                style={{
                  color: chosen === site.id ? brand.cream : scheme.text,
                  backgroundColor: chosen === site.id ? brand.deepLeaf : scheme.surface,
                  borderColor: chosen === site.id ? brand.deepLeaf : scheme.border,
                  borderWidth: 1,
                  borderRadius: 10,
                  padding: 13,
                  fontSize: 15,
                  overflow: 'hidden',
                }}
              >
                {site.name}
              </Text>
            ))}
          </View>
        ) : operating[0] ? (
          <Text style={{ color: scheme.textMuted, fontSize: 14 }}>{operating[0].name}</Text>
        ) : null}

        <DateField label="Day" value={date} onChange={setDate} />

        <TextField
          label="Tonnes processed"
          value={tonnes}
          onChangeText={setTonnes}
          keyboardType="decimal-pad"
          placeholder="1730"
        />
        <TextField
          label="Hours run"
          value={hours}
          onChangeText={setHours}
          keyboardType="decimal-pad"
          placeholder="10"
        />
        <TextField
          label="Downtime hours"
          value={downtime}
          onChangeText={setDowntime}
          keyboardType="decimal-pad"
          placeholder="0"
        />
        <TextField
          label="Recovered output (g)"
          value={recovered}
          onChangeText={setRecovered}
          keyboardType="decimal-pad"
          placeholder="Optional"
        />
        <TextField label="Notes" value={notes} onChangeText={setNotes} placeholder="Anything unusual" multiline />

        <EvidenceFields
          coords={coords}
          locating={locating}
          onLocate={locate}
          photos={photos}
          onAddPhoto={addPhoto}
          onRemovePhoto={(uri) => setPhotos((current) => current.filter((photo) => photo.uri !== uri))}
        />

        <Button label={date === todayKey() ? "File today's reading" : `File the reading for ${date}`} onPress={file} disabled={!canFile} />

        {operating.length === 0 ? (
          <Text style={{ color: scheme.textMuted, fontSize: 14 }}>
            No operating site is in reach of this organisation yet.
          </Text>
        ) : null}
      </ScrollView>
    </BrandScreen>
  );
}
