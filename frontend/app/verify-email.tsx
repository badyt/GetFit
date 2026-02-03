import { useState, useEffect } from "react";
import { View, Text, TextInput, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { AUTH_URL } from "../src/constants/api";

export default function VerifyEmail() {
  const router = useRouter();
  const { token: urlToken } = useLocalSearchParams<{ token?: string }>();
  const [token, setToken] = useState(urlToken || "");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Auto-verify if token in URL
    if (urlToken) {
      verifyEmail(urlToken);
    }
  }, [urlToken]);

  const verifyEmail = async (verificationToken: string) => {
    if (!verificationToken.trim()) {
      setError("Please enter a verification token");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${AUTH_URL}/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: verificationToken.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Verification failed");
      }

      setSuccess(true);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to verify email");
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = () => {
    verifyEmail(token);
  };

  const handleGoToLogin = () => {
    router.replace("/auth");
  };

  if (success) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Text style={styles.successIcon}>✓</Text>
          </View>
          <Text style={styles.title}>Email Verified!</Text>
          <Text style={styles.message}>
            Your email has been successfully verified. You can now log in to your account.
          </Text>
          <Pressable style={styles.button} onPress={handleGoToLogin}>
            <Text style={styles.buttonText}>Go to Login</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.subtitle}>
          Enter the verification code sent to your email
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Paste verification code here"
            value={token}
            onChangeText={setToken}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
            editable={!loading}
          />
        </View>

        {error ? <Text style={styles.errorMessage}>{error}</Text> : null}

        <Pressable 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleVerify}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verify Email</Text>
          )}
        </Pressable>

        <Pressable style={styles.backButton} onPress={handleGoToLogin}>
          <Text style={styles.backButtonText}>Back to Login</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f8fafc",
  },
  content: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  inputContainer: {
    width: "100%",
    marginBottom: 16,
  },
  input: {
    width: "100%",
    minHeight: 100,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#fff",
    textAlignVertical: "top",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  successIcon: {
    fontSize: 48,
    color: "#10b981",
    fontWeight: "bold",
  },
  errorIcon: {
    fontSize: 48,
    color: "#ef4444",
    fontWeight: "bold",
  },
  message: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  errorMessage: {
    fontSize: 14,
    color: "#ef4444",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  button: {
    height: 48,
    width: "100%",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10b981",
    marginBottom: 12,
  },
  buttonDisabled: {
    backgroundColor: "#9ca3af",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  backButton: {
    height: 48,
    width: "100%",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  backButtonText: {
    color: "#6b7280",
    fontSize: 16,
    fontWeight: "600",
  },
});
