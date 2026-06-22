import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { api } from "@/src/api/client";
import { colors, radius, spacing, typography } from "@/src/theme";

export default function AdminCustomers() {
  const [items, setItems] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await api.adminCustomers();
      setItems(data);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = items.filter((u) => u.name?.toLowerCase().includes(q.toLowerCase()) || u.phone?.includes(q));

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Customers</Text>
        <Text style={styles.sub}>{items.length} registered users</Text>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={colors.textSecondary} />
          <TextInput
            testID="customer-search"
            value={q}
            onChangeText={setQ}
            placeholder="Search by name or phone"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
        </View>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(u) => u.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: 120 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={36} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No customers</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card} testID={`customer-${item.id}`}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(item.name || "?").split(" ").map((s: string) => s[0]).slice(0, 2).join("")}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>{item.phone}</Text>
              <Text style={styles.metaSmall}>Joined {new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
            <View style={styles.tier}>
              <Ionicons name="leaf" size={11} color="#000" />
              <Text style={styles.tierTxt}>GREEN</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, gap: spacing.s },
  title: { ...typography.h1, color: colors.textPrimary },
  sub: { ...typography.body, color: colors.textSecondary },
  searchBar: { flexDirection: "row", alignItems: "center", gap: spacing.s, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary },
  card: { flexDirection: "row", alignItems: "center", gap: spacing.m, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, backgroundColor: colors.surface, marginBottom: spacing.s },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "800" },
  name: { ...typography.bodyBold },
  meta: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  metaSmall: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  tier: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: colors.accent, borderRadius: radius.pill },
  tierTxt: { fontSize: 10, fontWeight: "800", color: "#000" },
  empty: { alignItems: "center", paddingVertical: 60, gap: 4 },
  emptyTitle: { ...typography.h3, color: colors.textPrimary, marginTop: spacing.s },
});
