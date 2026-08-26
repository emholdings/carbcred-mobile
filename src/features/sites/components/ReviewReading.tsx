import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { ShieldAlert, ShieldCheck, X } from 'lucide-react-native';
import { brand } from '@theme/colors';
import { useTheme } from '@theme/useTheme';
import type { SiteOperations } from '../api';

type Reading = SiteOperations['performance'][number];

/**
 * Standing behind a number somebody else recorded, from the phone.
 *
 * Verification was a desk job because the control only existed at a desk, which
 * is backwards: the person who can tell whether 1,800 tonnes is plausible is
 * often the one who was at the site that week. The note is the point — a
 * queried reading with no reason attached is an argument, and a verified one
 * with the counter photograph named is a record.
 */
export function ReviewReading({
  reading,
  visible,
  busy,
  onClose,
  onDecide,
}: {
  reading: Reading | null;
  visible: boolean;
  busy: boolean;
  onClose: () => void;
  onDecide: (decision: 'verify' | 'query', notes: string) => void;
}) {
  const { scheme } = useTheme();
  const [notes, setNotes] = useState('');

  if (!reading) {
    return null;
  }

  const close = () => {
    setNotes('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(14, 43, 30, 0.45)' }}>
        <View
          style={{
            backgroundColor: scheme.background,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingTop: 16,
            paddingBottom: 28,
            paddingHorizontal: 18,
            gap: 14,
            maxHeight: '85%',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: scheme.text, fontSize: 18, fontWeight: '700', flex: 1 }}>
              {`${reading.actual.toLocaleString()} t on ${reading.date}`}
            </Text>
            <Pressable onPress={close} hitSlop={10} accessibilityLabel="Close">
              <X color={scheme.textMuted} size={22} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ gap: 14 }} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: 'row', gap: 18 }}>
              <Figure label="Expected" value={reading.expected ? `${reading.expected.toLocaleString()} t` : '—'} />
              <Figure
                label="Efficiency"
                value={reading.efficiency !== null ? `${reading.efficiency}%` : '—'}
                tone={(reading.efficiency ?? 0) >= 85 ? brand.deepLeaf : '#b06a00'}
              />
              <Figure
                label="Behind it"
                value={
                  [reading.has_photo ? 'photo' : null, reading.located ? 'place' : null]
                    .filter(Boolean)
                    .join(' + ') || 'nothing'
                }
                tone={reading.has_photo || reading.located ? undefined : '#b06a00'}
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={{ color: scheme.textMuted, fontSize: 13, fontWeight: '600' }}>
                Note — what you checked, or what looks wrong
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                multiline
                placeholder="Counter photograph matches the shift log…"
                placeholderTextColor={scheme.textMuted}
                style={{
                  backgroundColor: scheme.surface,
                  borderWidth: 1,
                  borderColor: scheme.border,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 13,
                  color: scheme.text,
                  fontSize: 16,
                  minHeight: 110,
                  textAlignVertical: 'top',
                }}
              />
            </View>

            {reading.status !== 'unverified' ? (
              <Text style={{ color: scheme.textMuted, fontSize: 13, lineHeight: 19 }}>
                {reading.status === 'verified'
                  ? `Already verified${reading.verified_by ? ` by ${reading.verified_by}` : ''}. Deciding again replaces that.`
                  : 'Already queried. Verifying now replaces that.'}
              </Text>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Decision
                label="Verify"
                icon={<ShieldCheck color={brand.cream} size={18} />}
                background={brand.deepLeaf}
                colour={brand.cream}
                busy={busy}
                onPress={() => onDecide('verify', notes.trim())}
              />
              <Decision
                label="Query"
                icon={<ShieldAlert color={scheme.danger} size={18} />}
                background="transparent"
                colour={scheme.danger}
                border={scheme.danger}
                busy={busy}
                onPress={() => onDecide('query', notes.trim())}
              />
            </View>

            <Text style={{ color: scheme.textMuted, fontSize: 12, lineHeight: 18 }}>
              A queried reading keeps its number — the claim is part of the record. The note is what
              somebody reads when they ask why.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: string }) {
  const { scheme } = useTheme();

  return (
    <View style={{ gap: 1 }}>
      <Text style={{ color: tone ?? scheme.text, fontSize: 16, fontWeight: '700' }}>{value}</Text>
      <Text style={{ color: scheme.textMuted, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

function Decision({
  label,
  icon,
  background,
  colour,
  border,
  busy,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  background: string;
  colour: string;
  border?: string;
  busy: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: background,
        borderColor: border ?? background,
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 13,
        opacity: busy ? 0.6 : 1,
      }}
    >
      {busy ? <ActivityIndicator color={colour} /> : icon}
      <Text style={{ color: colour, fontSize: 16, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}
