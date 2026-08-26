import { Alert } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { clientRef } from './clientRef';
import type { QueuedFile } from './types';

/**
 * Take or choose a photo and keep it somewhere the queue can still find it.
 *
 * The picker hands back a URI in the cache, which Expo describes as "a place to
 * store files that can be deleted by the system when the device runs low on
 * storage" — the same afternoon a phone has been filling with photos in the
 * field. So the file is copied into the document directory, which is "safe from
 * being deleted", and the queue points at that copy.
 */
export async function pickPhoto(source: 'camera' | 'library'): Promise<QueuedFile | null> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    return null;
  }

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    // The contract asks for roughly 1600px and 500KB; quality does most of that
    // work, and the server's ceiling is far above either.
    quality: 0.6,
    exif: false,
  };

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

  if (result.canceled || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  const captures = new Directory(Paths.document, 'captures');

  if (!captures.exists) {
    captures.create({ intermediates: true });
  }

  const name = `${clientRef()}.jpg`;
  const destination = new File(captures, name);

  await new File(asset.uri).copy(destination);

  return {
    uri: destination.uri,
    name,
    type: asset.mimeType ?? 'image/jpeg',
  };
}

/**
 * Ask which way, then take or choose one.
 *
 * Both are real: the plant counter is photographed standing in front of it,
 * and the permit that arrived by WhatsApp last week is already in the gallery.
 * A control that only opens the camera makes the second case impossible, and
 * one that only opens the gallery makes the first case a two-step chore.
 */
export function choosePhoto(): Promise<QueuedFile | null> {
  return new Promise((resolve) => {
    Alert.alert('Add a photograph', undefined, [
      {
        text: 'Take one now',
        onPress: () => {
          void pickPhoto('camera').then(resolve);
        },
      },
      {
        text: 'Choose from the phone',
        onPress: () => {
          void pickPhoto('library').then(resolve);
        },
      },
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
}

/** Remove a queued photo's copy once it has filed, or been abandoned. */
export function discardPhoto(file: QueuedFile): void {
  const stored = new File(file.uri);

  if (stored.exists) {
    stored.delete();
  }
}
