import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, Pressable, ScrollView } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { api } from "@/src/api/client";
import { useAuth } from "@/src/auth/AuthContext";
import { useToast } from "@/src/components/Toast";
import { Button } from "@/src/components/Button";
import { colors, radius, spacing, typography } from "@/src/theme";

const ROLE_PRESETS: Record<string, { phone: string; label: string }> = {
  customer: { phone: "1111111111", label: "Customer" },
  driver: { phone: "2222222222", label: "Driver Partner" },
  admin: { phone: "9999999999", label: "Admin" },
};

export default function Login() {
  const params = useLocalSearchParams<{ role?: string }>();
  const role = (params.role as "customer" | "driver" | "admin") || "customer";
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState(ROLE_PRESETS[role]?.phone || "");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("1234");
  const [loading, setLoading] = useState(false);

  const fullPhone = `+91${phone.replace(/\D/g, "").slice(0, 10)}`;

  const onSendOtp = async () => {
    if (phone.replace(/\D/g, "").length !== 10) {
      toast.show("Enter a valid 10-digit phone", "error");
      return;
    }
    setLoading(true);
    try {
      await api.sendOtp(fullPhone, role);
      toast.show("OTP sent — demo code 1234", "success");
      setStep("otp");
    } catch (e: any) {
      toast.show(e.message || "Failed to send OTP", "error");
    } finally {
      setLoading(false);
    }
  };

  const onVerify = async () => {
    if (otp.length !== 4) {
      toast.show("Enter the 4-digit code", "error");
      return;
    }
    setLoading(true);
    try {
      const { token, user } = await api.verifyOtp(fullPhone, otp, role, name || undefined);
      await signIn(token, user);
      toast.show(`Welcome, ${user.name}`, "success");
      if (user.role === "customer") router.replace("/(customer)/home");
      else if (user.role === "driver") router.replace("/(driver)/home");
      else router.replace("/(admin)/dashboard");
    } catch (e: any) {
      toast.show(e.message || "Login failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = () => {
    toast.show("Google Sign-in is mocked — using phone OTP", "info");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Pressable testID="back-btn" onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
            </Pressable>
            <View style={styles.roleChip}>
              <Text style={styles.roleChipText}>{ROLE_PRESETS[role]?.label || role}</Text>
            </View>
          </View>

          <View style={styles.body}>
            <Text style={styles.title}>{step === "phone" ? "Enter your phone" : "Verify OTP"}</Text>
            <Text style={styles.sub}>
              {step === "phone"
                ? "We'll send a 4-digit code to confirm your number."
                : `Sent to ${fullPhone}. Demo OTP: 1234`}
            </Text>

            {step === "phone" ? (
              <>
                <View style={styles.inputRow}>
                  <View style={styles.flag}>
                    <Text style={styles.flagText}>+91</Text>
                  </View>
                  <TextInput
                    testID="phone-input"
                    value={phone}
                    onChangeText={(t) => setPhone(t.replace(/\D/g, "").slice(0, 10))}
                    placeholder="10-digit mobile"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    style={styles.input}
                  />
                </View>
                {role !== "admin" && (
                  <TextInput
                    testID="name-input"
                    value={name}
                    onChangeText={setName}
                    placeholder="Your name (optional)"
                    placeholderTextColor={colors.textMuted}
                    style={styles.inputSolo}
                  />
                )}

                <Button testID="send-otp-btn" label="Continue" onPress={onSendOtp} loading={loading} />

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>
                <Button
                  testID="google-btn"
                  label="Continue with Google"
                  variant="outline"
                  onPress={onGoogle}
                  icon={<Ionicons name="logo-google" size={18} color={colors.primary} />}
                />

                <View style={styles.demoBox}>
                  <Ionicons name="information-circle" size={16} color={colors.primary} />
                  <Text style={styles.demoText}>
                    Demo phones — Customer: 1111111111 · Driver: 2222222222 · Admin: 9999999999. OTP is 1234 (any 4 digits work).
                  </Text>
                </View>
              </>
            ) : (
              <>
                <TextInput
                  testID="otp-input"
                  value={otp}
                  onChangeText={(t) => setOtp(t.replace(/\D/g, "").slice(0, 4))}
                  placeholder="0000"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  style={[styles.inputSolo, styles.otpInput]}
                  maxLength={4}
                />
                <Button testID="verify-otp-btn" label={`Verify & continue`} onPress={onVerify} loading={loading} />
                <Pressable testID="change-phone-btn" onPress={() => setStep("phone")} style={styles.linkBtn}>
                  <Text style={styles.linkText}>Change phone number</Text>
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  backBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  roleChip: { paddingHorizontal: spacing.m, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.primary },
  roleChipText: { color: "#fff", fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.xxl, gap: spacing.md },
  title: { ...typography.h1, color: colors.textPrimary },
  sub: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md },
  inputRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, overflow: "hidden" },
  flag: { paddingHorizontal: spacing.md, paddingVertical: 14, borderRightWidth: 1, borderRightColor: colors.border, backgroundColor: colors.surfaceAlt },
  flagText: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  input: { flex: 1, paddingHorizontal: spacing.md, paddingVertical: 14, fontSize: 16, color: colors.textPrimary },
  inputSolo: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: 14, fontSize: 16, color: colors.textPrimary },
  otpInput: { textAlign: "center", letterSpacing: 16, fontSize: 28, fontWeight: "700" },
  divider: { flexDirection: "row", alignItems: "center", gap: spacing.m, marginVertical: spacing.s },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { ...typography.small, color: colors.textMuted },
  demoBox: { flexDirection: "row", gap: 8, padding: spacing.m, backgroundColor: "#ECF7F0", borderRadius: radius.md, borderWidth: 1, borderColor: "#C8E6D2", marginTop: spacing.s },
  demoText: { flex: 1, ...typography.small, color: colors.primary, lineHeight: 18 },
  linkBtn: { alignSelf: "center", marginTop: spacing.s },
  linkText: { ...typography.bodyBold, color: colors.primary },
});
