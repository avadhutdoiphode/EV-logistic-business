import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Image, TextInput } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import MapViewMock from "@/src/components/MapView";
import { Button } from "@/src/components/Button";
import { useToast } from "@/src/components/Toast";
import { api } from "@/src/api/client";
import { colors, radius, spacing, typography } from "@/src/theme";

const SAVED_PLACES = [
  { id: "p1", label: "MG Road Metro Station", line2: "Bengaluru, KA", lat: 12.9756, lng: 77.6050 },
  { id: "p2", label: "Indiranagar 100ft Rd", line2: "Bengaluru, KA", lat: 12.9784, lng: 77.6408 },
  { id: "p3", label: "Koramangala Forum", line2: "Bengaluru, KA", lat: 12.9352, lng: 77.6146 },
  { id: "p4", label: "HSR Layout Sector 2", line2: "Bengaluru, KA", lat: 12.9116, lng: 77.6446 },
  { id: "p5", label: "Whitefield ITPL", line2: "Bengaluru, KA", lat: 12.9698, lng: 77.7499 },
  { id: "p6", label: "Electronic City Phase 1", line2: "Bengaluru, KA", lat: 12.8458, lng: 77.6770 },
];

const VEHICLE_IMG: Record<string, string> = {
  scooter: "https://images.pexels.com/photos/9168370/pexels-photo-9168370.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=300",
  van: "https://images.pexels.com/photos/32910572/pexels-photo-32910572.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=300",
};

type Stop = { id?: string; label: string; lat: number; lng: number };

