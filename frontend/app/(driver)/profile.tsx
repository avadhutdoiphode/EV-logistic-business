import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useAuth } from "@/src/auth/AuthContext";
import { Button } from "@/src/components/Button";
import { colors, radius, spacing, typography } from "@/src/theme";

const ROWS = [
  { key: "vehicle", title: "Vehicle & documents", icon: "car", sub: "RC, license, insurance" },
  { key: "bank", title: "Bank account", icon: "card", sub: "Manage payouts" },
  { key: "help", title: "Help & support", icon: "help-buoy", sub: "24/7 assistance" },
];

export default function DriverProfile() {
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
            <View style={styles.badgeRow}>
              <View style={styles.verifBadge}>
                <Ionicons name="shield-checkmark" size={11} color="#fff" />
                <Text style={styles.verifText}>Verified driver</Text>
              </View>
              <Text style={styles.ratingTxt}>⭐ {user?.rating?.toFixed(1) || "5.0"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.vehBlock}>
          <View style={styles.vehIcon}>
            <Ionicons name="flash" size={20} color="#000" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.vehTitle}>{user?.vehicle_number || "PENDING"}</Text>
            <Text style={styles.vehSub}>EV vehicle assigned</Text>
          </View>
        </View>

        <View style={styles.list}>
          {ROWS.map((r, i) => (
            <Pressable key={r.key} testID={`row-${r.key}`} style={[styles.row, i !== ROWS.length - 1 && styles.rowBorder]}>
              <View style={styles.rowIcon}>
                <Ionicons name={r.icon as any} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowText}>{r.title}</Text>
                <Text style={styles.rowSub}>{r.sub}</Text>
              </View>
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
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 20, fontWeight: "800" },
  name: { ...typography.h3 },
  phone: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  verifBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: colors.primary },
  verifText: { fontSize: 10, fontWeight: "800", color: "#fff" },
  ratingTxt: { ...typography.smallBold, fontSize: 12 },
  vehBlock: { flexDirection: "row", alignItems: "center", gap: spacing.m, padding: spacing.md, marginTop: spacing.md, borderRadius: radius.lg, backgroundColor: colors.primary },
  vehIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.accent },
  vehTitle: { fontSize: 18, fontWeight: "800", color: "#fff", letterSpacing: 1 },
  vehSub: { ...typography.small, color: "#A0AEC0", marginTop: 2 },
  list: { marginTop: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.m, padding: spacing.md },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceAlt },
  rowText: { ...typography.bodyBold, color: colors.textPrimary },
  rowSub: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
});
