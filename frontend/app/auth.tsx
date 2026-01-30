import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Keyboard, Pressable } from "react-native";
import { SafeAreaView as SafeAreaViewContext } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AuthForm from "../src/components/AuthForm";

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
  safe: { flex: 1, backgroundColor: "#f6f8fb" },
  container: { flex: 1, padding: 20, alignItems: "center" },
  brand: { fontSize: 40, fontWeight: "800", color: "#0a84ff", marginTop: 24 },
  subtitle: { color: "#6b7280", marginTop: 6, textAlign: "center", marginBottom: 18 },
  segment: { flexDirection: "row", width: "100%", marginBottom: 12, borderRadius: 12, overflow: "hidden" },
  segBtn: { flex: 1, padding: 12, alignItems: "center", backgroundColor: "#fff" },
  segBtnActive: { backgroundColor: "#0a84ff" },
  segText: { color: "#374151", fontWeight: "600" },
  segTextActive: { color: "#fff" },
  card: { width: "100%", marginTop: 8, backgroundColor: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 2px 10px rgba(0, 0, 0, 0.05)" },
});