export default function BookFlow() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [step, setStep] = useState<"locations" | "vehicle" | "confirm">("locations");
  const [pickup, setPickup] = useState<Stop | null>(SAVED_PLACES[0]);
  const [drops, setDrops] = useState<Stop[]>([SAVED_PLACES[1]]);
  const [activeField, setActiveField] = useState<{ kind: "pickup" } | { kind: "drop"; index: number } | null>(null);
  const [query, setQuery] = useState("");

  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);
  const [fares, setFares] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState<"cash" | "upi" | "card">("upi");

  useEffect(() => {
    (async () => {
      try {
        const v = await api.vehicles();
        setVehicles(v);
        setSelectedVehicle(v[1]); // default to auto cargo
      } catch (e: any) {
        toast.show("Failed to load vehicles", "error");
      }
    })();
  }, [toast]);

  const filtered = useMemo(
    () => SAVED_PLACES.filter((p) => p.label.toLowerCase().includes(query.toLowerCase())),
    [query]
  );

  const computeFares = async (pk: Stop, dr: Stop[]) => {
    if (!pk || dr.length === 0 || vehicles.length === 0) return;
    const out: Record<string, any> = {};
    await Promise.all(
      vehicles.map(async (v) => {
        try {
          out[v.id] = await api.fareEstimate(
            { label: pk.label, lat: pk.lat, lng: pk.lng },
            dr.map((d) => ({ label: d.label, lat: d.lat, lng: d.lng })),
            v.id
          );
        } catch {}
      })
    );
    setFares(out);
  };

  const onProceedToVehicle = async () => {
    if (!pickup || drops.length === 0 || drops.some((d) => !d)) {
      toast.show("Set pickup and drop", "error");
      return;
    }
    setLoading(true);
    await computeFares(pickup, drops);
    setLoading(false);
    setStep("vehicle");
  };

  const onConfirmBooking = async () => {
    if (!pickup || !selectedVehicle) return;
    setLoading(true);
    try {
      const booking: any = await api.createBooking({
        vehicle_id: selectedVehicle.id,
        pickup,
        drops,
        payment_method: payment,
      });
      // Mock Razorpay if not cash
      if (payment !== "cash") {
        try {
          await api.paymentInit(booking.id);
          await api.paymentVerify(booking.id);
        } catch {}
      }
      toast.show("Driver assigned!", "success");
      router.replace({ pathname: "/(customer)/tracking/[id]", params: { id: booking.id } });
    } catch (e: any) {
      toast.show(e.message || "Booking failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const pickPlace = (p: Stop) => {
    if (!activeField) return;
    if (activeField.kind === "pickup") setPickup(p);
    else {
      const next = [...drops];
      next[activeField.index] = p;
      setDrops(next);
    }
    setActiveField(null);
    setQuery("");
  };

  const addStop = () => {
    if (drops.length >= 3) {
      toast.show("Maximum 3 drops", "info");
      return;
    }
    setDrops([...drops, SAVED_PLACES[(drops.length + 2) % SAVED_PLACES.length]]);
  };

  const removeStop = (i: number) => {
    if (drops.length === 1) return;
    setDrops(drops.filter((_, idx) => idx !== i));
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable testID="book-back" style={styles.backBtn} onPress={() => (step === "locations" ? router.back() : setStep(step === "vehicle" ? "locations" : "vehicle"))}>
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {step === "locations" ? "Set pickup & drop" : step === "vehicle" ? "Select a vehicle" : "Confirm booking"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.mapWrap}>
        <MapViewMock
          markers={[
            { lat: 0, lng: 0, color: colors.primary, icon: "navigate" },
            ...drops.map(() => ({ lat: 0, lng: 0, color: colors.accent, icon: "location" as const })),
          ]}
          routeLine
        />
      </View>

      <ScrollView style={styles.sheet} contentContainerStyle={{ paddingBottom: insets.bottom + 120 }} showsVerticalScrollIndicator={false}>
        <View style={styles.handle} />

        {step === "locations" && (
          <View>
            <View style={styles.locCard}>
              <View style={styles.locRow}>
                <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                <Pressable testID="pickup-field" style={styles.locField} onPress={() => setActiveField({ kind: "pickup" })}>
                  <Text style={styles.locLbl}>Pickup</Text>
                  <Text style={styles.locVal} numberOfLines={1}>{pickup?.label || "Select pickup"}</Text>
                </Pressable>
              </View>
              <View style={styles.locDivider} />
              {drops.map((d, i) => (
                <View key={`d-${i}`} style={styles.locRow}>
                  <View style={[styles.dot, { backgroundColor: colors.accent }]} />
                  <Pressable testID={`drop-field-${i}`} style={styles.locField} onPress={() => setActiveField({ kind: "drop", index: i })}>
                    <Text style={styles.locLbl}>Drop {drops.length > 1 ? i + 1 : ""}</Text>
                    <Text style={styles.locVal} numberOfLines={1}>{d?.label || "Select drop"}</Text>
                  </Pressable>
                  {drops.length > 1 && (
                    <Pressable testID={`remove-drop-${i}`} onPress={() => removeStop(i)} style={styles.removeBtn}>
                      <Ionicons name="close" size={16} color={colors.danger} />
                    </Pressable>
                  )}
                </View>
              ))}
              <Pressable testID="add-stop-btn" style={styles.addStop} onPress={addStop}>
                <Ionicons name="add-circle" size={18} color={colors.primary} />
                <Text style={styles.addStopText}>Add another stop</Text>
              </Pressable>
            </View>

            {activeField && (
              <View style={styles.searchPanel}>
                <View style={styles.searchPanelInput}>
                  <Ionicons name="search" size={18} color={colors.textSecondary} />
                  <TextInput
                    testID="search-input"
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search saved places"
                    placeholderTextColor={colors.textMuted}
                    style={{ flex: 1, fontSize: 15, color: colors.textPrimary }}
                  />
                </View>
                {filtered.map((p) => (
                  <Pressable key={p.id} testID={`place-${p.id}`} style={styles.placeRow} onPress={() => pickPlace(p)}>
                    <View style={styles.placeIcon}>
                      <Ionicons name="location" size={16} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.placeTitle}>{p.label}</Text>
                      <Text style={styles.placeSub}>{p.line2}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}

            <View style={{ marginTop: spacing.lg }}>
              <Button testID="proceed-vehicle" label="See vehicle options" onPress={onProceedToVehicle} loading={loading} />
            </View>
          </View>
        )}

        {step === "vehicle" && (
          <View>
            <Text style={styles.subHint}>Distance: {fares[vehicles[0]?.id]?.distance_km || 0} km · ETA on-demand</Text>
            {vehicles.map((v) => {
              const f = fares[v.id];
              const selected = selectedVehicle?.id === v.id;
              return (
                <Pressable
                  key={v.id}
                  testID={`vehicle-${v.id}`}
                  onPress={() => setSelectedVehicle(v)}
                  style={[styles.vehCard, selected && styles.vehCardActive]}
                >
                  <Image
                    source={{ uri: VEHICLE_IMG[v.image_key] || VEHICLE_IMG.van }}
                    style={styles.vehImg}
                  />
                  <View style={{ flex: 1 }}>
                    <View style={styles.vehTitleRow}>
                      <Text style={styles.vehName}>{v.name}</Text>
                      <Text style={styles.vehFare}>{f ? `₹${f.total}` : "…"}</Text>
                    </View>
                    <Text style={styles.vehSub}>{v.description}</Text>
                    <View style={styles.vehMetaRow}>
                      <View style={styles.metaPill}>
                        <Ionicons name="cube" size={11} color={colors.textSecondary} />
                        <Text style={styles.metaText}>{v.capacity_kg} kg</Text>
                      </View>
                      <View style={styles.metaPill}>
                        <Ionicons name="time" size={11} color={colors.textSecondary} />
                        <Text style={styles.metaText}>{v.eta_min} min ETA</Text>
                      </View>
                    </View>
                  </View>
                  {selected && (
                    <View style={styles.tick}>
                      <Ionicons name="checkmark" size={14} color="#000" />
                    </View>
                  )}
                </Pressable>
              );
            })}

            <Button testID="proceed-confirm" label="Continue" onPress={() => setStep("confirm")} style={{ marginTop: spacing.md }} />
          </View>
        )}

        {step === "confirm" && selectedVehicle && (
          <View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryEyebrow}>{selectedVehicle.name}</Text>
              <Text style={styles.summaryTotal}>₹{fares[selectedVehicle.id]?.total || 0}</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryK}>Base</Text>
                <Text style={styles.summaryV}>₹{fares[selectedVehicle.id]?.base_fare}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryK}>Distance ({fares[selectedVehicle.id]?.distance_km} km)</Text>
                <Text style={styles.summaryV}>₹{fares[selectedVehicle.id]?.distance_fare}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryK}>Time ({fares[selectedVehicle.id]?.duration_min} min)</Text>
                <Text style={styles.summaryV}>₹{fares[selectedVehicle.id]?.time_fare}</Text>
              </View>
            </View>

            <Text style={styles.sectionLbl}>Payment method</Text>
            <View style={styles.payRow}>
              {(["cash", "upi", "card"] as const).map((p) => (
                <Pressable
                  key={p}
                  testID={`pay-${p}`}
                  onPress={() => setPayment(p)}
                  style={[styles.payOpt, payment === p && styles.payOptActive]}
                >
                  <Ionicons
                    name={p === "cash" ? "cash" : p === "upi" ? "qr-code" : "card"}
                    size={18}
                    color={payment === p ? "#fff" : colors.textPrimary}
                  />
                  <Text style={[styles.payOptText, payment === p && { color: "#fff" }]}>{p.toUpperCase()}</Text>
                </Pressable>
              ))}
            </View>

            <Button testID="confirm-booking-btn" label={`Confirm booking · ₹${fares[selectedVehicle.id]?.total || 0}`} onPress={onConfirmBooking} loading={loading} variant="accent" style={{ marginTop: spacing.lg }} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingVertical: spacing.s },
  backBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  headerTitle: { ...typography.h3, color: colors.textPrimary },
  mapWrap: { height: 200 },
  sheet: { flex: 1, backgroundColor: colors.surface, marginTop: -24, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: spacing.xl, paddingTop: spacing.s, borderWidth: 1, borderColor: colors.border },
  handle: { alignSelf: "center", width: 44, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: spacing.md },
  locCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.s, backgroundColor: colors.surface },
  locRow: { flexDirection: "row", alignItems: "center", gap: spacing.s, paddingVertical: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  locField: { flex: 1, paddingVertical: 2 },
  locLbl: { ...typography.small, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  locVal: { ...typography.bodyBold, color: colors.textPrimary },
  locDivider: { height: 1, backgroundColor: colors.border, marginLeft: 18 },
  removeBtn: { width: 24, height: 24, alignItems: "center", justifyContent: "center" },
  addStop: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: spacing.s, alignSelf: "flex-start" },
  addStopText: { ...typography.bodyBold, color: colors.primary },
  searchPanel: { marginTop: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.s },
  searchPanelInput: { flexDirection: "row", alignItems: "center", gap: spacing.s, paddingHorizontal: spacing.m, paddingVertical: 10, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, marginBottom: spacing.s },
  placeRow: { flexDirection: "row", alignItems: "center", gap: spacing.m, paddingVertical: spacing.m, paddingHorizontal: spacing.s, borderTopWidth: 1, borderTopColor: colors.border },
  placeIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" },
  placeTitle: { ...typography.bodyBold, color: colors.textPrimary },
  placeSub: { ...typography.small, color: colors.textSecondary },
  subHint: { ...typography.small, color: colors.textSecondary, marginBottom: spacing.m },
  vehCard: { flexDirection: "row", alignItems: "center", gap: spacing.m, padding: spacing.m, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, marginBottom: spacing.s, backgroundColor: colors.surface, position: "relative" },
  vehCardActive: { borderColor: colors.primary, backgroundColor: "#F4FBF6", borderWidth: 2 },
  vehImg: { width: 72, height: 56, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  vehTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  vehName: { ...typography.bodyBold, fontSize: 16 },
  vehFare: { fontSize: 18, fontWeight: "800", color: colors.primary },
  vehSub: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  vehMetaRow: { flexDirection: "row", gap: 6, marginTop: 6 },
  metaPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt },
  metaText: { ...typography.small, color: colors.textSecondary, fontSize: 11 },
  tick: { position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  summaryCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, backgroundColor: colors.surface },
  summaryEyebrow: { ...typography.smallBold, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 1 },
  summaryTotal: { fontSize: 36, fontWeight: "800", color: colors.textPrimary, marginVertical: 6, letterSpacing: -1 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  summaryK: { ...typography.body, color: colors.textSecondary },
  summaryV: { ...typography.bodyBold, color: colors.textPrimary },
  sectionLbl: { ...typography.h3, marginTop: spacing.xl, marginBottom: spacing.s },
  payRow: { flexDirection: "row", gap: spacing.s },
  payOpt: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  payOptActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  payOptText: { ...typography.bodyBold, color: colors.textPrimary, fontSize: 13 },
});
