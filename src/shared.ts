import { Icon } from '@expo/ui';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

// `require` rather than `import()` for the Android drawables: the `@expo/ui`
// Babel plugin rewrites both, but a published `import()` would become a real
// async import in any app that turns the plugin off.
declare const require: (id: string) => number;

export const ICONS = {
  check: Icon.select({
    ios: 'arrow.triangle.2.circlepath',
    android: require('@expo/material-symbols/refresh.xml'),
  }),
  download: Icon.select({
    ios: 'arrow.down.circle',
    android: require('@expo/material-symbols/download.xml'),
  }),
  reload: Icon.select({
    ios: 'arrow.counterclockwise.circle',
    android: require('@expo/material-symbols/restart_alt.xml'),
  }),
  crash: Icon.select({
    ios: 'exclamationmark.triangle.fill',
    android: require('@expo/material-symbols/error.xml'),
  }),
  info: Icon.select({
    ios: 'info.circle',
    android: require('@expo/material-symbols/info.xml'),
  }),
  active: Icon.select({
    ios: 'checkmark.circle.fill',
    android: require('@expo/material-symbols/check_circle.xml'),
  }),
  switch: Icon.select({
    ios: 'arrow.triangle.2.circlepath',
    android: require('@expo/material-symbols/sync.xml'),
  }),
  reset: Icon.select({
    ios: 'arrow.uturn.backward',
    android: require('@expo/material-symbols/history.xml'),
  }),
};

/**
 * `expo-updates` refuses every API call while the JS is served by a dev
 * server, so the actions are only live in a build that runs a real bundle.
 */
export const CAN_RUN_UPDATE_ACTIONS = Updates.isEnabled && !__DEV__;

/** Renders anything absent — undefined, null, or an empty string — as an em dash. */
export function orDash(value?: string | null) {
  return value ? value : '—';
}

export function formatDate(date?: Date | null) {
  return date ? date.toLocaleString() : '—';
}

export function describeError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function describeSource(currentlyRunning: Updates.CurrentlyRunningInfo) {
  // With expo-updates off, nothing was downloaded and `isEmbeddedLaunch` is
  // false anyway, so the checks below would claim a downloaded update.
  if (!Updates.isEnabled) {
    return __DEV__ ? 'Dev server bundle' : 'Embedded in the build';
  }
  // In development the JS is streamed from Metro, so `isEmbeddedLaunch` is
  // false without a downloaded update behind it. Say what is actually running.
  if (__DEV__ && !currentlyRunning.updateId) {
    return 'Dev server bundle';
  }
  return currentlyRunning.isEmbeddedLaunch ? 'Embedded in the build' : 'Downloaded update';
}

const RUNTIME_POLICY_NOTES: Record<string, string> = {
  fingerprint:
    'The runtime version is a hash of the native state, so an update only reaches a binary built from the same native code.',
  appVersion: 'The runtime version follows the app version, so every native state shares one.',
  sdkVersion: 'The runtime version follows the Expo SDK major.',
  nativeVersion: 'The runtime version follows the native version string.',
};

/**
 * What the runtime version policy means. `Updates.runtimeVersion` is the
 * resolved value — a hash, for `fingerprint` — so the policy has to come from
 * the app config instead.
 */
export function describeRuntimePolicy() {
  const configured = Constants.expoConfig?.runtimeVersion;
  const policy = typeof configured === 'object' && configured ? configured.policy : undefined;
  if (policy && RUNTIME_POLICY_NOTES[policy]) {
    return RUNTIME_POLICY_NOTES[policy];
  }
  return 'The runtime version is set by hand. An update only reaches a binary with exactly this runtime version.';
}
