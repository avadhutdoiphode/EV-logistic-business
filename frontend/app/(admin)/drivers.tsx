import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { api } from "@/src/api/client";
import { colors, radius, spacing, typography } from "@/src/theme";

export default function AdminDrivers() {
  const [items, setItems] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await api.adminDrivers();
      setItems(data);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = items.filter(
    (d) => d.name?.toLowerCase().includes(q.toLowerCase()) || d.vehicle_number?.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Drivers</Text>
        <Text style={styles.sub}>{items.length} registered · {items.filter((i) => i.is_online).length} online</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={colors.textSecondary} />
          <TextInput
            testID="driver-search"
            value={q}
            onChangeText={setQ}
            placeholder="Search by name or vehicle no."
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
        </View>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(d) => d.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: 120 }}
        renderItem={({ item }) => (
          <View style={styles.card} testID={`driver-${item.id}`}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(item.name || "?").split(" ").map((s: string) => s[0]).slice(0, 2).join("")}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>{item.phone} · {item.vehicle_number || "PENDING"}</Text>
              <View style={styles.tagsRow}>
                <View style={[styles.tag, item.is_online ? styles.tagOn : styles.tagOff]}>
                  <View style={[styles.dot, { backgroundColor: item.is_online ? colors.accent : colors.textMuted }]} />
                  <Text style={[styles.tagText, item.is_online && { color: "#fff" }]}>{item.is_online ? "Online" : "Offline"}</Text>
                </View>
                <Text style={styles.ratingTxt}>⭐ {item.rating?.toFixed(1) || "5.0"}</Text>
              </View>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.s, gap: spacing.s },
  title: { ...typography.h1, color: colors.textPrimary },
  sub: { ...typography.body, color: colors.textSecondary },
  searchBar: { flexDirection: "row", alignItems: "center", gap: spacing.s, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginTop: spacing.s },
  searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary },
  card: { flexDirection: "row", alignItems: "center", gap: spacing.m, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, marginBottom: spacing.s },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "800" },
  name: { ...typography.bodyBold, color: colors.textPrimary },
  meta: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  tagsRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, borderWidth: 1 },
  tagOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tagOff: { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
  dot: { width: 6, height: 6, borderRadius: 3 },
  tagText: { fontSize: 11, fontWeight: "700", color: colors.textSecondary },
  ratingTxt: { ...typography.smallBold, fontSize: 12 },
});
