import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Keyboard, Pressable } from "react-native";
import { useRouter } from "expo-router";
import useAuthStore from "../store/useAuthStore";
import { AUTH_URL } from "../constants/api";
import { colors, radius } from "../theme";

type Props = {
  mode: "login" | "register";
  onSuccess?: () => void;
};

export default function AuthForm({ mode, onSuccess }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [unverifiedEmail, setUnverifiedEmail] = useState("");

  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const setToken = useAuthStore((s) => s.setToken);
  const setUser = useAuthStore((s) => s.setUser);

  const handleSubmit = async () => {
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    if (mode === "register") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      if (!emailRegex.test(email.trim())) {
        setError("Please enter a valid email address.");
        setLoading(false);
        return;
      }
      if (email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) {
        setError("Email addresses do not match. Please check and try again.");
        setLoading(false);
        return;
      }
    }

    try {
      if (mode === "login") {
        await login(email.trim(), password);
        onSuccess && onSuccess();
      } else {
        const result = await register(name.trim(), email.trim(), password, phone.trim());
        if (result.emailSent === false) {
          setSuccessMessage(
            "Account created, but we couldn't send the verification email. " +
            "Please double-check that your email address is correct, then use " +
            "\"Resend verification code\" below to try again."
          );
        } else {
          setSuccessMessage("Registration successful! Please check your email to verify your account before logging in.");
        }
        // Clear form
        setName("");
        setEmail("");
        setConfirmEmail("");
        setPassword("");
        setPhone("");
      }
    } catch (err: any) {
      // Check if it's an email verification error
      if (err.code === "EMAIL_NOT_VERIFIED") {
        setUnverifiedEmail(err.email || email.trim());
        setShowVerification(true);
        setError(null);
        return;
      }

      // Handle different types of errors
      if (err.code === "USER_NOT_FOUND") {
        setError("No user found with this email. Please check your email or register.");
      } else if (err.code === "INVALID_PASSWORD") {
        setError("Incorrect password. Please try again.");
      } else if (err.message?.includes('Network request failed') || err.message?.includes('fetch')) {
        setError("Unable to connect to server. Please check your internet connection and try again.");
      } else if (err.message?.includes('Email already registered')) {
        setError("This email is already registered. Please try logging in instead.");
      } else {
        setError(err.message || "An error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      const res = await fetch(`${AUTH_URL}/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: unverifiedEmail }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Failed to resend verification code");
      }

      setSuccessMessage("Verification code resent! Please check your email.");
    } catch (err: any) {
      setError(err.message || "Failed to resend verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      setError("Please enter the verification code");
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      const res = await fetch(`${AUTH_URL}/verify-code-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: unverifiedEmail, code: verificationCode.trim() }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Invalid verification code");
      }

      // Set token and user from the response
      setToken(data.token);
      setUser(data.user);
      
      setSuccessMessage("Email verified successfully!");
      setShowVerification(false);
      
      // Call onSuccess to navigate
      setTimeout(() => {
        onSuccess && onSuccess();
      }, 500);
    } catch (err: any) {
      setError(err.message || "Failed to verify code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable style={styles.container} onPress={() => Keyboard.dismiss()}>
      {showVerification ? (
        // Verification UI
        <>
          <View style={styles.verifyHeader}>
            <Text style={styles.verifyTitle}>Verify Your Email</Text>
            <Text style={styles.verifySubtitle}>
              We sent a verification code to {unverifiedEmail}. Please enter it below.
            </Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Verification Code</Text>
            <TextInput
              placeholder="Enter code from email"
              value={verificationCode}
              onChangeText={setVerificationCode}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}

          <TouchableOpacity style={styles.submit} onPress={handleVerifyCode} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Verify & Login</Text>}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.resendButton} 
            onPress={handleResendCode} 
            disabled={loading}
          >
            <Text style={styles.resendText}>Resend Verification Code</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => {
              setShowVerification(false);
              setVerificationCode("");
              setError(null);
              setSuccessMessage(null);
            }}
          >
            <Text style={styles.backText}>← Back to Login</Text>
          </TouchableOpacity>
        </>
      ) : (
        // Normal Login/Register UI
        <>
          {mode === "register" && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput placeholder="" value={name} onChangeText={setName} style={styles.input} />
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput placeholder="" value={email} onChangeText={setEmail} style={styles.input} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
          </View>

          {mode === "register" && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Confirm Email Address</Text>
              <TextInput placeholder="" value={confirmEmail} onChangeText={setConfirmEmail} style={styles.input} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            </View>
          )}

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
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", paddingHorizontal: 8 },
  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 14, fontWeight: "600", color: "#1f2937", marginBottom: 6 },
  optional: { fontSize: 12, fontWeight: "400", color: colors.textTertiary },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    fontSize: 16,
    color: "#1f2937",
  },
  submit: { height: 48, backgroundColor: colors.primary, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", marginTop: 6 },
  submitText: { color: colors.surface, fontWeight: "600" },
  error: { color: "#b00020", marginBottom: 6, textAlign: "center" },
  successContainer: { marginBottom: 12, alignItems: "center" },
  success: { color: colors.success, marginBottom: 8, textAlign: "center", fontSize: 14, lineHeight: 20 },
  verifyLink: { color: colors.primary, fontSize: 15, fontWeight: "600", textDecorationLine: "underline" },
  verifyHeader: { marginBottom: 20, alignItems: "center" },
  verifyTitle: { fontSize: 20, fontWeight: "700", color: "#1f2937", marginBottom: 8 },
  verifySubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: "center", lineHeight: 20 },
  resendButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  resendText: { color: colors.primary, fontWeight: "600", fontSize: 15 },
  backButton: { marginTop: 16, paddingVertical: 8, alignItems: "center" },
  backText: { color: colors.textSecondary, fontSize: 14 },
});
