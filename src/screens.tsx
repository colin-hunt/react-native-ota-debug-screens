import { ChannelSections, type ChannelSectionsProps } from './channel-sections';
import { DebugForm } from './rows';
import { DebugColorsProvider, type DebugColors } from './theme';
import { CrashTestSection, UpdateSections } from './update-sections';

export type ScreenProps = {
  /** Overrides any of the four colours. Unset ones follow the system palette. */
  colors?: Partial<DebugColors>;
  /** Space to keep clear at the bottom, for a floating tab bar. */
  bottomInset?: number;
};

export type UpdatesScreenProps = ScreenProps & {
  /** Adds the two-tap deliberate crash at the bottom. */
  showCrashTest?: boolean;
};

/** The running bundle, the last check, and check / download / reload. */
export function UpdatesScreen({ colors, bottomInset, showCrashTest = false }: UpdatesScreenProps) {
  return (
    <DebugColorsProvider colors={colors}>
      <DebugForm bottomInset={bottomInset}>
        <UpdateSections />
        {showCrashTest ? <CrashTestSection /> : null}
      </DebugForm>
    </DebugColorsProvider>
  );
}

export type ChannelsScreenProps = ScreenProps & ChannelSectionsProps;

/** Switches between the update channels you allow. */
export function ChannelsScreen({
  colors,
  bottomInset,
  channels,
  allowCustomChannel,
}: ChannelsScreenProps) {
  return (
    <DebugColorsProvider colors={colors}>
      <DebugForm bottomInset={bottomInset}>
        <ChannelSections channels={channels} allowCustomChannel={allowCustomChannel} />
      </DebugForm>
    </DebugColorsProvider>
  );
}

export type DebugScreenProps = ScreenProps &
  ChannelSectionsProps & {
    /** Adds the two-tap deliberate crash at the bottom. */
    showCrashTest?: boolean;
  };

/** Both screens in one: channels first, then the update inspector. */
export function DebugScreen({
  colors,
  bottomInset,
  channels,
  allowCustomChannel,
  showCrashTest = false,
}: DebugScreenProps) {
  return (
    <DebugColorsProvider colors={colors}>
      <DebugForm bottomInset={bottomInset}>
        <ChannelSections channels={channels} allowCustomChannel={allowCustomChannel} />
        <UpdateSections />
        {showCrashTest ? <CrashTestSection /> : null}
      </DebugForm>
    </DebugColorsProvider>
  );
}
