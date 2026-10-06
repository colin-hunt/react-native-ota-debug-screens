import { createContext, useContext, useMemo } from 'react';
import { Platform, useColorScheme } from 'react-native';

/**
 * The four colours the debug screens draw with. Everything else — row
 * backgrounds, separators, section cards — comes from the platform's own
 * grouped form, so it already follows the system appearance.
 */
export type DebugColors = {
  /** Primary text: row labels. */
  text: string;
  /** Secondary text: values, notes, status lines. */
  textMuted: string;
  /** Tappable rows and the active channel. */
  accent: string;
  /** Errors and the crash test. */
  danger: string;
};

/** The system palette, so the screens look native with no props at all. */
export const DEFAULT_COLORS: Record<'light' | 'dark', DebugColors> = {
  light: { text: '#000000', textMuted: '#6e6e73', accent: '#007aff', danger: '#ff3b30' },
  dark: { text: '#ffffff', textMuted: '#98989f', accent: '#0a84ff', danger: '#ff453a' },
};

export const MONO_FONT = Platform.select({
  ios: 'ui-monospace',
  android: 'monospace',
  default: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
});

export const SPACING = { xs: 4, sm: 8 } as const;

const DebugColorsContext = createContext<Partial<DebugColors> | null>(null);

/**
 * Supplies colours to every row below it. Each screen renders one from its
 * `colors` prop, so an app only needs this to compose its own screen out of
 * the exported sections.
 */
export function DebugColorsProvider({
  colors,
  children,
}: {
  colors?: Partial<DebugColors>;
  children: React.ReactNode;
}) {
  return (
    <DebugColorsContext.Provider value={colors ?? null}>{children}</DebugColorsContext.Provider>
  );
}

export function useDebugColors(): DebugColors {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const overrides = useContext(DebugColorsContext);
  return useMemo(() => ({ ...DEFAULT_COLORS[scheme], ...overrides }), [scheme, overrides]);
}
