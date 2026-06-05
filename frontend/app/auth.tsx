import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Keyboard, Pressable } from "react-native";
import { SafeAreaView as SafeAreaViewContext } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AuthForm from "../src/components/AuthForm";
import { colors, radius, shadow } from "../src/theme";

export default function AuthScreen() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const router = useRouter();

  const handleSuccess = () => {
    router.replace("/home");
  };

  return (
    <SafeAreaViewContext style={styles.safe}>
      <Pressable style={styles.container} onPress={() => Keyboard.dismiss()}>
        <Text style={styles.brand}>GetFit</Text>
        <Text style={styles.subtitle}>Simple fitness tracking for trainees & trainers</Text>

        <View style={styles.segment}>
          <TouchableOpacity style={[styles.segBtn, mode === "login" && styles.segBtnActive]} onPress={() => setMode("login")}>
            <Text style={[styles.segText, mode === "login" && styles.segTextActive]}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.segBtn, mode === "register" && styles.segBtnActive]} onPress={() => setMode("register")}>
            <Text style={[styles.segText, mode === "register" && styles.segTextActive]}>Register</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <AuthForm mode={mode} onSuccess={handleSuccess} />
        </View>
      </Pressable>
    </SafeAreaViewContext>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: 20, alignItems: "center" },
  brand: { fontSize: 40, fontWeight: "800", color: colors.primary, marginTop: 24 },
  subtitle: { color: colors.textSecondary, marginTop: 6, textAlign: "center", marginBottom: 18 },
  segment: { flexDirection: "row", width: "100%", marginBottom: 12, borderRadius: radius.md, overflow: "hidden" },
  segBtn: { flex: 1, padding: 12, alignItems: "center", backgroundColor: colors.surface },
  segBtnActive: { backgroundColor: colors.primary },
  segText: { color: "#374151", fontWeight: "600" },
  segTextActive: { color: colors.surface },
  card: { width: "100%", marginTop: 8, backgroundColor: colors.surface, borderRadius: radius.md, padding: 16, ...shadow.sm },
});
