import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Keyboard, Pressable } from "react-native";
import { useRouter } from "expo-router";
import useAuthStore from "../store/useAuthStore";

type Props = {
  mode: "login" | "register";
  onSuccess?: () => void;
};

export default function AuthForm({ mode, onSuccess }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);

  const handleSubmit = async () => {
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email.trim(), password, "TRAINEE");
        onSuccess && onSuccess();
      } else {
        const result = await register(name.trim(), email.trim(), password, phone.trim());
        // Show success message for registration
        setSuccessMessage("Registration successful! Please check your email to verify your account before logging in.");
        // Clear form
        setName("");
        setEmail("");
        setPassword("");
        setPhone("");
      }
    } catch (err: any) {
      // Handle different types of errors
      if (err.message?.includes('Network request failed') || err.message?.includes('fetch')) {
        setError("Unable to connect to server. Please check your internet connection and try again.");
      } else if (err.message?.includes('Invalid email or password')) {
        setError("Invalid email or password. Please try again.");
      } else if (err.message?.includes('Email already registered')) {
        setError("This email is already registered. Please try logging in instead.");
      } else {
        setError(err.message || "An error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable style={styles.container} onPress={() => Keyboard.dismiss()}>
      {mode === "register" && (
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput placeholder="" value={name} onChangeText={setName} style={styles.input} />
        </View>
      )}

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Email Address</Text>
        <TextInput placeholder="" value={email} onChangeText={setEmail} style={styles.input} keyboardType="email-address" autoCapitalize="none" />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Password</Text>
        <TextInput placeholder="" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
      </View>

      {mode === "register" && (
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Phone <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput placeholder="" value={phone} onChangeText={setPhone} style={styles.input} keyboardType="phone-pad" />
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {successMessage ? (
        <View style={styles.successContainer}>
          <Text style={styles.success}>{successMessage}</Text>
          <TouchableOpacity onPress={() => router.push("/verify-email")}>
            <Text style={styles.verifyLink}>Verify Email Now →</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <TouchableOpacity style={styles.submit} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{mode === "login" ? "Sign In" : "Create Account"}</Text>}
      </TouchableOpacity>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", paddingHorizontal: 8 },
  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 14, fontWeight: "600", color: "#1f2937", marginBottom: 6 },
  optional: { fontSize: 12, fontWeight: "400", color: "#9ca3af" },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#e6e6e6",
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    fontSize: 16,
    color: "#1f2937",
  },
  submit: { height: 48, backgroundColor: "#0a84ff", borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 6 },
  submitText: { color: "#fff", fontWeight: "600" },
  error: { color: "#b00020", marginBottom: 6, textAlign: "center" },
  successContainer: { marginBottom: 12, alignItems: "center" },
  success: { color: "#059669", marginBottom: 8, textAlign: "center", fontSize: 14, lineHeight: 20 },
  verifyLink: { color: "#0a84ff", fontSize: 15, fontWeight: "600", textDecorationLine: "underline" },
});
