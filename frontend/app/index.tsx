import React, { useEffect } from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/src/auth/AuthContext";
import { colors, radius, spacing, typography } from "@/src/theme";

const ROLES = [
  {
    key: "customer",
    title: "I need a delivery",
    sub: "Book an EV for parcels, shifting & more",
    icon: "cube-outline",
    accent: true,
  },
  {
    key: "driver",
    title: "I'm a driver partner",
    sub: "Accept jobs & track earnings",
    icon: "car-sport-outline",
  },
  {
    key: "admin",
    title: "Operations Admin",
    sub: "Manage fleet, customers & revenue",
    icon: "shield-checkmark-outline",
  },
] as const;

export default function Index() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user?.role === "customer") router.replace("/(customer)/home");
    else if (user?.role === "driver") router.replace("/(driver)/home");
    else if (user?.role === "admin") router.replace("/(admin)/dashboard");
  }, [user, loading, router]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.logo}>
              <Ionicons name="flash" size={22} color="#000" />
            </View>
            <Text style={styles.brand}>VoltGo</Text>
          </View>
          <View style={styles.heroWrap}>
            <Text style={styles.heroEyebrow}>Electric. Effortless. On‑demand.</Text>
            <Text style={styles.heroTitle}>Move anything,{"\n"}<Text style={{ color: colors.primary }}>zero emissions.</Text></Text>
            <Text style={styles.heroSub}>{`India's first all‑electric logistics network. Book a ride for your parcel, your furniture, or your business.`}</Text>
          </View>
        </View>

        <View style={styles.cards}>
          {ROLES.map((r) => (
            <Pressable
              key={r.key}
              testID={`role-${r.key}`}
              onPress={() => router.push({ pathname: "/login", params: { role: r.key } })}
              style={({ pressed }) => [
                styles.card,
                r.accent && styles.cardAccent,
                pressed && { transform: [{ scale: 0.99 }], opacity: 0.95 },
              ]}
            >
              <View style={[styles.iconWrap, r.accent ? styles.iconAccent : styles.iconDefault]}>
                <Ionicons name={r.icon as any} size={24} color={r.accent ? "#000" : "#fff"} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, r.accent && { color: "#000" }]}>{r.title}</Text>
                <Text style={[styles.cardSub, r.accent && { color: "#1F2937" }]}>{r.sub}</Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color={r.accent ? "#000" : colors.primary} />
            </Pressable>
          ))}
        </View>

        <Text style={styles.footer}>{`By continuing you agree to VoltGo's Terms & Privacy Policy.`}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xl, justifyContent: "space-between" },
  header: { gap: spacing.xl },
  brandRow: { flexDirection: "row", alignItems: "center", gap: spacing.s },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5, color: colors.primary },
  heroWrap: { marginTop: spacing.lg, gap: spacing.s },
  heroEyebrow: { ...typography.smallBold, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 1 },
  heroTitle: { fontSize: 38, fontWeight: "800", color: colors.textPrimary, letterSpacing: -1, lineHeight: 42 },
  heroSub: { ...typography.body, color: colors.textSecondary, marginTop: spacing.s, lineHeight: 22 },
  cards: { gap: spacing.m, marginVertical: spacing.xl },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardAccent: { backgroundColor: colors.accent, borderColor: "#A8C800" },
  iconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  iconAccent: { backgroundColor: "#0B3B24" },
  iconDefault: { backgroundColor: colors.primary },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  cardSub: { ...typography.small, marginTop: 2 },
  footer: { ...typography.small, textAlign: "center", color: colors.textMuted, marginBottom: spacing.md },
});
