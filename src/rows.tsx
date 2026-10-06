import { Button, Column, FieldGroup, Host, Icon, Row, Spacer, Text, type IconName } from '@expo/ui';
import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useRef, useState } from 'react';

import { MONO_FONT, SPACING, useDebugColors } from './theme';

/**
 * The rows the debug screens are built from.
 *
 * All of these are `@expo/ui`, so a screen made of them is a SwiftUI `Form` on
 * iOS and a Compose grouped list on Android. They all expect a `DebugForm`
 * ancestor, which supplies the required `Host`.
 */

/** Wraps a screen's sections. Every row below needs one of these above it. */
export function DebugForm({
  bottomInset = 0,
  children,
}: {
  /**
   * Space to keep clear at the bottom, for a floating tab bar. It goes on the
   * host, not on the form: padding on the SwiftUI `Form` itself stops hosted
   * rows from drawing.
   */
  bottomInset?: number;
  children?: React.ReactNode;
}) {
  // `useViewportSizeMeasurement` proposes the viewport as the layout size.
  // Without it the host measures the form at its intrinsic height, and the
  // form never scrolls.
  return (
    <Host style={{ flex: 1, paddingBottom: bottomInset }} useViewportSizeMeasurement>
      <FieldGroup>{children}</FieldGroup>
    </Host>
  );
}

export function SectionNote({ children }: { children: string }) {
  const { textMuted } = useDebugColors();
  return <Text textStyle={{ fontSize: 13, color: textMuted }}>{children}</Text>;
}

/** A muted line of text inside a section, for the result of the last action. */
export function StatusText({ children }: { children: string }) {
  const { textMuted } = useDebugColors();
  return <Text textStyle={{ fontSize: 14, color: textMuted }}>{children}</Text>;
}

/** A row that does something when tapped. */
export function ActionRow({
  icon,
  label,
  detail,
  disabled,
  onPress,
  tone,
}: {
  icon?: IconName;
  label: string;
  detail?: string;
  disabled?: boolean;
  onPress: () => void;
  /** Overrides the accent, for a row that does something destructive. */
  tone?: string;
}) {
  const colors = useDebugColors();
  const color = disabled ? colors.textMuted : (tone ?? colors.accent);

  return (
    <Button variant="text" onPress={onPress} disabled={disabled}>
      <Row alignment="center" spacing={SPACING.sm}>
        {icon ? <Icon name={icon} size={20} color={color} /> : null}
        <Text textStyle={{ fontSize: 17, color }}>{label}</Text>
        <Spacer flexible />
        {detail ? (
          <Text textStyle={{ fontSize: 15, color: colors.textMuted }}>{detail}</Text>
        ) : null}
      </Row>
    </Button>
  );
}

/** A label on the left, a read-only value on the right. */
export function InfoRow({
  label,
  value,
  mono,
  onInfo,
  infoIcon,
}: {
  label: string;
  value: string;
  mono?: boolean;
  /** Renders a small info button beside the label. */
  onInfo?: () => void;
  infoIcon?: IconName;
}) {
  const colors = useDebugColors();

  return (
    <Row alignment="center" spacing={SPACING.sm}>
      <Text textStyle={{ fontSize: 15, color: colors.text }}>{label}</Text>
      {onInfo && infoIcon ? (
        <Icon name={infoIcon} size={16} color={colors.accent} onPress={onInfo} />
      ) : null}
      <Spacer flexible />
      <Text
        numberOfLines={1}
        textStyle={{
          fontSize: 15,
          color: colors.textMuted,
          fontFamily: mono ? MONO_FONT : undefined,
          textAlign: 'right',
        }}>
        {value}
      </Text>
    </Row>
  );
}

/**
 * A row for values too long to sit on the right of their label — update IDs,
 * URLs, error messages.
 */
export function StackedRow({
  label,
  value,
  mono,
  color,
  copyable,
}: {
  label: string;
  value: string;
  mono?: boolean;
  color?: string;
  copyable?: boolean;
}) {
  const colors = useDebugColors();
  const { copied, copy } = useCopy();
  const canCopy = Boolean(copyable) && value !== '—';

  return (
    <Column
      alignment="start"
      spacing={SPACING.xs / 2}
      style={{ paddingVertical: SPACING.xs }}
      onPress={canCopy ? () => copy(value) : undefined}>
      <Row alignment="center">
        <Text textStyle={{ fontSize: 15, color: colors.text }}>{label}</Text>
        <Spacer flexible />
        {canCopy ? (
          <Text textStyle={{ fontSize: 13, color: colors.accent }}>
            {copied ? 'Copied' : 'Copy'}
          </Text>
        ) : null}
      </Row>
      <Text
        textStyle={{
          fontSize: 13,
          color: color ?? colors.textMuted,
          fontFamily: mono ? MONO_FONT : undefined,
        }}>
        {value}
      </Text>
    </Column>
  );
}

/**
 * Copies a string to the clipboard and reports it for a moment afterwards, so
 * a row can swap its affordance to "Copied".
 */
function useCopy(resetAfterMs = 2000) {
  const [copied, setCopied] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeout.current) {
        clearTimeout(timeout.current);
      }
    };
  }, []);

  const copy = useCallback(
    async (value: string) => {
      await Clipboard.setStringAsync(value);
      setCopied(true);

      if (timeout.current) {
        clearTimeout(timeout.current);
      }
      timeout.current = setTimeout(() => setCopied(false), resetAfterMs);
    },
    [resetAfterMs]
  );

  return { copied, copy };
}
