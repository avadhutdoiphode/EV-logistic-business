import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { api } from "@/src/api/client";
import { colors, radius, spacing, typography } from "@/src/theme";

const FILTERS = ["all", "pending", "in_transit", "completed", "cancelled"] as const;
const FILTER_LBL: Record<string, string> = { all: "All", pending: "Pending", in_transit: "Active", completed: "Completed", cancelled: "Cancelled" };
const STATUS_LBL: Record<string, string> = { pending: "Pending", accepted: "Assigned", arriving: "Arriving", in_transit: "In transit", completed: "Completed", cancelled: "Cancelled" };

export default function AdminBookings() {
  const [items, setItems] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await api.adminBookings();
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
    if (filter === "in_transit") return ["accepted", "arriving", "in_transit"].includes(b.status);
    return b.status === filter;
  });

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Bookings</Text>
        <Text style={styles.sub}>{items.length} total · revenue ₹{items.filter(i=>i.status==="completed").reduce((a, b) => a + b.fare, 0).toLocaleString()}</Text>
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
              <Pressable testID={`filter-${item}`} onPress={() => setFilter(item)} style={[styles.chip, active && styles.chipActive]}>
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
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: 120 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.statusPill}>
                <View style={[styles.dot, { backgroundColor: item.status === "completed" ? colors.primary : colors.accent }]} />
                <Text style={styles.statusTxt}>{STATUS_LBL[item.status]}</Text>
              </View>
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
            <View style={styles.meta}>
              <Text style={styles.metaTxt}><Ionicons name="person" size={11} /> {item.customer_name}</Text>
              <Text style={styles.metaTxt}><Ionicons name="car-sport" size={11} /> {item.driver_name || "—"}</Text>
              <Text style={styles.metaTxt}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  title: { ...typography.h1, color: colors.textPrimary },
  sub: { ...typography.body, color: colors.textSecondary, marginTop: 2 },
  chipsWrap: { paddingVertical: spacing.s },
  chipsRow: { paddingHorizontal: spacing.xl, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexShrink: 0, height: 36, alignItems: "center", justifyContent: "center" },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.smallBold, color: colors.textPrimary },
  chipTextActive: { color: "#fff" },
  card: { padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, marginBottom: spacing.s },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusTxt: { ...typography.smallBold },
  fare: { fontSize: 18, fontWeight: "800", color: colors.textPrimary },
  tripBox: { gap: 4, marginTop: spacing.s },
  tripRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tripDot: { width: 8, height: 8, borderRadius: 4 },
  tripText: { ...typography.body, flex: 1 },
  meta: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.s, paddingTop: spacing.s, borderTopWidth: 1, borderTopColor: colors.border, flexWrap: "wrap", gap: 4 },
  metaTxt: { ...typography.small, color: colors.textSecondary },
});
