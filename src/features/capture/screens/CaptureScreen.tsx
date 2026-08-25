import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';
import { Camera, ImagePlus, MapPin, X } from 'lucide-react-native';
import { Button } from '@shared/components/Button';
import { BrandScreen } from '@shared/components/BrandScreen';
import { TextField } from '@shared/components/TextField';
import { useAuthStore } from '@stores/authStore';
import { useTheme } from '@theme/useTheme';
import { fetchSites } from '../api';
import { pickPhoto } from '../photos';
import type { QueuedFile } from '../types';
import { QueueStatus } from '../components/QueueStatus';
import { clientRef } from '../clientRef';
import { useQueueStore } from '../queue';
import type { SubmissionType } from '../types';

const TYPES: { value: SubmissionType; label: string }[] = [
  { value: 'planting', label: 'Planting' },
  { value: 'survival', label: 'Survival' },
  { value: 'monitoring', label: 'Monitoring' },
  { value: 'incident', label: 'Incident' },
];

export function CaptureScreen() {
  const { scheme } = useTheme();
  const organisationSlug = useAuthStore((state) => state.organisationSlug);
  const enqueue = useQueueStore((state) => state.enqueue);

  const [siteId, setSiteId] = useState<number | null>(null);
  const [type, setType] = useState<SubmissionType>('planting');
  const [notes, setNotes] = useState('');
  const [species, setSpecies] = useState('');
  const [quantity, setQuantity] = useState('');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [photos, setPhotos] = useState<QueuedFile[]>([]);

  const addPhoto = async (source: 'camera' | 'library') => {
    const file = await pickPhoto(source);

    if (file) {
      setPhotos((current) => [...current, file]);
    }
  };

  const { data: sites, isLoading } = useQuery({
    queryKey: ['sites', organisationSlug],
    queryFn: () => fetchSites(organisationSlug!),
    enabled: Boolean(organisationSlug),
  });

  const takeLocation = async () => {
    setLocating(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Location needed', 'A capture is worth much more with the coordinates it was taken at.');

        return;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    } finally {
      setLocating(false);
    }
  };

  const file = async () => {
    const site = sites?.find((candidate) => candidate.id === siteId);

    if (!site) {
      return;
    }

    // The UUID is minted here, on the phone, before anything touches the
    // network — it is what makes a replayed sync safe.
    const submissionRef = clientRef();

    await enqueue({
      kind: 'field-submission',
      endpoint: '/field-submissions',
      label: `${type} capture`,
      context: site.name,
      payload: {
        client_ref: submissionRef,
        site_id: site.id,
        type,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
        notes: notes.trim() || null,
        captured_at: new Date().toISOString(),
        ...(type === 'planting' && species.trim() && Number(quantity) > 0
          ? {
              planting: {
                species: species.trim(),
                quantity: Number(quantity),
                planted_on: new Date().toISOString().slice(0, 10),
              },
            }
          : {}),
      },
    });

    // The photos cannot know their URL yet: the submission they belong to has
    // not been filed, so it has no id. They queue behind it and the sync fills
    // {parent} in once it lands.
    for (const file of photos) {
      await enqueue({
        kind: 'photo',
        endpoint: '/field-submissions/{parent}/photos',
        dependsOn: submissionRef,
        file,
        label: 'Photo',
        context: site.name,
        payload: {
          client_ref: clientRef(),
          ...(coords ? { latitude: coords.latitude, longitude: coords.longitude } : {}),
        },
      });
    }

    setPhotos([]);
    setNotes('');
    setSpecies('');
    setQuantity('');
    setCoords(null);

    Alert.alert('Queued', 'This capture is saved on the phone and will file itself when there is signal.');
  };

  const canFile = siteId !== null && (type !== 'planting' || (species.trim() !== '' && Number(quantity) > 0));

  return (
    <BrandScreen title="Capture" subtitle="Saved on the phone first">
      <ScrollView contentContainerStyle={{ gap: 20, paddingVertical: 20 }} keyboardShouldPersistTaps="handled">
        <QueueStatus />

        <Field label="Site">
          {isLoading ? (
            <ActivityIndicator color={scheme.textMuted} />
          ) : (
            <View style={{ gap: 8 }}>
              {sites?.map((site) => (
                <Choice
                  key={site.id}
                  label={`${site.name} (${site.code})`}
                  selected={siteId === site.id}
                  onPress={() => setSiteId(site.id)}
                />
              ))}
              {sites?.length === 0 ? (
                <Text style={{ color: scheme.textMuted, fontSize: 14 }}>
                  No sites are in reach of this organisation yet.
                </Text>
              ) : null}
            </View>
          )}
        </Field>

        <Field label="What are you capturing?">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {TYPES.map((option) => (
              <Choice
                key={option.value}
                label={option.label}
                selected={type === option.value}
                onPress={() => setType(option.value)}
                compact
              />
            ))}
          </View>
        </Field>

        {type === 'planting' ? (
          <View style={{ gap: 16 }}>
            <TextField label="Species" value={species} onChangeText={setSpecies} placeholder="Msasa" />
            <TextField
              label="Quantity"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="number-pad"
              placeholder="500"
            />
          </View>
        ) : null}

        <Field label="Where">
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
            <MapPin color={coords ? scheme.accent : scheme.textMuted} size={18} />
            <Text style={{ color: coords ? scheme.text : scheme.textMuted, fontSize: 15 }}>
              {locating
                ? 'Finding you…'
                : coords
                  ? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
                  : 'Tap to record coordinates'}
            </Text>
          </Pressable>
        </Field>

        <Field label="Photographs">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {photos.map((photo) => (
              <View key={photo.uri} style={{ position: 'relative' }}>
                <Image
                  source={{ uri: photo.uri }}
                  style={{ width: 72, height: 72, borderRadius: 10 }}
                />
                <Pressable
                  onPress={() => setPhotos((current) => current.filter((item) => item.uri !== photo.uri))}
                  hitSlop={8}
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: scheme.danger,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X color="#ffffff" size={13} strokeWidth={3} />
                </Pressable>
              </View>
            ))}

            <Pressable
              onPress={() => addPhoto('camera')}
              style={{
                width: 72,
                height: 72,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: scheme.border,
                backgroundColor: scheme.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Camera color={scheme.textMuted} size={22} />
            </Pressable>
            <Pressable
              onPress={() => addPhoto('library')}
              style={{
                width: 72,
                height: 72,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: scheme.border,
                backgroundColor: scheme.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ImagePlus color={scheme.textMuted} size={22} />
            </Pressable>
          </View>
        </Field>

        <TextField
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="What you saw"
          multiline
          numberOfLines={3}
          style={undefined}
        />

        <Button label="Queue this capture" onPress={file} disabled={!canFile} />
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
  selected,
  onPress,
  compact = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  compact?: boolean;
}) {
  const { scheme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={{
        backgroundColor: selected ? scheme.accent : scheme.surface,
        borderColor: selected ? scheme.accent : scheme.border,
        borderWidth: 1,
        borderRadius: 10,
        paddingVertical: 11,
        paddingHorizontal: 14,
        flexGrow: compact ? 0 : 1,
      }}
    >
      <Text style={{ color: selected ? scheme.onPrimary : scheme.text, fontSize: 15, fontWeight: selected ? '600' : '400' }}>
        {label}
      </Text>
    </Pressable>
  );
}
