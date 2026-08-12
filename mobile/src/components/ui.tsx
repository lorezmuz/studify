import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, shadow, space } from "../theme";

export function Screen({
  children,
  style,
  edges = "top",
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  edges?: "top" | "all" | "none";
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.screen,
        edges !== "none" && { paddingTop: Math.max(insets.top, 12) },
        edges === "all" && { paddingBottom: Math.max(insets.bottom, 12) },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <View
      style={[
        styles.brand,
        { width: size, height: size, borderRadius: size * 0.32 },
      ]}
    >
      <Text style={[styles.brandText, { fontSize: size * 0.42 }]}>S</Text>
    </View>
  );
}

export function BackLink({
  label = "Indietro",
  onPress,
}: {
  label?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={12} style={styles.backRow}>
      <Text style={styles.backChevron}>‹</Text>
      <Text style={styles.backText}>{label}</Text>
    </Pressable>
  );
}

export function Title({
  children,
  subtitle,
}: {
  children: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <View style={{ marginBottom: space.lg }}>
      <Text style={styles.title}>{children}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          shadow.card,
          pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, shadow.card, style]}>{children}</View>;
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        variant === "primary" && styles.btnPrimary,
        variant === "secondary" && styles.btnSecondary,
        variant === "ghost" && styles.btnGhost,
        variant === "danger" && styles.btnDanger,
        (disabled || loading) && { opacity: 0.55 },
        pressed && !disabled && { transform: [{ scale: 0.98 }] },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#fff" : colors.emerald} />
      ) : (
        <Text
          style={[
            styles.btnText,
            variant === "primary" && { color: "#fff" },
            variant === "secondary" && { color: colors.text },
            variant === "ghost" && { color: colors.emerald },
            variant === "danger" && { color: colors.rose },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function StatusPill({
  online,
  offlineLabel,
  onlineLabel = "Online",
}: {
  online: boolean | null;
  offlineLabel?: string;
  onlineLabel?: string;
}) {
  const isOn = online === true;
  const isOff = online === false;
  return (
    <View
      style={[
        styles.pill,
        isOn && styles.pillOn,
        isOff && styles.pillOff,
        online === null && styles.pillNeutral,
      ]}
    >
      <View
        style={[
          styles.dot,
          isOn && { backgroundColor: colors.emerald },
          isOff && { backgroundColor: colors.amber },
          online === null && { backgroundColor: colors.textSoft },
        ]}
      />
      <Text
        style={[
          styles.pillText,
          isOn && { color: colors.emeraldDeep },
          isOff && { color: "#92400e" },
        ]}
      >
        {isOn ? onlineLabel : isOff ? offlineLabel || "Offline" : "…"}
      </Text>
    </View>
  );
}

export function ProgressBar({
  value,
  max = 1,
  color = colors.emerald,
  height = 8,
}: {
  value: number;
  max?: number;
  color?: string;
  height?: number;
}) {
  const pct = max <= 0 ? 0 : Math.min(1, Math.max(0, value / max));
  return (
    <View style={[styles.track, { height, borderRadius: height }]}>
      <View
        style={[
          styles.fill,
          {
            width: `${pct * 100}%`,
            backgroundColor: color,
            height,
            borderRadius: height,
          },
        ]}
      />
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon?: string;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.empty}>
      {icon ? <Text style={styles.emptyIcon}>{icon}</Text> : null}
      <Text style={styles.emptyTitle}>{title}</Text>
      {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
      {actionLabel && onAction ? (
        <View style={{ marginTop: space.lg, alignSelf: "stretch" }}>
          <PrimaryButton label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  brand: {
    backgroundColor: colors.emerald,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.soft,
  },
  brandText: {
    color: "#fff",
    fontWeight: "800",
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: space.md,
    gap: 2,
  },
  backChevron: {
    fontSize: 28,
    lineHeight: 28,
    color: colors.emerald,
    fontWeight: "300",
    marginTop: -2,
  },
  backText: {
    color: colors.emerald,
    fontWeight: "600",
    fontSize: 15,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.8,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  btn: {
    borderRadius: radius.md,
    paddingVertical: 15,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  btnPrimary: {
    backgroundColor: colors.emerald,
    ...shadow.soft,
  },
  btnSecondary: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnGhost: {
    backgroundColor: "transparent",
  },
  btnDanger: {
    backgroundColor: colors.roseSoft,
  },
  btnText: {
    fontWeight: "700",
    fontSize: 15,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  pillOn: { backgroundColor: colors.emeraldSoft },
  pillOff: { backgroundColor: colors.amberSoft },
  pillNeutral: { backgroundColor: colors.bgElevated },
  pillText: { fontSize: 12, fontWeight: "700" },
  dot: { width: 7, height: 7, borderRadius: 4 },
  track: {
    width: "100%",
    backgroundColor: colors.bgElevated,
    overflow: "hidden",
  },
  fill: { minWidth: 0 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  emptyBody: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 21,
  },
  sectionLabel: {
    marginTop: space.xl,
    marginBottom: space.md,
    fontSize: 12,
    fontWeight: "800",
    color: colors.textSoft,
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
});

export type { TextStyle, ViewStyle };
