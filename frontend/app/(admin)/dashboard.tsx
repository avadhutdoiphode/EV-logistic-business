import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { api } from "@/src/api/client";
import { useAuth } from "@/src/auth/AuthContext";
import { colors, radius, spacing, typography } from "@/src/theme";

export default function AdminDashboard() {
  const [stats, setStats] = useState<any | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { signOut } = useAuth();

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const s = await api.adminStats();
      setStats(s);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const max = stats ? Math.max(...stats.daily_revenue.map((d: any) => d.amount), 100) : 100;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.primary} />}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>OPERATIONS</Text>
            <Text style={styles.title}>Overview</Text>
          </View>
          <Pressable
            testID="admin-logout"
            onPress={async () => {
              await signOut();
              router.replace("/");
            }}
            style={styles.logoutBtn}
          >
            <Ionicons name="log-out" size={18} color={colors.textPrimary} />
          </Pressable>
        </View>

        <View style={styles.revCard}>
          <Text style={styles.revLbl}>TOTAL REVENUE</Text>
          <Text style={styles.revVal}>₹{stats?.revenue?.toLocaleString() || 0}</Text>
          <Text style={styles.revSub}>{stats?.completed_bookings || 0} completed bookings</Text>

          <View style={styles.chart}>
            {(stats?.daily_revenue || []).map((d: any, i: number) => {
              const h = max ? (d.amount / max) * 80 : 0;
              return (
                <View key={i} style={styles.barCol}>
                  <View style={[styles.bar, { height: h + 4 }]} />
                  <Text style={styles.barLbl}>{new Date(d.date).getDate()}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.kpiGrid}>
          <KPI label="Customers" value={stats?.customers || 0} icon="people" tint={colors.primary} />
          <KPI label="Drivers" value={stats?.drivers || 0} icon="car-sport" tint={colors.primary} />
          <KPI label="Online now" value={stats?.online_drivers || 0} icon="flash" tint="#000" bg={colors.accent} />
          <KPI label="Active rides" value={stats?.active_bookings || 0} icon="navigate" tint={colors.primary} />
        </View>

        <Text style={styles.section}>Quick actions</Text>
        <View style={styles.actions}>
          <ActionRow icon="car-sport" label="Manage drivers" onPress={() => router.push("/(admin)/drivers")} />
          <ActionRow icon="receipt" label="All bookings" onPress={() => router.push("/(admin)/bookings")} />
          <ActionRow icon="people" label="Customer directory" onPress={() => router.push("/(admin)/customers")} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function KPI({ label, value, icon, tint, bg }: { label: string; value: any; icon: any; tint: string; bg?: string }) {
  return (
    <View style={[styles.kpiCard, bg ? { backgroundColor: bg, borderColor: bg } : null]}>
      <View style={[styles.kpiIcon, { backgroundColor: bg ? "#000" : colors.surfaceAlt }]}>
        <Ionicons name={icon} size={16} color={bg ? colors.accent : tint} />
      </View>
      <Text style={[styles.kpiLbl, bg ? { color: "#000" } : null]}>{label}</Text>
      <Text style={[styles.kpiVal, bg ? { color: "#000" } : null]}>{value}</Text>
    </View>
  );
}

function ActionRow({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) {
  return (
    <Pressable testID={`action-${label}`} style={styles.actionRow} onPress={onPress}>
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={styles.actionTxt}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  eyebrow: { ...typography.smallBold, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 1 },
  title: { ...typography.h1, color: colors.textPrimary, marginTop: 2 },
  logoutBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  revCard: { marginTop: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.primary },
  revLbl: { fontSize: 11, fontWeight: "800", color: colors.accent, letterSpacing: 1.5 },
  revVal: { fontSize: 44, fontWeight: "800", color: "#fff", letterSpacing: -1.5, marginTop: 4 },
  revSub: { ...typography.small, color: "#9CA3AF", marginTop: 4 },
  chart: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: spacing.lg, height: 110 },
  barCol: { flex: 1, alignItems: "center", gap: 4 },
  bar: { width: "60%", backgroundColor: colors.accent, borderRadius: 4 },
  barLbl: { fontSize: 10, fontWeight: "700", color: "#9CA3AF" },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: spacing.md },
  kpiCard: { width: "48%", padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  kpiIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  kpiLbl: { ...typography.small, color: colors.textMuted, letterSpacing: 1, marginTop: spacing.s },
  kpiVal: { ...typography.h2, color: colors.textPrimary, marginTop: 2 },
  section: { ...typography.h3, marginTop: spacing.xl, marginBottom: spacing.s },
  actions: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, overflow: "hidden" },
  actionRow: { flexDirection: "row", alignItems: "center", gap: spacing.m, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  actionIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceAlt },
  actionTxt: { flex: 1, ...typography.bodyBold, color: colors.textPrimary },
});
