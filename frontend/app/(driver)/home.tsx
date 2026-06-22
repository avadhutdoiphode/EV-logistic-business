import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Switch, Pressable, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import MapViewMock from "@/src/components/MapView";
import { useAuth } from "@/src/auth/AuthContext";
import { api } from "@/src/api/client";
import { useToast } from "@/src/components/Toast";
import { Button } from "@/src/components/Button";
import { colors, radius, spacing, typography } from "@/src/theme";

const STATUS_FLOW = ["accepted", "arriving", "in_transit", "completed"];

export default function DriverHome() {
  const { user, refresh } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [online, setOnline] = useState(!!user?.is_online);
  const [activeJob, setActiveJob] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [earnings, setEarnings] = useState<any>({ today: 0, week: 0, trips: 0 });

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [bookings, e] = await Promise.all([api.myBookings(), api.earnings()]);
      const active = bookings.find((b: any) => ["accepted", "arriving", "in_transit"].includes(b.status));
      setActiveJob(active || null);
      setEarnings(e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setOnline(!!user?.is_online);
    load();
  }, [user, load]);

  const onToggle = async (v: boolean) => {
    setOnline(v);
    try {
      await api.driverOnline(v);
      await refresh();
      toast.show(v ? "You're online — accepting jobs" : "You're offline", v ? "success" : "info");
    } catch {
      setOnline(!v);
      toast.show("Failed to update", "error");
    }
  };

  const onAdvance = async () => {
    if (!activeJob) return;
    const i = STATUS_FLOW.indexOf(activeJob.status);
    const next = STATUS_FLOW[i + 1];
    if (!next) return;
    try {
      await api.updateBookingStatus(activeJob.id, next);
      toast.show(`Marked ${next.replace("_", " ")}`, "success");
      load();
    } catch (e: any) {
      toast.show(e.message || "Failed", "error");
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.primary} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.helloLbl}>Driver dashboard</Text>
            <Text style={styles.helloName}>{user?.name}</Text>
          </View>
          <View style={styles.ratingPill}>
            <Ionicons name="star" size={12} color={colors.warning} />
            <Text style={styles.ratingTxt}>{user?.rating?.toFixed(1) || "5.0"}</Text>
          </View>
        </View>

        <View style={[styles.onlineCard, online && styles.onlineCardActive]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.onlineLbl, online && { color: "#000" }]}>{online ? "You're online" : "You're offline"}</Text>
            <Text style={[styles.onlineSub, online && { color: "#1F2937" }]}>{online ? "Accepting incoming jobs" : "Tap to start receiving jobs"}</Text>
          </View>
          <Switch
            testID="online-toggle"
            value={online}
            onValueChange={onToggle}
            trackColor={{ false: "#374151", true: "#0B3B24" }}
            thumbColor={online ? colors.accent : "#9CA3AF"}
          />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLbl}>TODAY</Text>
            <Text style={styles.statVal}>₹{earnings.today}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLbl}>THIS WEEK</Text>
            <Text style={styles.statVal}>₹{earnings.week}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLbl}>TRIPS</Text>
            <Text style={styles.statVal}>{earnings.trips}</Text>
          </View>
        </View>

        {activeJob ? (
          <View style={styles.jobCard}>
            <View style={styles.jobHeader}>
              <View style={styles.jobBadge}>
                <View style={styles.jobBadgeDot} />
                <Text style={styles.jobBadgeTxt}>ACTIVE JOB</Text>
              </View>
              <Text style={styles.jobFare}>₹{activeJob.fare}</Text>
            </View>
            <View style={styles.mapEmbed}>
              <MapViewMock markers={[{ lat: 0, lng: 0, color: colors.primary, icon: "navigate" }]} routeLine driverMarker={{ lat: 0, lng: 0 }} animateDriver />
            </View>
            <View style={styles.tripBox}>
              <View style={styles.tripRow}>
                <View style={[styles.tripDot, { backgroundColor: colors.primary }]} />
                <Text style={styles.tripText} numberOfLines={1}>{activeJob.pickup.label}</Text>
              </View>
              <View style={styles.tripRow}>
                <View style={[styles.tripDot, { backgroundColor: colors.accent }]} />
                <Text style={styles.tripText} numberOfLines={1}>{activeJob.drops[activeJob.drops.length - 1]?.label}</Text>
              </View>
            </View>
            <View style={styles.jobMeta}>
              <Text style={styles.jobMetaTxt}>{activeJob.customer_name} · {activeJob.customer_phone}</Text>
              <Text style={styles.jobMetaTxt}>{activeJob.distance_km} km</Text>
            </View>
            {activeJob.status !== "completed" && (
              <Button
                testID="advance-job-btn"
                variant="accent"
                label={`Mark ${STATUS_FLOW[STATUS_FLOW.indexOf(activeJob.status) + 1] || "completed"}`.replace("_", " ")}
                onPress={onAdvance}
                style={{ marginTop: spacing.m }}
              />
            )}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="navigate-circle" size={36} color={colors.primary} />
            <Text style={styles.emptyTitle}>No active jobs</Text>
            <Text style={styles.emptySub}>Stay online to receive nearby ride requests.</Text>
            <Button testID="see-jobs-btn" label="Browse available jobs" small variant="outline" onPress={() => router.push("/(driver)/jobs")} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.s },
  helloLbl: { ...typography.smallBold, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 1 },
  helloName: { ...typography.h2, color: colors.textPrimary, marginTop: 2 },
  ratingPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.surface, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  ratingTxt: { ...typography.bodyBold, fontSize: 13 },
  onlineCard: { flexDirection: "row", alignItems: "center", marginHorizontal: spacing.xl, marginTop: spacing.s, padding: spacing.lg, backgroundColor: colors.secondary, borderRadius: radius.lg },
  onlineCardActive: { backgroundColor: colors.accent },
  onlineLbl: { fontSize: 18, fontWeight: "800", color: "#fff" },
  onlineSub: { fontSize: 13, color: "#9CA3AF", marginTop: 2 },
  statsRow: { flexDirection: "row", gap: 8, paddingHorizontal: spacing.xl, marginTop: spacing.md },
  statCard: { flex: 1, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface },
  statLbl: { ...typography.small, color: colors.textMuted, letterSpacing: 1 },
  statVal: { ...typography.h2, color: colors.textPrimary, marginTop: 4 },
  jobCard: { margin: spacing.xl, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface },
  jobHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  jobBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.primary },
  jobBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  jobBadgeTxt: { fontSize: 10, fontWeight: "800", color: "#fff", letterSpacing: 1 },
  jobFare: { fontSize: 20, fontWeight: "800", color: colors.textPrimary },
  mapEmbed: { height: 140, marginTop: spacing.s, borderRadius: radius.md, overflow: "hidden" },
  tripBox: { gap: 6, marginTop: spacing.m },
  tripRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tripDot: { width: 8, height: 8, borderRadius: 4 },
  tripText: { ...typography.body, flex: 1, color: colors.textPrimary },
  jobMeta: { flexDirection: "row", justifyContent: "space-between", paddingTop: spacing.s, marginTop: spacing.s, borderTopWidth: 1, borderTopColor: colors.border },
  jobMetaTxt: { ...typography.small, color: colors.textSecondary },
  emptyCard: { alignItems: "center", justifyContent: "center", gap: 6, margin: spacing.xl, padding: spacing.xxl, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, borderStyle: "dashed", backgroundColor: colors.surface },
  emptyTitle: { ...typography.h3, color: colors.textPrimary, marginTop: spacing.s },
  emptySub: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.m, textAlign: "center" },
});
