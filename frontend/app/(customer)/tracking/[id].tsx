import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import MapViewMock from "@/src/components/MapView";
import { Button } from "@/src/components/Button";
import { useToast } from "@/src/components/Toast";
import { api } from "@/src/api/client";
import { colors, radius, spacing, typography } from "@/src/theme";

const STATUS_FLOW = ["accepted", "arriving", "in_transit", "completed"] as const;
const STATUS_LABEL: Record<string, string> = {
  pending: "Looking for a driver…",
  accepted: "Driver accepted",
  arriving: "Driver arriving",
  in_transit: "On the way to drop",
  completed: "Delivered",
  cancelled: "Cancelled",
};

export default function Tracking() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const b = await api.getBooking(id!);
      setBooking(b);
    } catch (e: any) {
      toast.show(e.message || "Failed", "error");
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  // Auto-advance status mock (customer side: only when status is accepted/arriving for a while)
  // We let the backend remain authoritative; we just refresh.

  const cancelTrip = async () => {
    try {
      await api.updateBookingStatus(id!, "cancelled");
      toast.show("Trip cancelled", "info");
      router.replace("/(customer)/history");
    } catch (e: any) {
      toast.show(e.message || "Failed", "error");
    }
  };

  const simulateNext = async () => {
    const i = STATUS_FLOW.indexOf(booking.status);
    const next = STATUS_FLOW[i + 1];
    if (!next) return;
    await api.updateBookingStatus(id!, next);
    load();
  };

  if (loading || !booking) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const isDone = booking.status === "completed" || booking.status === "cancelled";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable testID="tracking-back" style={styles.backBtn} onPress={() => router.replace("/(customer)/home")}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Track ride</Text>
        <View style={styles.statusChip}>
          <View style={styles.statusDot} />
          <Text style={styles.statusChipTxt}>{STATUS_LABEL[booking.status]}</Text>
        </View>
      </View>

      <View style={styles.mapWrap}>
        <MapViewMock
          markers={[
            { lat: 0, lng: 0, color: colors.primary, icon: "navigate" },
            { lat: 0, lng: 0, color: colors.accent, icon: "location" },
          ]}
          routeLine
          driverMarker={!isDone ? { lat: 0, lng: 0 } : null}
          animateDriver={!isDone}
        />
      </View>

      <ScrollView style={styles.sheet} contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={styles.handle} />

        <View style={styles.driverCard}>
          <View style={styles.driverAvatar}>
            <Text style={styles.driverInitials}>{(booking.driver_name || "DR").split(" ").map((s: string) => s[0]).slice(0, 2).join("")}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.driverName}>{booking.driver_name || "Awaiting assignment"}</Text>
            <View style={styles.metaRow}>
              <Ionicons name="star" size={12} color={colors.warning} />
              <Text style={styles.driverMeta}>{booking.driver_rating?.toFixed(1) || "4.8"}</Text>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.driverMeta}>{booking.driver_vehicle_number || "KA01EV1234"}</Text>
            </View>
            <Text style={styles.vehSub}>{booking.vehicle_name}</Text>
          </View>
          <View style={styles.callBtns}>
            <Pressable testID="call-btn" style={styles.iconBtn}>
              <Ionicons name="call" size={18} color={colors.primary} />
            </Pressable>
            <Pressable testID="chat-btn" style={styles.iconBtn}>
              <Ionicons name="chatbubble-ellipses" size={18} color={colors.primary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.stepBlock}>
          {STATUS_FLOW.map((s, i) => {
            const reached = STATUS_FLOW.indexOf(booking.status) >= i;
            return (
              <View key={s} style={styles.stepRow}>
                <View style={[styles.stepDot, reached ? styles.stepDotActive : styles.stepDotIdle]}>
                  {reached && <Ionicons name="checkmark" size={11} color="#000" />}
                </View>
                <Text style={[styles.stepLbl, reached && styles.stepLblActive]}>{STATUS_LABEL[s]}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.tripCard}>
          <View style={styles.tripRow}>
            <View style={[styles.tripDot, { backgroundColor: colors.primary }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.tripLbl}>Pickup</Text>
              <Text style={styles.tripVal}>{booking.pickup.label}</Text>
            </View>
          </View>
          {booking.drops.map((d: any, i: number) => (
            <View key={i} style={styles.tripRow}>
              <View style={[styles.tripDot, { backgroundColor: colors.accent }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.tripLbl}>Drop {booking.drops.length > 1 ? i + 1 : ""}</Text>
                <Text style={styles.tripVal}>{d.label}</Text>
              </View>
            </View>
          ))}
          <View style={styles.amountRow}>
            <Text style={styles.amountLbl}>Total fare</Text>
            <Text style={styles.amountVal}>₹{booking.fare}</Text>
          </View>
          <View style={styles.amountRow}>
            <Text style={styles.amountLbl}>Payment</Text>
            <Text style={styles.amountTag}>
              {booking.payment_method.toUpperCase()} · {booking.payment_status === "paid" ? "Paid" : "Pending"}
            </Text>
          </View>
        </View>

        {!isDone && (
          <View style={{ gap: spacing.s, marginTop: spacing.md }}>
            <Button testID="simulate-next" label="Simulate next status (demo)" variant="outline" onPress={simulateNext} />
            <Button testID="cancel-trip" label="Cancel trip" variant="ghost" onPress={cancelTrip} />
          </View>
        )}
        {booking.status === "completed" && (
          <Button testID="back-home" label="Back to home" onPress={() => router.replace("/(customer)/home")} style={{ marginTop: spacing.lg }} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingVertical: spacing.s, gap: spacing.s },
  backBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  headerTitle: { ...typography.h3, color: colors.textPrimary, flex: 1, marginLeft: spacing.s },
  statusChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.primary, borderRadius: radius.pill },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  statusChipTxt: { color: "#fff", fontSize: 11, fontWeight: "700" },
  mapWrap: { height: 200 },
  sheet: { flex: 1, backgroundColor: colors.surface, marginTop: -24, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: spacing.xl, paddingTop: spacing.s, borderWidth: 1, borderColor: colors.border },
  handle: { alignSelf: "center", width: 44, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: spacing.md },
  driverCard: { flexDirection: "row", alignItems: "center", gap: spacing.m, padding: spacing.m, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface },
  driverAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  driverInitials: { color: "#fff", fontSize: 18, fontWeight: "800" },
  driverName: { ...typography.bodyBold, fontSize: 16 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  driverMeta: { ...typography.small, color: colors.textSecondary },
  dot: { color: colors.textMuted, marginHorizontal: 2 },
  vehSub: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  callBtns: { flexDirection: "row", gap: 8 },
  iconBtn: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  stepBlock: { marginTop: spacing.lg, gap: spacing.s, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface },
  stepRow: { flexDirection: "row", alignItems: "center", gap: spacing.s },
  stepDot: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  stepDotActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  stepDotIdle: { borderColor: colors.border, backgroundColor: colors.surface },
  stepLbl: { ...typography.body, color: colors.textMuted },
  stepLblActive: { color: colors.textPrimary, fontWeight: "700" },
  tripCard: { marginTop: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, backgroundColor: colors.surface },
  tripRow: { flexDirection: "row", alignItems: "center", gap: spacing.m, paddingVertical: 8 },
  tripDot: { width: 10, height: 10, borderRadius: 5 },
  tripLbl: { ...typography.small, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  tripVal: { ...typography.bodyBold, color: colors.textPrimary },
  amountRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.m, paddingTop: spacing.m, borderTopWidth: 1, borderTopColor: colors.border },
  amountLbl: { ...typography.body, color: colors.textSecondary },
  amountVal: { ...typography.h3, color: colors.textPrimary },
  amountTag: { ...typography.smallBold, color: colors.primary },
});
