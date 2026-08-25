import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BrandScreen } from '@shared/components/BrandScreen';
import { Button } from '@shared/components/Button';
import { ChoiceField } from '@shared/components/ChoiceField';
import { DateField, today as todayKey } from '@shared/components/DateField';
import { TextField } from '@shared/components/TextField';
import { clientRef } from '@features/capture/clientRef';
import { EvidenceFields } from '@features/capture/components/EvidenceFields';
import { pickPhoto } from '@features/capture/photos';
import type { QueuedFile } from '@features/capture/types';
import { useCoordinates } from '@features/capture/useCoordinates';
import { useQueueStore } from '@features/capture/queue';
import type { RiversStackParamList, SiteLogKind } from '@navigation/types';
import { useAuthStore } from '@stores/authStore';
import { brand } from '@theme/colors';
import { useTheme } from '@theme/useTheme';
import { fetchSite } from '../api';

type Props = NativeStackScreenProps<RiversStackParamList, 'SiteLog'>;

const TITLES: Record<SiteLogKind, string> = {
  'wash-reading': 'Daily wash',
  attendance: 'Attendance',
  inspection: 'Inspection',
  complaint: 'Complaint',
};

/** The server stores an outcome as a slug; these are the words for it. */
const OUTCOME_LABELS: Record<string, string> = {
  satisfactory: 'Satisfactory',
  issues_raised: 'Issues raised',
  non_compliant: 'Non-compliant',
};

/**
 * A log kept at a site. Which site is already settled by how you got here —
 * River → Site → this — so the form never asks again, and the endpoint it files
 * to is fixed before a single field is typed.
 *
 * Three of the four carry a date: a shift gets written up in the evening, and a
 * day spent out of signal gets caught up the next morning. A complaint does
 * not — it is filed the moment it is heard, and asking someone taking a
 * complaint to first agree a date with the form is the wrong thing to ask.
 */
