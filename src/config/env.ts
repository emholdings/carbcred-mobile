import Constants from 'expo-constants';

/**
 * Where the app talks to.
 *
 * In development the API host is taken from whichever machine served this
 * bundle — Metro tells the app its own address, and the API runs on that same
 * machine. It used to be a hardcoded LAN IP, which is wrong the first morning
 * the router hands the Mac a different one: every request goes to an address
 * nobody answers, `/me` never lands, and the app sits signed in with no user
 * and a blank screen. Nothing about that failure says "wrong IP".
 *
 * Set EXPO_PUBLIC_API_URL before starting Metro to point somewhere else — a
 * staging server, a tunnel, a colleague's machine:
 *
 *   EXPO_PUBLIC_API_URL=https://carbcred-system.on-forge.com npx expo start
 */
function developmentApi(): string {
  const override = process.env.EXPO_PUBLIC_API_URL;

  if (override) {
    return override;
  }

  // "192.168.100.27:8081" — the machine Metro is running on.
  const host = Constants.expoConfig?.hostUri?.split(':')[0];

  return `http://${host ?? 'localhost'}:${API_PORT}`;
}

/** Where `php artisan serve` listens. */
const API_PORT = 8000;

const TEST_SERVER_API = 'https://carbcred-system.on-forge.com';

export const API_BASE_URL = __DEV__ ? developmentApi() : TEST_SERVER_API;

/** Every endpoint lives under this prefix; breaking changes go to /api/v2. */
export const API_PREFIX = '/api/v1';

/** Names the token this handset holds, so it can be revoked on its own. */
export const DEVICE_NAME = 'CarbCred Mobile';
