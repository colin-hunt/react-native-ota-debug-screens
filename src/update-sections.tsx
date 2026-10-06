import { Collapsible, Column, FieldGroup, Text } from '@expo/ui';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { useCallback, useState } from 'react';

import { ActionRow, InfoRow, SectionNote, StackedRow, StatusText } from './rows';
import {
  CAN_RUN_UPDATE_ACTIONS,
  ICONS,
  describeError,
  describeRuntimePolicy,
  describeSource,
  formatDate,
  orDash,
} from './shared';
import { MONO_FONT, SPACING, useDebugColors } from './theme';

/** Why `checkForUpdateAsync()` came back empty, in words rather than an enum. */
const NOT_AVAILABLE_REASON: Record<Updates.UpdateCheckResultNotAvailableReason, string> = {
  [Updates.UpdateCheckResultNotAvailableReason.NO_UPDATE_AVAILABLE_ON_SERVER]:
    'The server has nothing newer for this runtime version and channel.',
  [Updates.UpdateCheckResultNotAvailableReason.UPDATE_REJECTED_BY_SELECTION_POLICY]:
    'The server sent an update, but the selection policy rejected it.',
  [Updates.UpdateCheckResultNotAvailableReason.UPDATE_PREVIOUSLY_FAILED]:
    'The server sent an update this device already tried and failed to launch.',
  [Updates.UpdateCheckResultNotAvailableReason.ROLLBACK_REJECTED_BY_SELECTION_POLICY]:
    'The server sent a rollback directive, but the selection policy rejected it.',
  [Updates.UpdateCheckResultNotAvailableReason.ROLLBACK_NO_EMBEDDED]:
    'The server sent a rollback directive, but this build has no embedded update.',
};

/**
 * Everything `expo-updates` knows about the running bundle, plus the three
 * actions you need to move between bundles by hand: check the server, pull
 * the update down, and restart onto it. Renders several sections; put it
 * inside a `DebugForm`.
 */
