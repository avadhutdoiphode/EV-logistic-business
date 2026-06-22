import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { api } from "@/src/api/client";
import { Button } from "@/src/components/Button";
import { useToast } from "@/src/components/Toast";
import { colors, radius, spacing, typography } from "@/src/theme";

export default function DriverJobs() {
  const [items, setItems] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await api.availableJobs();
      setItems(data);
    } catch (e: any) {
      toast.show(e.message || "Failed to load", "error");
    } finally {
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  const accept = async (id: string) => {
    try {
      await api.acceptJob(id);
      toast.show("Job accepted!", "success");
      load();
    } catch (e: any) {
      toast.show(e.message || "Failed", "error");
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Available jobs</Text>
        <Text style={styles.sub}>Pending requests near you · auto-refreshes</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(b) => b.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: 120 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="hourglass" size={36} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Waiting for jobs</Text>
            <Text style={styles.emptySub}>{`You'll see pending rides here as customers book.`}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card} testID={`job-card-${item.id}`}>
            <View style={styles.cardHeader}>
              <Text style={styles.vehName}>{item.vehicle_name}</Text>
              <Text style={styles.fare}>₹{item.fare}</Text>
            </View>
            <View style={styles.tripBox}>
              <View style={styles.tripRow}>
                <View style={[styles.tripDot, { backgroundColor: colors.primary }]} />
                <Text style={styles.tripText} numberOfLines={1}>{item.pickup.label}</Text>
              </View>
              <View style={styles.tripRow}>
                <View style={[styles.tripDot, { backgroundColor: colors.accent }]} />
                <Text style={styles.tripText} numberOfLines={1}>{item.drops[item.drops.length - 1]?.label}</Text>
              </View>
            </View>
            <View style={styles.metaRow}>
              <View style={styles.metaPill}>
                <Ionicons name="navigate" size={11} color={colors.textSecondary} />
                <Text style={styles.metaText}>{item.distance_km} km</Text>
              </View>
              <View style={styles.metaPill}>
                <Ionicons name="time" size={11} color={colors.textSecondary} />
                <Text style={styles.metaText}>{item.duration_min} min</Text>
              </View>
              <View style={styles.metaPill}>
                <Ionicons name="card" size={11} color={colors.textSecondary} />
                <Text style={styles.metaText}>{item.payment_method.toUpperCase()}</Text>
              </View>
            </View>
            <Button testID={`accept-${item.id}`} label="Accept job" onPress={() => accept(item.id)} style={{ marginTop: spacing.s }} small={false} />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.s },
  title: { ...typography.h1, color: colors.textPrimary },
  sub: { ...typography.body, color: colors.textSecondary, marginTop: 2 },
  card: { padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, marginBottom: spacing.m },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  vehName: { ...typography.h3 },
  fare: { fontSize: 22, fontWeight: "800", color: colors.primary },
  tripBox: { marginTop: spacing.s, gap: 4 },
  tripRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tripDot: { width: 8, height: 8, borderRadius: 4 },
  tripText: { ...typography.body, flex: 1 },
  metaRow: { flexDirection: "row", gap: 6, marginTop: spacing.s, flexWrap: "wrap" },
  metaPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt },
  metaText: { ...typography.small, color: colors.textSecondary, fontSize: 11 },
  empty: { alignItems: "center", paddingVertical: 60, gap: 6 },
  emptyTitle: { ...typography.h3, color: colors.textPrimary, marginTop: spacing.s },
  emptySub: { ...typography.body, color: colors.textSecondary, textAlign: "center", paddingHorizontal: spacing.xl },
});
