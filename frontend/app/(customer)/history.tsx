import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { api } from "@/src/api/client";
import { colors, radius, spacing, typography } from "@/src/theme";

const FILTERS = ["all", "in_transit", "completed", "cancelled"] as const;
const FILTER_LBL: Record<string, string> = {
  all: "All",
  in_transit: "Live",
  completed: "Completed",
  cancelled: "Cancelled",
};
const STATUS_LBL: Record<string, string> = {
  pending: "Looking",
  accepted: "Assigned",
  arriving: "Arriving",
  in_transit: "In transit",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function History() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await api.myBookings();
      setItems(data);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = items.filter((b) => {
    if (filter === "all") return true;
    if (filter === "in_transit") return ["pending", "accepted", "arriving", "in_transit"].includes(b.status);
    return b.status === filter;
  });

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Your bookings</Text>
        <Text style={styles.sub}>{items.length} trips · {items.filter(i=>i.status==="completed").length} completed</Text>
      </View>

      <View style={styles.chipsWrap}>
        <FlatList
          data={FILTERS as any}
          keyExtractor={(k) => k}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
          renderItem={({ item }) => {
            const active = filter === item;
            return (
              <Pressable
                testID={`filter-${item}`}
                onPress={() => setFilter(item)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{FILTER_LBL[item]}</Text>
              </Pressable>
            );
          }}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(b) => b.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={36} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No bookings yet</Text>
            <Text style={styles.emptySub}>Your trips will appear here.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            testID={`booking-${item.id}`}
            style={styles.card}
            onPress={() => router.push({ pathname: "/(customer)/tracking/[id]", params: { id: item.id } })}
          >
            <View style={styles.cardHeader}>
              <View style={styles.statusPill}>
                <View style={[styles.statusDot, { backgroundColor: item.status === "completed" ? colors.primary : colors.accent }]} />
                <Text style={styles.statusTxt}>{STATUS_LBL[item.status]}</Text>
              </View>
              <Text style={styles.fare}>₹{item.fare}</Text>
            </View>
            <View style={styles.tripBox}>
              <View style={styles.tripRow}>
                <View style={[styles.tripDot, { backgroundColor: colors.primary }]} />
                <Text style={styles.tripText} numberOfLines={1}>{item.pickup.label}</Text>
              </View>
              <View style={[styles.tripRow, { marginTop: 4 }]}>
                <View style={[styles.tripDot, { backgroundColor: colors.accent }]} />
                <Text style={styles.tripText} numberOfLines={1}>{item.drops[item.drops.length - 1]?.label}</Text>
              </View>
            </View>
            <View style={styles.metaFooter}>
              <Text style={styles.metaText}>{item.vehicle_name} · {item.distance_km} km</Text>
              <Text style={styles.metaText}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
          </Pressable>
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
  chipsWrap: { paddingVertical: spacing.s },
  chipsRow: { paddingHorizontal: spacing.xl, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexShrink: 0, height: 36, alignItems: "center", justifyContent: "center" },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.smallBold, color: colors.textPrimary },
  chipTextActive: { color: "#fff" },
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, backgroundColor: colors.surface, marginBottom: spacing.m },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusTxt: { ...typography.smallBold, color: colors.textPrimary },
  fare: { fontSize: 18, fontWeight: "800", color: colors.textPrimary },
  tripBox: { marginTop: spacing.s },
  tripRow: { flexDirection: "row", alignItems: "center", gap: spacing.s },
  tripDot: { width: 8, height: 8, borderRadius: 4 },
  tripText: { ...typography.body, flex: 1 },
  metaFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.s, paddingTop: spacing.s, borderTopWidth: 1, borderTopColor: colors.border },
  metaText: { ...typography.small, color: colors.textMuted },
  empty: { alignItems: "center", paddingVertical: spacing.xxl, gap: 6 },
  emptyTitle: { ...typography.h3, color: colors.textPrimary, marginTop: spacing.s },
  emptySub: { ...typography.body, color: colors.textSecondary },
});
