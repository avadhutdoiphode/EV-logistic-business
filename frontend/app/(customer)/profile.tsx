import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useAuth } from "@/src/auth/AuthContext";
import { Button } from "@/src/components/Button";
import { colors, radius, spacing, typography } from "@/src/theme";

const SECTIONS = [
  { key: "saved", title: "Saved places", icon: "bookmark" },
  { key: "payments", title: "Payment methods", icon: "card" },
  { key: "help", title: "Help & support", icon: "help-buoy" },
  { key: "terms", title: "Terms & privacy", icon: "document-text" },
];

export default function Profile() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 120 }}>
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.name || "?").split(" ").map((s) => s[0]).slice(0, 2).join("")}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.name}</Text>
            <Text style={styles.phone}>{user?.phone}</Text>
          </View>
          <View style={styles.tierBadge}>
            <Ionicons name="leaf" size={12} color="#000" />
            <Text style={styles.tierText}>GREEN</Text>
          </View>
        </View>

        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>3</Text>
            <Text style={styles.statLbl}>Trips</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>16 kg</Text>
            <Text style={styles.statLbl}>CO₂ saved</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>₹120</Text>
            <Text style={styles.statLbl}>Wallet</Text>
          </View>
        </View>

        <View style={styles.list}>
          {SECTIONS.map((s, i) => (
            <Pressable key={s.key} testID={`section-${s.key}`} style={[styles.row, i !== SECTIONS.length - 1 && styles.rowBorder]}>
              <View style={styles.rowIcon}>
                <Ionicons name={s.icon as any} size={18} color={colors.primary} />
              </View>
              <Text style={styles.rowText}>{s.title}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>

        <Button
          testID="logout-btn"
          label="Log out"
          variant="outline"
          onPress={async () => {
            await signOut();
            router.replace("/");
          }}
          style={{ marginTop: spacing.xl }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  card: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 20, fontWeight: "800" },
  name: { ...typography.h3, color: colors.textPrimary },
  phone: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  tierBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: colors.accent, borderRadius: radius.pill },
  tierText: { fontSize: 10, fontWeight: "800", color: "#000" },
  statRow: { flexDirection: "row", gap: spacing.s, marginTop: spacing.md },
  stat: { flex: 1, padding: spacing.m, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, alignItems: "flex-start" },
  statNum: { ...typography.h2, color: colors.textPrimary },
  statLbl: { ...typography.small, color: colors.textSecondary, marginTop: 4 },
  list: { marginTop: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.m, padding: spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceAlt },
  rowText: { flex: 1, ...typography.bodyBold, color: colors.textPrimary },
});
