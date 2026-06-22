import React from "react";
import { Pressable, Text, StyleSheet, ActivityIndicator, View, ViewStyle, TextStyle } from "react-native";
import { colors, radius } from "@/src/theme";

type Variant = "primary" | "accent" | "secondary" | "ghost" | "outline";

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
  icon?: React.ReactNode;
  style?: ViewStyle;
  fullWidth?: boolean;
  small?: boolean;
};

export function Button({ label, onPress, variant = "primary", loading, disabled, testID, icon, style, fullWidth = true, small }: Props) {
  const wrap: ViewStyle[] = [styles.base, small ? styles.small : styles.normal];
  const txt: TextStyle[] = [styles.text];
  if (fullWidth) wrap.push({ width: "100%" });
  if (variant === "primary") {
    wrap.push({ backgroundColor: colors.primary });
    txt.push({ color: "#fff" });
  } else if (variant === "accent") {
    wrap.push({ backgroundColor: colors.accent });
    txt.push({ color: "#000" });
  } else if (variant === "secondary") {
    wrap.push({ backgroundColor: colors.secondary });
    txt.push({ color: "#fff" });
  } else if (variant === "outline") {
    wrap.push({ backgroundColor: "transparent", borderWidth: 1, borderColor: colors.primary });
    txt.push({ color: colors.primary });
  } else {
    wrap.push({ backgroundColor: "transparent" });
    txt.push({ color: colors.primary });
  }
  if (disabled) wrap.push({ opacity: 0.5 });
  if (style) wrap.push(style);

  return (
    <Pressable testID={testID} disabled={disabled || loading} onPress={onPress} style={wrap}>
      {loading ? (
        <ActivityIndicator color={variant === "accent" ? "#000" : "#fff"} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text style={txt}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  normal: { paddingVertical: 16, paddingHorizontal: 20 },
  small: { paddingVertical: 10, paddingHorizontal: 14 },
  text: { fontSize: 15, fontWeight: "700", letterSpacing: 0.2 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
});
