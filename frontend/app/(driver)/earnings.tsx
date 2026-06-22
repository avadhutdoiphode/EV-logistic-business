import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { api } from "@/src/api/client";
import { colors, radius, spacing, typography } from "@/src/theme";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Earnings() {
  const [data, setData] = useState<any>({ today: 0, week: 0, month: 0, trips: 0, daily: [0, 0, 0, 0, 0, 0, 0] });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const d = await api.earnings();
      setData(d);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const max = Math.max(...data.daily, 100);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.primary} />}
      >
        <Text style={styles.title}>Earnings</Text>

        <View style={styles.bigCard}>
          <Text style={styles.bigLbl}>THIS WEEK</Text>
          <Text style={styles.bigVal}>₹{data.week}</Text>
          <View style={styles.bigMetaRow}>
            <View style={styles.tag}>
              <Ionicons name="trending-up" size={12} color="#000" />
              <Text style={styles.tagTxt}>+12% vs last week</Text>
            </View>
          </View>
          {/* Chart */}
          <View style={styles.chart}>
            {data.daily.map((v: number, i: number) => {
              const h = max ? (v / max) * 80 : 0;
              return (
                <View key={i} style={styles.barCol}>
                  <View style={styles.barAxis} />
                  <View style={[styles.bar, { height: h + 4, backgroundColor: v > 0 ? colors.accent : colors.surface }]} />
                  <Text style={styles.barLbl}>{DAYS[i]}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.sCard}>
            <Text style={styles.sLbl}>TODAY</Text>
            <Text style={styles.sVal}>₹{data.today}</Text>
          </View>
          <View style={styles.sCard}>
            <Text style={styles.sLbl}>THIS MONTH</Text>
            <Text style={styles.sVal}>₹{data.month}</Text>
          </View>
          <View style={styles.sCard}>
            <Text style={styles.sLbl}>TRIPS</Text>
            <Text style={styles.sVal}>{data.trips}</Text>
          </View>
        </View>

        <View style={styles.payoutCard}>
          <View style={styles.payoutIcon}>
            <Ionicons name="card" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.payoutLbl}>Next payout</Text>
            <Text style={styles.payoutAmt}>₹{(data.week * 0.85).toFixed(0)}</Text>
            <Text style={styles.payoutSub}>Settles every Monday · 15% platform fee</Text>
          </View>
        </View>

        <Text style={styles.section}>Quick stats</Text>
        <View style={styles.statsList}>
          <View style={styles.statRow}>
            <Text style={styles.statRowL}>Acceptance rate</Text>
            <Text style={styles.statRowV}>94%</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statRowL}>Cancellation rate</Text>
            <Text style={styles.statRowV}>2%</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statRowL}>Avg earnings / trip</Text>
            <Text style={styles.statRowV}>₹{data.trips ? Math.round((data.month || 0) / data.trips) : 0}</Text>
          </View>
          <View style={[styles.statRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.statRowL}>CO₂ saved this week</Text>
            <Text style={styles.statRowV}>{(data.week * 0.05).toFixed(1)} kg</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  title: { ...typography.h1, color: colors.textPrimary },
  bigCard: { marginTop: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.primary },
  bigLbl: { fontSize: 11, fontWeight: "800", color: colors.accent, letterSpacing: 1.5 },
  bigVal: { fontSize: 44, fontWeight: "800", color: "#fff", marginTop: 4, letterSpacing: -1.5 },
  bigMetaRow: { flexDirection: "row", marginTop: 8 },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.accent },
  tagTxt: { fontSize: 11, fontWeight: "800", color: "#000" },
  chart: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: spacing.xl, height: 110 },
  barCol: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 4 },
  barAxis: { width: "60%", height: 1, position: "absolute", bottom: 24, backgroundColor: "rgba(255,255,255,0.1)" },
  bar: { width: "60%", borderRadius: 4, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  barLbl: { fontSize: 10, fontWeight: "700", color: "#9CA3AF" },
  summaryRow: { flexDirection: "row", gap: 8, marginTop: spacing.md },
  sCard: { flex: 1, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface },
  sLbl: { ...typography.small, color: colors.textMuted, letterSpacing: 1 },
  sVal: { ...typography.h2, color: colors.textPrimary, marginTop: 4 },
  payoutCard: { flexDirection: "row", gap: spacing.m, alignItems: "center", padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, marginTop: spacing.md },
  payoutIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.primary },
  payoutLbl: { ...typography.small, color: colors.textSecondary },
  payoutAmt: { ...typography.h3, color: colors.textPrimary, marginTop: 2 },
  payoutSub: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  section: { ...typography.h3, marginTop: spacing.xl, marginBottom: spacing.s },
  statsList: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface },
  statRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.m, borderBottomWidth: 1, borderBottomColor: colors.border },
  statRowL: { ...typography.body, color: colors.textSecondary },
  statRowV: { ...typography.bodyBold, color: colors.textPrimary },
});