export function UpdateSections() {
  const colors = useDebugColors();
  const {
    currentlyRunning,
    availableUpdate,
    downloadedUpdate,
    isUpdateAvailable,
    isUpdatePending,
    isChecking,
    isDownloading,
    isRestarting,
    isStartupProcedureRunning,
    restartCount,
    checkError,
    downloadError,
    lastCheckForUpdateTimeSinceRestart,
    downloadProgress,
  } = Updates.useUpdates();

  const [result, setResult] = useState<string | null>(null);
  const [isManifestOpen, setManifestOpen] = useState(false);

  const busy = isChecking || isDownloading || isRestarting;

  const check = useCallback(async () => {
    setResult(null);
    try {
      const checked = await Updates.checkForUpdateAsync();

      if (checked.isRollBackToEmbedded) {
        setResult(
          'The server sent a rollback directive. Downloading it puts this app back on the bundle embedded in the build.'
        );
      } else if (checked.isAvailable) {
        setResult(`Update ${checked.manifest.id} is available. Download it to run it.`);
      } else {
        setResult(NOT_AVAILABLE_REASON[checked.reason] ?? 'No update available.');
      }
    } catch (error) {
      setResult(describeError(error));
    }
  }, []);

  const download = useCallback(async () => {
    setResult(null);
    try {
      const fetched = await Updates.fetchUpdateAsync();

      if (fetched.isRollBackToEmbedded) {
        setResult('Rolled back to the embedded bundle. Reload to run it.');
      } else if (fetched.isNew) {
        setResult('Update downloaded. Reload to run it.');
      } else {
        setResult('Nothing new to download — this app is already on the newest update.');
      }
    } catch (error) {
      setResult(describeError(error));
    }
  }, []);

  const reload = useCallback(async () => {
    setResult(null);
    try {
      // On success this never resolves: the app restarts underneath it.
      await Updates.reloadAsync();
    } catch (error) {
      setResult(describeError(error));
    }
  }, []);

  const progressPercent =
    downloadProgress == null ? null : `${Math.round(downloadProgress * 100)}%`;

  return (
    <>
      <FieldGroup.Section>
        <Column alignment="start" spacing={SPACING.xs} style={{ paddingVertical: SPACING.sm }}>
          <Text textStyle={{ fontSize: 15, color: colors.textMuted }}>
            {describeStatus({
              isChecking,
              isDownloading,
              isRestarting,
              isStartupProcedureRunning,
              isUpdateAvailable,
              isUpdatePending,
              progressPercent,
            })}
          </Text>
        </Column>
      </FieldGroup.Section>

      <FieldGroup.Section title="Actions">
        <ActionRow
          icon={ICONS.check}
          label="Check for an update"
          detail={isChecking ? 'Checking…' : undefined}
          disabled={busy || !CAN_RUN_UPDATE_ACTIONS}
          onPress={check}
        />
        <ActionRow
          icon={ICONS.download}
          label="Download the update"
          detail={isDownloading ? (progressPercent ?? 'Downloading…') : undefined}
          disabled={busy || !CAN_RUN_UPDATE_ACTIONS || !isUpdateAvailable || isUpdatePending}
          onPress={download}
        />
        <ActionRow
          icon={ICONS.reload}
          label="Reload the app"
          detail={isRestarting ? 'Restarting…' : undefined}
          disabled={busy || !CAN_RUN_UPDATE_ACTIONS}
          onPress={reload}
        />

        {result ? <StatusText>{result}</StatusText> : null}

        <FieldGroup.SectionFooter>
          <SectionNote>
            {CAN_RUN_UPDATE_ACTIONS
              ? 'Reload restarts onto the newest downloaded update, or back onto the current one if nothing is pending.'
              : !Updates.isEnabled
                ? 'These need expo-updates, which is disabled in this build. It is on in builds made by EAS with an update URL and a channel.'
                : 'These need a build that runs a real bundle. In a development build the JS comes from the dev server, and expo-updates rejects every call — use the dev menu to reload instead.'}
          </SectionNote>
        </FieldGroup.SectionFooter>
      </FieldGroup.Section>

      <FieldGroup.Section title="Running now">
        <InfoRow label="Source" value={describeSource(currentlyRunning)} />
        <InfoRow label="Channel" value={orDash(currentlyRunning.channel)} mono />
        <InfoRow
          label="Runtime version"
          value={orDash(currentlyRunning.runtimeVersion)}
          mono
          infoIcon={ICONS.info}
          onInfo={() => setResult(describeRuntimePolicy())}
        />
        <InfoRow label="Published" value={formatDate(currentlyRunning.createdAt)} />
        <InfoRow
          label="Launch duration"
          value={
            currentlyRunning.launchDuration == null
              ? '—'
              : `${Math.round(currentlyRunning.launchDuration)} ms`
          }
        />
        <InfoRow label="Reloads since cold start" value={String(restartCount)} />
        <StackedRow label="Update ID" value={orDash(currentlyRunning.updateId)} mono copyable />
        {currentlyRunning.isEmergencyLaunch ? (
          <StackedRow
            label="Emergency launch"
            value={
              currentlyRunning.emergencyLaunchReason ??
              'The newest update failed to launch, so the embedded bundle was used instead.'
            }
            color={colors.danger}
          />
        ) : null}
      </FieldGroup.Section>

      <FieldGroup.Section title="Last check">
        <InfoRow label="Checked at" value={formatDate(lastCheckForUpdateTimeSinceRestart)} />
        <InfoRow label="Update available" value={isUpdateAvailable ? 'Yes' : 'No'} />
        <InfoRow label="Downloaded and pending" value={isUpdatePending ? 'Yes' : 'No'} />
        {availableUpdate ? (
          <>
            <InfoRow label="Available published" value={formatDate(availableUpdate.createdAt)} />
            <StackedRow
              label="Available update ID"
              value={availableUpdate.updateId ?? 'rollback to embedded'}
              mono
              copyable
            />
          </>
        ) : null}
        {downloadedUpdate ? (
          <StackedRow
            label="Downloaded update ID"
            value={downloadedUpdate.updateId ?? 'rollback to embedded'}
            mono
            copyable
          />
        ) : null}
        {checkError ? (
          <StackedRow label="Check error" value={checkError.message} color={colors.danger} />
        ) : null}
        {downloadError ? (
          <StackedRow label="Download error" value={downloadError.message} color={colors.danger} />
        ) : null}

        <FieldGroup.SectionFooter>
          <SectionNote>
            These reset on every cold start — they describe checks made since the app launched.
          </SectionNote>
        </FieldGroup.SectionFooter>
      </FieldGroup.Section>

      <FieldGroup.Section title="Configuration">
        <InfoRow label="expo-updates" value={Updates.isEnabled ? 'Enabled' : 'Disabled'} />
        <InfoRow
          label="Manual checks"
          value={
            CAN_RUN_UPDATE_ACTIONS
              ? 'Available'
              : Updates.isEnabled
                ? 'Blocked in development'
                : 'Unavailable'
          }
        />
        <InfoRow label="Checks automatically" value={orDash(Updates.checkAutomatically)} mono />
        <InfoRow
          label="Serving embedded assets"
          value={Updates.isUsingEmbeddedAssets ? 'Yes' : 'No'}
        />
        <StackedRow
          label="Update URL"
          value={orDash(Constants.expoConfig?.updates?.url)}
          mono
          copyable
        />
      </FieldGroup.Section>

      <FieldGroup.Section title="Manifest">
        <Collapsible
          isOpen={isManifestOpen}
          onOpenChange={setManifestOpen}
          label={isManifestOpen ? 'Hide raw manifest' : 'Show raw manifest'}
          labelStyle={{ fontSize: 17, color: colors.accent }}>
          <Text textStyle={{ fontSize: 12, fontFamily: MONO_FONT, color: colors.textMuted }}>
            {formatManifest(currentlyRunning.manifest)}
          </Text>
        </Collapsible>
      </FieldGroup.Section>
    </>
  );
}

