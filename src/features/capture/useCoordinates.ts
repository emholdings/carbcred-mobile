import { useState } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';

export type Coordinates = { latitude: number; longitude: number };

/**
 * Where the phone is standing.
 *
 * Asked for rather than taken: the permission prompt only appears when someone
 * presses the control, and a refusal is not fatal — the capture still files,
 * just with less behind it. Lives here because three screens now want it and a
 * fourth will.
 */
export function useCoordinates() {
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [locating, setLocating] = useState(false);

  const locate = async () => {
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

  return { coords, locating, locate, clear: () => setCoords(null) };
}
