import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Animated,
  Easing,
  Dimensions,
} from "react-native";

const SPLASH_BG = require("../assets/images/grailbabe-splash.png");
const LOGO = require("../assets/images/grailbabe-logo.png");

interface Props {
  onEnter: () => void;
}

export function SplashGate({ onEnter }: Props) {
  const { width, height } = Dimensions.get("window");

  const [showButton, setShowButton] = useState(false);
  const exitOpacity = useRef(new Animated.Value(1)).current;
  const exitScale = useRef(new Animated.Value(1)).current;

  // Curtain animations (3 vertical panels lifting up)
  const curtain1 = useRef(new Animated.Value(0)).current;
  const curtain2 = useRef(new Animated.Value(0)).current;
  const curtain3 = useRef(new Animated.Value(0)).current;

  // Logo neon flicker
  const logoOpacity = useRef(new Animated.Value(0)).current;

  // Enter button fade-in
  const enterOpacity = useRef(new Animated.Value(0)).current;
  const enterTranslate = useRef(new Animated.Value(16)).current;

  // Button pulse
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const cubic = Easing.bezier(0.76, 0, 0.24, 1);
    Animated.stagger(700, [
      Animated.timing(curtain1, {
        toValue: 1,
        duration: 1000,
        easing: cubic,
        useNativeDriver: true,
      }),
      Animated.timing(curtain2, {
        toValue: 1,
        duration: 1000,
        easing: cubic,
        useNativeDriver: true,
      }),
      Animated.timing(curtain3, {
        toValue: 1,
        duration: 1000,
        easing: cubic,
        useNativeDriver: true,
      }),
    ]).start();

    // Neon flicker for logo (start ~2.5s in)
    const flicker = setTimeout(() => {
      Animated.sequence([
        Animated.timing(logoOpacity, { toValue: 0.9, duration: 60, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 0.1, duration: 60, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 0.4, duration: 80, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 0.7, duration: 100, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]).start();
    }, 2400);

    // Show ENTER button at 3s
    const btnTimer = setTimeout(() => {
      setShowButton(true);
      Animated.parallel([
        Animated.timing(enterOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(enterTranslate, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.06, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ]),
      ).start();
    }, 3000);

    return () => {
      clearTimeout(flicker);
      clearTimeout(btnTimer);
    };
  }, [curtain1, curtain2, curtain3, logoOpacity, enterOpacity, enterTranslate, pulse]);

  const exitedRef = useRef(false);
  const finish = React.useCallback(() => {
    if (exitedRef.current) return;
    exitedRef.current = true;
    onEnter();
  }, [onEnter]);

  const handleEnter = React.useCallback(() => {
    if (exitedRef.current) return;
    // Best-effort exit animation; unblock app deterministically via timer.
    Animated.parallel([
      Animated.timing(exitOpacity, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(exitScale, {
        toValue: 1.04,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();
    setTimeout(finish, 700);
  }, [exitOpacity, exitScale, finish]);

  // Auto-dismiss safety: ensures the splash never blocks the app forever
  // (e.g. when rendered in a throttled canvas iframe where animations stall).
  useEffect(() => {
    const t = setTimeout(handleEnter, 4500);
    return () => clearTimeout(t);
  }, [handleEnter]);

  const panelTranslate = (anim: Animated.Value) =>
    anim.interpolate({ inputRange: [0, 1], outputRange: [0, -height * 1.1] });

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: exitOpacity, transform: [{ scale: exitScale }] },
      ]}
    >
      <Image source={SPLASH_BG} style={styles.bgImage} resizeMode="cover" />
      <View style={styles.gradientOverlay} pointerEvents="none" />

      {/* Three curtains */}
      <Animated.View
        style={[
          styles.curtain,
          {
            left: 0,
            width: width / 3 + 1,
            backgroundColor: "#060a14",
            transform: [{ translateY: panelTranslate(curtain1) }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.curtain,
          {
            left: width / 3,
            width: width / 3 + 1,
            backgroundColor: "#060e09",
            transform: [{ translateY: panelTranslate(curtain2) }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.curtain,
          {
            left: (width * 2) / 3,
            width: width / 3 + 1,
            backgroundColor: "#140606",
            transform: [{ translateY: panelTranslate(curtain3) }],
          },
        ]}
      />

      <Animated.Image
        source={LOGO}
        style={[
          styles.logo,
          {
            width: Math.min(Math.max(width * 0.68, 220), 520),
            opacity: logoOpacity,
          },
        ]}
        resizeMode="contain"
      />

      {showButton && (
        <Animated.View
          style={[
            styles.enterWrap,
            {
              opacity: enterOpacity,
              transform: [{ translateY: enterTranslate }],
            },
          ]}
        >
          <Animated.View style={{ transform: [{ scale: pulse }] }}>
            <Pressable
              onPress={handleEnter}
              style={({ pressed }) => [
                styles.enterBtn,
                { opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={styles.enterText}>ENTER</Text>
            </Pressable>
          </Animated.View>
          <Text style={styles.tapHint}>tap to begin</Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    backgroundColor: "#000",
  },
  bgImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  curtain: {
    position: "absolute",
    top: 0,
    height: "110%",
    zIndex: 2,
  },
  logo: {
    position: "absolute",
    bottom: "22%",
    alignSelf: "center",
    height: 120,
    zIndex: 3,
  },
  enterWrap: {
    position: "absolute",
    bottom: "8%",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 4,
    gap: 10,
  },
  enterBtn: {
    minWidth: 160,
    minHeight: 48,
    paddingHorizontal: 52,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: "#00ff88",
    borderRadius: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    shadowColor: "#00ff88",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 18,
    elevation: 8,
  },
  enterText: {
    color: "#00ff88",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 4,
    fontFamily: "Inter_700Bold",
  },
  tapHint: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontFamily: "Inter_500Medium",
  },
});
