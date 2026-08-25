import { Image, Pressable, Text, View } from 'react-native';
import { Camera, MapPin, X } from 'lucide-react-native';
import { useTheme } from '@theme/useTheme';
import type { Coordinates } from '../useCoordinates';
import type { QueuedFile } from '../types';

/**
 * What stands behind a number: where it was taken, and a photograph of the
 * thing it was read from.
 *
 * A wash reading drives efficiency, contractor performance, benefit shares and
 * eventually the carbon claim, and until now it was a figure typed by the party
 * being measured with nothing behind it. Neither field is required — a plant
 * that ran must still be recordable at midnight with no signal and a flat
 * battery — but both are asked for, every time, and their absence shows.
 */
export function EvidenceFields({
  coords,
  locating,
  onLocate,
  photos,
  onAddPhoto,
  onRemovePhoto,
}: {
  coords: Coordinates | null;
  locating: boolean;
  onLocate: () => void;
  photos: QueuedFile[];
  onAddPhoto: () => void;
  onRemovePhoto: (uri: string) => void;
}) {
  const { scheme } = useTheme();

  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: scheme.textMuted, fontSize: 13, fontWeight: '600' }}>Evidence</Text>

      <Pressable
        onPress={onLocate}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: scheme.surface,
          borderColor: coords ? scheme.accent : scheme.border,
          borderWidth: 1,
          borderRadius: 12,
          padding: 14,
        }}
      >
        <MapPin color={coords ? scheme.accent : scheme.textMuted} size={18} />
        <Text style={{ color: coords ? scheme.text : scheme.textMuted, fontSize: 15, flex: 1 }}>
          {locating
            ? 'Finding you…'
            : coords
              ? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
              : 'Add where you are standing'}
        </Text>
      </Pressable>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {photos.map((photo) => (
          <View key={photo.uri} style={{ position: 'relative' }}>
            <Image source={{ uri: photo.uri }} style={{ width: 72, height: 72, borderRadius: 10 }} />
            <Pressable
              onPress={() => onRemovePhoto(photo.uri)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Remove photograph"
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
          onPress={onAddPhoto}
          style={{
            width: 72,
            height: 72,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: scheme.border,
            backgroundColor: scheme.surface,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
          }}
        >
          <Camera color={scheme.textMuted} size={20} />
          <Text style={{ color: scheme.textMuted, fontSize: 11 }}>Counter</Text>
        </Pressable>
      </View>
    </View>
  );
}
