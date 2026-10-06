import { FieldGroup, TextInput } from '@expo/ui';
import * as Updates from 'expo-updates';
import { useCallback, useRef, useState } from 'react';

import { ActionRow, InfoRow, SectionNote, StackedRow, StatusText } from './rows';
import { ICONS, describeError, describeSource, formatDate, orDash } from './shared';
import { useDebugColors } from './theme';

/** A channel the tester may switch to: its name, or its name and a line about it. */
export type ChannelOption = string | { name: string; description?: string };

export type ChannelSectionsProps = {
  /**
   * The channels a tester can switch between. Each must be an EAS Update
   * channel that serves this app's runtime version.
   */
  channels: readonly ChannelOption[];
  /**
   * Adds a text field for a channel that is not in `channels`. Off by
   * default, so a build only ever reaches the channels you list.
   */
  allowCustomChannel?: boolean;
};

/**
 * Switches the channel this build asks for at runtime.
 *
 * The build ships with an `expo-channel-name` request header baked in, and
 * `Updates.setUpdateRequestHeadersOverride` swaps that header, so one install
 * can pull another channel's updates and then go back. The override is only
 * legal for header keys that already exist in the binary, so the build must
 * have been made with a channel set.
 *
 * Renders several sections; put it inside a `DebugForm`.
 */
export function ChannelSections({ channels, allowCustomChannel = false }: ChannelSectionsProps) {
  const colors = useDebugColors();
  const { currentlyRunning } = Updates.useUpdates();
  const [pending, setPending] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  // The native field is uncontrolled; this mirrors it without re-rendering it.
  const customChannel = useRef('');

  const options = channels.map(normalizeOption);
  const activeChannel = currentlyRunning.channel || undefined;

  const surfTo = useCallback(async (channel: string) => {
    setPending(channel);
    setStatus(`Pointing this build at "${channel}"…`);

    try {
      Updates.setUpdateRequestHeadersOverride({ 'expo-channel-name': channel });

      const check = await Updates.checkForUpdateAsync();
      if (!check.isAvailable) {
        setStatus(
          `Saved. No newer update on "${channel}" for runtime ${Updates.runtimeVersion} right now, ` +
            `so nothing to load — but every check from here on asks "${channel}".`
        );
        return;
      }

      setStatus(`Downloading the newest "${channel}" update…`);
      const fetched = await Updates.fetchUpdateAsync();
      if (!fetched.isNew) {
        setStatus(`Already running the newest "${channel}" update.`);
        return;
      }

      // reloadAsync never resolves on success — the app restarts underneath it.
      await Updates.reloadAsync();
    } catch (error) {
      setStatus(describeError(error));
    } finally {
      setPending(null);
    }
  }, []);

  const surfToCustom = useCallback(() => {
    const channel = customChannel.current.trim();
    if (!channel) {
      setStatus('Type a channel name first.');
      return;
    }
    surfTo(channel);
  }, [surfTo]);

  const resetToBuildDefault = useCallback(() => {
    setStatus('Clearing the override…');
    try {
      Updates.setUpdateRequestHeadersOverride(null);
      setStatus(
        'Override cleared. This build is back on the channel it shipped with. ' +
          'Relaunch the app to pick that channel back up.'
      );
    } catch (error) {
      setStatus(describeError(error));
    }
  }, []);

  const notes = options
    .filter((option) => option.description)
    .map((option) => `${option.name} — ${option.description}`)
    .join('\n\n');

  return (
    <>
      <FieldGroup.Section title="Running now">
        <InfoRow label="Channel" value={orDash(currentlyRunning.channel)} mono />
        <InfoRow label="Runtime version" value={orDash(currentlyRunning.runtimeVersion)} mono />
        <InfoRow label="Source" value={describeSource(currentlyRunning)} />
        <InfoRow label="Published" value={formatDate(currentlyRunning.createdAt)} />
        <StackedRow label="Update ID" value={orDash(currentlyRunning.updateId)} mono copyable />
      </FieldGroup.Section>

      {!Updates.isEnabled ? (
        <FieldGroup.Section title="Channels">
          <FieldGroup.SectionFooter>
            <SectionNote>
              Channel surfing needs a build made by EAS with a channel baked in. Development
              builds, Expo Go, and web all run without expo-updates enabled, so there is nothing
              to switch.
            </SectionNote>
          </FieldGroup.SectionFooter>
        </FieldGroup.Section>
      ) : (
        <>
          {options.length > 0 ? (
            <FieldGroup.Section title="Channels">
              {options.map(({ name }) => (
                <ActionRow
                  key={name}
                  icon={name === activeChannel ? ICONS.active : ICONS.switch}
                  label={name}
                  detail={
                    name === pending ? 'Switching…' : name === activeChannel ? 'Active' : undefined
                  }
                  disabled={pending !== null}
                  onPress={() => surfTo(name)}
                  tone={name === activeChannel ? colors.accent : undefined}
                />
              ))}

              {notes ? (
                <FieldGroup.SectionFooter>
                  <SectionNote>{notes}</SectionNote>
                </FieldGroup.SectionFooter>
              ) : null}
            </FieldGroup.Section>
          ) : null}

          {allowCustomChannel ? (
            <FieldGroup.Section title="Other channel">
              <TextInput
                defaultValue=""
                onChangeText={(text) => {
                  customChannel.current = text;
                }}
                onSubmitEditing={surfToCustom}
                placeholder="Channel name"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <ActionRow
                icon={ICONS.switch}
                label="Switch to this channel"
                detail={pending !== null && !isListed(options, pending) ? 'Switching…' : undefined}
                disabled={pending !== null}
                onPress={surfToCustom}
              />

              <FieldGroup.SectionFooter>
                <SectionNote>
                  Any channel that serves this runtime version. A name with no update behind it
                  leaves the app where it is.
                </SectionNote>
              </FieldGroup.SectionFooter>
            </FieldGroup.Section>
          ) : null}

          <FieldGroup.Section>
            <ActionRow
              icon={ICONS.reset}
              label="Reset to the build's own channel"
              disabled={pending !== null}
              onPress={resetToBuildDefault}
            />

            {status ? <StatusText>{status}</StatusText> : null}
          </FieldGroup.Section>
        </>
      )}
    </>
  );
}

function normalizeOption(option: ChannelOption) {
  return typeof option === 'string' ? { name: option, description: undefined } : option;
}

function isListed(options: { name: string }[], channel: string) {
  return options.some((option) => option.name === channel);
}
