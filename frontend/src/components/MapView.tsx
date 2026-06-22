import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/theme";

type Marker = { lat: number; lng: number; color?: string; icon?: keyof typeof Ionicons.glyphMap; label?: string };

type Props = {
  markers?: Marker[];
  routeLine?: boolean;
  driverMarker?: Marker | null;
  animateDriver?: boolean;
  showGrid?: boolean;
};

// Mock map: stylized canvas with grid + roads + animated markers.
// Real Google Maps would replace this component; props are intentionally generic.
export default function MapViewMock({
  markers = [],
  routeLine = false,
  driverMarker,
  animateDriver = false,
  showGrid = true,
}: Props) {
  const pulse = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.linear, useNativeDriver: true })
    ).start();
    if (animateDriver) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(slide, { toValue: 1, duration: 6000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(slide, { toValue: 0, duration: 6000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();
    }
  }, [pulse, slide, animateDriver]);

  return (
    <View style={styles.container} testID="map-view">
      <View style={styles.background} />
      {showGrid && (
        <View style={styles.gridWrap} pointerEvents="none">
          {[...Array(8)].map((_, i) => (
            <View key={`h-${i}`} style={[styles.gridLine, { top: `${(i + 1) * 12.5}%`, width: "100%", height: 1 }]} />
          ))}
          {[...Array(6)].map((_, i) => (
            <View key={`v-${i}`} style={[styles.gridLine, { left: `${(i + 1) * 16}%`, height: "100%", width: 1 }]} />
          ))}
        </View>
      )}
      {/* Roads */}
      <View style={[styles.road, { top: "30%", left: 0, right: 0, height: 14 }]} />
      <View style={[styles.road, { top: "65%", left: 0, right: 0, height: 10 }]} />
      <View style={[styles.road, { left: "25%", top: 0, bottom: 0, width: 12 }]} />
      <View style={[styles.road, { left: "70%", top: 0, bottom: 0, width: 16 }]} />

      {routeLine && (
        <View style={styles.routeLine}>
          {[...Array(20)].map((_, i) => (
            <View key={i} style={styles.routeDash} />
          ))}
        </View>
      )}

      {markers.map((m, i) => {
        const top = `${20 + i * 22}%` as any;
        const left = `${25 + i * 18}%` as any;
        const Icon = m.icon || (i === 0 ? "navigate" : "location");
        return (
          <View key={`m-${i}`} style={[styles.marker, { top, left }]}>
            <View style={[styles.markerInner, { backgroundColor: m.color || colors.primary }]}>
              <Ionicons name={Icon as any} size={14} color={m.color === colors.accent ? "#000" : "#fff"} />
            </View>
          </View>
        );
      })}

      {driverMarker && (
        <Animated.View
          style={[
            styles.marker,
            {
              top: "48%",
              left: slide.interpolate({ inputRange: [0, 1], outputRange: ["30%", "62%"] as any }) as any,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.pulseRing,
              {
                opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
                transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 2.2] }) }],
              },
            ]}
          />
          <View style={[styles.markerInner, { backgroundColor: colors.accent }]}>
            <Ionicons name="car" size={14} color="#000" />
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: "hidden", backgroundColor: colors.mapBg },
  background: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.mapBg },
  gridWrap: { ...StyleSheet.absoluteFillObject },
  gridLine: { position: "absolute", backgroundColor: "rgba(11,59,36,0.07)" },
  road: { position: "absolute", backgroundColor: colors.mapRoad },
  routeLine: { position: "absolute", top: "32%", left: "27%", right: "30%", height: 4, flexDirection: "row", justifyContent: "space-between" },
  routeDash: { width: 8, height: 4, backgroundColor: colors.primary, borderRadius: 2 },
  marker: { position: "absolute", alignItems: "center", justifyContent: "center" },
  markerInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  pulseRing: { position: "absolute", width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accent },
});