/**
 * A two-tap deliberate crash. Thrown from a timer so it escapes React's error
 * boundary: a release build routes that to the native fatal handler, so the
 * process dies and the platform captures a crash report.
 */
export function CrashTestSection() {
  const colors = useDebugColors();
  const [isArmed, setArmed] = useState(false);

  const crash = useCallback(() => {
    if (!isArmed) {
      setArmed(true);
      return;
    }
    setTimeout(() => {
      throw new Error('Deliberate crash from react-native-ota-debug-screens.');
    }, 0);
  }, [isArmed]);

  return (
    <FieldGroup.Section title="Crash test">
      <ActionRow
        icon={ICONS.crash}
        label={isArmed ? 'Tap again to crash' : 'Crash the app on purpose'}
        detail={isArmed ? 'Armed' : undefined}
        onPress={crash}
        tone={colors.danger}
      />

      <FieldGroup.SectionFooter>
        <SectionNote>
          Two taps, so it cannot happen by accident. A release build terminates and the platform
          captures a crash report; in development Metro just shows the error.
        </SectionNote>
      </FieldGroup.SectionFooter>
    </FieldGroup.Section>
  );
}

function describeStatus({
  isChecking,
  isDownloading,
  isRestarting,
  isStartupProcedureRunning,
  isUpdateAvailable,
  isUpdatePending,
  progressPercent,
}: {
  isChecking: boolean;
  isDownloading: boolean;
  isRestarting: boolean;
  isStartupProcedureRunning: boolean;
  isUpdateAvailable: boolean;
  isUpdatePending: boolean;
  progressPercent: string | null;
}) {
  if (!CAN_RUN_UPDATE_ACTIONS) {
    return Updates.isEnabled
      ? 'Running from the dev server, so there is no update to act on.'
      : 'expo-updates is disabled in this build.';
  }
  if (isRestarting) {
    return 'Restarting…';
  }
  if (isDownloading) {
    return progressPercent ? `Downloading… ${progressPercent}` : 'Downloading…';
  }
  if (isChecking) {
    return 'Checking the server for a newer update…';
  }
  if (isStartupProcedureRunning) {
    return 'Still finishing the startup check…';
  }
  if (isUpdatePending) {
    return 'An update is downloaded and waiting. Reload to run it.';
  }
  if (isUpdateAvailable) {
    return 'An update is available on the server. Download it to run it.';
  }
  return 'Running the newest update this device has seen.';
}

function formatManifest(manifest?: Partial<Updates.Manifest>) {
  if (!manifest || Object.keys(manifest).length === 0) {
    return __DEV__
      ? 'No manifest — this JS came from the dev server, not from an update.'
      : 'No manifest — expo-updates is disabled in this build.';
  }
  return JSON.stringify(manifest, null, 2);
}