export function SiteLogScreen({ route, navigation }: Props) {
  const { scheme } = useTheme();
  const slug = useAuthStore((state) => state.organisationSlug);
  const enqueue = useQueueStore((state) => state.enqueue);
  const { siteId, siteName, kind } = route.params;

  const [fields, setFields] = useState<Record<string, string>>({});
  const set = (key: string) => (value: string) => setFields((current) => ({ ...current, [key]: value }));
  const value = (key: string) => fields[key] ?? '';

  const [date, setDate] = useState(todayKey());
  const { coords, locating, locate } = useCoordinates();
  const [photos, setPhotos] = useState<QueuedFile[]>([]);

  /** Everyone added to the register in this sitting, so a name is not typed twice. */
  const [added, setAdded] = useState<{ name: string; role: string }[]>([]);

  const addPhoto = async () => {
    const photo = await pickPhoto('camera');

    if (photo) {
      setPhotos((current) => [...current, photo]);
    }
  };

  const site = useQuery({
    queryKey: ['site', slug, siteId],
    queryFn: () => fetchSite(slug!, siteId),
    enabled: Boolean(slug),
  });

  const vocabulary = site.data?.operations.vocabulary;
  const roles = vocabulary?.attendance_roles ?? [];
  const outcomes = vocabulary?.inspection_outcomes ?? [];

  const role = value('role') || roles[0] || '';
  const outcome = value('outcome') || outcomes[0] || '';

  // Who the site already has on the register for the chosen day.
  const onRegister = (site.data?.operations.attendance ?? []).filter((entry) => entry.attended_on === date);

  const base = `/organisations/${slug}/sites/${siteId}`;

  const build = (): { endpoint: string; payload: Record<string, unknown>; label: string } | null => {
    if (kind === 'wash-reading') {
      if (!value('tonnes') || Number(value('hours')) <= 0) {
        return null;
      }

      return {
        endpoint: `${base}/readings`,
        label: 'Wash reading',
        payload: {
          reading_date: date,
          // What the phone knows and a keyboard cannot invent.
          captured_at: new Date().toISOString(),
          ...(coords ? { latitude: coords.latitude, longitude: coords.longitude } : {}),
          tonnes_processed: Number(value('tonnes')),
          hours_run: Number(value('hours')),
          ...(value('downtime') ? { downtime_hours: Number(value('downtime')) } : {}),
          // The server falls back to the plant's registered rating when a
          // reading does not carry its own. That is right most days; it is
          // wrong on a shift run on hired or partial kit, which is the only
          // reason this field exists.
          ...(value('rated') ? { rated_capacity_tph: Number(value('rated')) } : {}),
          ...(value('notes') ? { notes: value('notes') } : {}),
        },
      };
    }

    if (kind === 'attendance') {
      if (!value('name').trim() || !role) {
        return null;
      }

      return {
        endpoint: `${base}/attendance`,
        label: 'Attendance',
        payload: {
          attended_on: date,
          name: value('name').trim(),
          role,
          ...(value('notes') ? { notes: value('notes').trim() } : {}),
        },
      };
    }

    if (kind === 'inspection') {
      if (!value('agency').trim() || !outcome) {
        return null;
      }

      return {
        endpoint: `${base}/inspections`,
        label: 'Inspection',
        payload: {
          agency: value('agency').trim(),
          inspected_on: date,
          outcome,
          ...(value('inspector') ? { inspector: value('inspector').trim() } : {}),
          ...(value('findings') ? { findings: value('findings').trim() } : {}),
        },
      };
    }

    if (!value('description').trim()) {
      return null;
    }

    return {
      endpoint: `${base}/complaints`,
      label: 'Complaint',
      payload: {
        description: value('description').trim(),
        // Filed unrated: whoever takes a complaint on the ground is not the
        // person who decides how serious it is. The team grades and groups it
        // in the register.
        severity: 'medium',
      },
    };
  };

  const ready = build() !== null;

  const file = async () => {
    const write = build();

    if (!write) {
      return;
    }

    const ref = clientRef();

    await enqueue({
      kind,
      endpoint: write.endpoint,
      label: write.label,
      context: siteName,
      payload: { client_ref: ref, ...write.payload },
    });

    // The frames cannot know their URL yet: the reading they belong to has not
    // been filed, so it has no id. They queue behind it and the sync fills
    // {parent} in once it lands.
    for (const photo of photos) {
      await enqueue({
        kind: 'photo',
        endpoint: `${base}/readings/{parent}/photos`,
        dependsOn: ref,
        file: photo,
        label: 'Reading photo',
        context: siteName,
        payload: {
          client_ref: clientRef(),
          ...(coords ? { latitude: coords.latitude, longitude: coords.longitude } : {}),
        },
      });
    }

    // A register is several people, so attendance stays open and keeps count.
    // Everything else is one record, and leaving the form up invites a second.
    if (kind === 'attendance') {
      setAdded((current) => [...current, { name: value('name').trim(), role }]);
      setFields((current) => ({ ...current, name: '', notes: '' }));

      return;
    }

    Alert.alert('Logged', 'Saved on the phone. It files itself when you have signal.');
    navigation.goBack();
  };

  return (
    <BrandScreen title={TITLES[kind]} subtitle={siteName}>
      <ScrollView contentContainerStyle={{ gap: 16, paddingVertical: 18 }} keyboardShouldPersistTaps="handled">
        {kind === 'complaint' ? (
          <Text style={{ color: scheme.textMuted, fontSize: 13 }}>
            Filed today, {todayKey()}. Write what was said — the team grades it and groups it in the register.
          </Text>
        ) : (
          <DateField label="Day" value={date} onChange={setDate} />
        )}

        {kind === 'wash-reading' ? (
          <>
            <TextField label="Tonnes processed" value={value('tonnes')} onChangeText={set('tonnes')} keyboardType="decimal-pad" placeholder="1730" />
            <TextField label="Hours run" value={value('hours')} onChangeText={set('hours')} keyboardType="decimal-pad" placeholder="10" />
            <TextField label="Downtime hours" value={value('downtime')} onChangeText={set('downtime')} keyboardType="decimal-pad" placeholder="0" />
            <TextField
              label="Plant rating (t/h)"
              value={value('rated')}
              onChangeText={set('rated')}
              keyboardType="decimal-pad"
              placeholder="Leave blank to use the plant's registered rating"
            />
            <TextField label="Notes" value={value('notes')} onChangeText={set('notes')} placeholder="Anything unusual" multiline />

            <EvidenceFields
              coords={coords}
              locating={locating}
              onLocate={locate}
              photos={photos}
              onAddPhoto={addPhoto}
              onRemovePhoto={(uri) => setPhotos((current) => current.filter((photo) => photo.uri !== uri))}
            />

            <Text style={{ color: scheme.textMuted, fontSize: 12, lineHeight: 18 }}>
              Every reading is filed unverified. The photograph and the location are what somebody at
              the desk checks it against.
            </Text>
          </>
        ) : null}

        {kind === 'attendance' ? (
          <>
            {onRegister.length || added.length ? (
              <Register
                already={onRegister.map((entry) => ({ name: entry.name, role: entry.role }))}
                added={added}
              />
            ) : null}

            <TextField label="Name" value={value('name')} onChangeText={set('name')} placeholder="Who is here" autoCapitalize="words" />
            <ChoiceField
              label="Role"
              choices={roles.map((option) => ({ value: option, label: option }))}
              value={role}
              onChange={set('role')}
            />
            <TextField label="Notes" value={value('notes')} onChangeText={set('notes')} placeholder="Optional" />
          </>
        ) : null}

        {kind === 'inspection' ? (
          <>
            <TextField label="Agency" value={value('agency')} onChangeText={set('agency')} placeholder="EMA" />
            <ChoiceField
              label="Outcome"
              choices={outcomes.map((option) => ({ value: option, label: OUTCOME_LABELS[option] ?? option }))}
              value={outcome}
              onChange={set('outcome')}
            />
            <TextField label="Inspector" value={value('inspector')} onChangeText={set('inspector')} placeholder="Optional" />
            <TextField
              label="Findings"
              value={value('findings')}
              onChangeText={set('findings')}
              placeholder="As recorded on the notice"
              tall
            />
          </>
        ) : null}

        {kind === 'complaint' ? (
          <TextField
            label="What was reported"
            value={value('description')}
            onChangeText={set('description')}
            placeholder="In their words"
            tall
          />
        ) : null}

        <Button label={kind === 'attendance' ? 'Add to register' : 'Log it'} onPress={file} disabled={!ready} />

        {kind === 'attendance' && added.length ? (
          <Pressable onPress={() => navigation.goBack()} style={{ alignItems: 'center', paddingVertical: 6 }}>
            <Text style={{ color: brand.deepLeaf, fontSize: 15, fontWeight: '700' }}>
              {`Done · ${added.length} added`}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </BrandScreen>
  );
}

/** Who is already down for this day, and who this sitting has just added. */
function Register({
  already,
  added,
}: {
  already: { name: string; role: string }[];
  added: { name: string; role: string }[];
}) {
  const { scheme } = useTheme();

  return (
    <View
      style={{
        backgroundColor: scheme.surface,
        borderColor: scheme.border,
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        gap: 8,
      }}
    >
      <Text style={{ color: scheme.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.4 }}>
        {`ON THE GROUND · ${already.length + added.length}`}
      </Text>

      {already.map((person) => (
        <Row key={`${person.name}-${person.role}`} name={person.name} role={person.role} />
      ))}

      {added.map((person, index) => (
        <Row key={`added-${index}-${person.name}`} name={person.name} role={person.role} pending />
      ))}
    </View>
  );
}

function Row({ name, role, pending = false }: { name: string; role: string; pending?: boolean }) {
  const { scheme } = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Text style={{ color: scheme.text, fontSize: 15, fontWeight: '600', flex: 1 }}>{name}</Text>
      <Text style={{ color: pending ? brand.deepLeaf : scheme.textMuted, fontSize: 13 }}>
        {pending ? 'just added' : role}
      </Text>
    </View>
  );
}
