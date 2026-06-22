import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import MapViewMock from "@/src/components/MapView";
import { useAuth } from "@/src/auth/AuthContext";
import { colors, radius, spacing, typography } from "@/src/theme";

const QUICK = [
  { key: "scooter", title: "Parcel", icon: "cube", img: "https://images.pexels.com/photos/9168370/pexels-photo-9168370.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=300" },
  { key: "auto", title: "Cargo", icon: "car-sport", img: "https://images.pexels.com/photos/32910572/pexels-photo-32910572.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=300" },
  { key: "shift", title: "Move home", icon: "home" },
  { key: "biz", title: "Business", icon: "briefcase" },
];

export default function CustomerHome() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Map background */}
      <View style={styles.mapWrap}>
        <MapViewMock markers={[{ lat: 0, lng: 0, color: colors.primary, icon: "navigate" }]} />
        <View style={styles.topBar}>
          <View style={styles.greeting}>
            <Text style={styles.helloLbl}>Hi {user?.name?.split(" ")[0] || "there"}</Text>
            <Text style={styles.helloSub}>Where to today?</Text>
          </View>
          <View style={styles.ecoBadge}>
            <Ionicons name="leaf" size={12} color="#000" />
            <Text style={styles.ecoText}>100% EV</Text>
          </View>
        </View>
      </View>

      {/* Sheet */}
      <ScrollView style={styles.sheet} contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View style={styles.handle} />

        <Pressable testID="search-pickup" style={styles.searchBar} onPress={() => router.push("/(customer)/book")}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <Text style={styles.searchTxt}>Where do you want to send?</Text>
          <View style={styles.searchPlusWrap}>
            <Ionicons name="add" size={18} color="#000" />
          </View>
        </Pressable>

        <Text style={styles.sectionLbl}>Quick book</Text>
        <View style={styles.quickGrid}>
          {QUICK.map((q) => (
            <Pressable
              key={q.key}
              testID={`quick-${q.key}`}
              onPress={() => router.push("/(customer)/book")}
              style={styles.quickCard}
            >
              {q.img ? (
                <Image source={{ uri: q.img }} style={styles.quickImg} />
              ) : (
                <View style={[styles.quickImg, styles.quickIcon]}>
                  <Ionicons name={q.icon as any} size={26} color={colors.primary} />
                </View>
              )}
              <Text style={styles.quickTitle}>{q.title}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.promoCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.promoEyebrow}>NEW</Text>
            <Text style={styles.promoTitle}>Save 20% on your{"\n"}first three rides</Text>
            <Text style={styles.promoSub}>Use code VOLT20 at checkout.</Text>
          </View>
          <View style={styles.promoIcon}>
            <Ionicons name="pricetag" size={28} color="#000" />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  mapWrap: { height: "44%", overflow: "hidden" },
  topBar: { position: "absolute", top: spacing.md, left: spacing.xl, right: spacing.xl, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  greeting: { backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  helloLbl: { ...typography.smallBold, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 },
  helloSub: { ...typography.bodyBold, color: colors.textPrimary, marginTop: 2 },
  ecoBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.accent, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill },
  ecoText: { fontSize: 11, fontWeight: "800", color: "#000" },
  sheet: { flex: 1, backgroundColor: colors.surface, marginTop: -24, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: spacing.xl, paddingTop: spacing.s, borderWidth: 1, borderColor: colors.border },
  handle: { alignSelf: "center", width: 44, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: spacing.md },
  searchBar: { flexDirection: "row", alignItems: "center", gap: spacing.s, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 14, borderWidth: 1, borderColor: colors.border },
  searchTxt: { flex: 1, ...typography.body, color: colors.textSecondary },
  searchPlusWrap: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  sectionLbl: { ...typography.h3, marginTop: spacing.xl, marginBottom: spacing.m, color: colors.textPrimary },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.m },
  quickCard: { width: "47%", borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.surface },
  quickImg: { width: "100%", height: 96, backgroundColor: colors.surfaceAlt },
  quickIcon: { alignItems: "center", justifyContent: "center" },
  quickTitle: { ...typography.bodyBold, padding: spacing.m, color: colors.textPrimary },
  promoCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.xl, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.primary },
  promoEyebrow: { fontSize: 10, fontWeight: "800", color: colors.accent, letterSpacing: 1.5 },
  promoTitle: { fontSize: 18, fontWeight: "800", color: "#fff", marginTop: 4, lineHeight: 22 },
  promoSub: { ...typography.small, color: "#D5DBC9", marginTop: 4 },
  promoIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
});
