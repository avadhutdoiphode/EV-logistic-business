import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View, Easing } from "react-native";
import { colors, radius } from "@/src/theme";

type ToastMsg = { id: number; text: string; tone: "success" | "error" | "info" };

const Ctx = createContext<{ show: (text: string, tone?: ToastMsg["tone"]) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msgs, setMsgs] = useState<ToastMsg[]>([]);
  const idRef = useRef(0);

  const show = useCallback((text: string, tone: ToastMsg["tone"] = "info") => {
    const id = ++idRef.current;
    setMsgs((m) => [...m, { id, text, tone }]);
    setTimeout(() => setMsgs((m) => m.filter((x) => x.id !== id)), 2800);
  }, []);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <View pointerEvents="none" style={styles.host} testID="toast-host">
        {msgs.map((m) => (
          <ToastItem key={m.id} msg={m} />
        ))}
      </View>
    </Ctx.Provider>
  );
}

function ToastItem({ msg }: { msg: ToastMsg }) {
  const a = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [a]);
  const bg =
    msg.tone === "success" ? colors.primary : msg.tone === "error" ? colors.danger : colors.secondary;
  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: bg,
          opacity: a,
          transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        },
      ]}
    >
      <Text style={styles.toastText}>{msg.text}</Text>
    </Animated.View>
  );
}

export function useToast() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useToast must be inside ToastProvider");
  return v;
}

const styles = StyleSheet.create({
  host: { position: "absolute", left: 0, right: 0, top: 60, alignItems: "center", zIndex: 9999 },
  toast: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: radius.md, maxWidth: "85%", marginBottom: 8 },
  toastText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
