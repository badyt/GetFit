import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import * as Clipboard from "expo-clipboard";
import useAuthStore from "../../src/store/useAuthStore";
import { BASE_URL } from "../../src/constants/api";

export default function Invite() {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.user?.role);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setError(null);
    setCopied(false);

    if (role !== "TRAINER") {
      setError("Only trainers can generate invites.");
      return;
    }

    if (!email.trim()) {
      setError("Please enter the trainee's email.");
      return;
    }

    if (!token) {
      setError("You are not authenticated.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/trainer/invites`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: email.trim(), message: message.trim() || undefined }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to generate invite");
      }

      setCode(data.code);
      setExpiresAt(data.expiresAt);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    setCopied(true);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Invite Code</Text>
      <Text style={styles.subtitle}>Generate a code for a trainee to join you.</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Trainee Email</Text>
        <TextInput
          style={styles.input}
          placeholder="name@email.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Message (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Add a short note..."
          value={message}
          onChangeText={setMessage}
          multiline
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.primaryButton} onPress={handleGenerate} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Generate Code</Text>}
        </Pressable>
      </View>

      {code ? (
        <View style={styles.card}>
          <Text style={styles.label}>Invite Code</Text>
          <View style={styles.codeBox}>
            <Text style={styles.code}>{code}</Text>
          </View>
          {expiresAt ? <Text style={styles.meta}>Expires: {new Date(expiresAt).toLocaleString()}</Text> : null}
          <Pressable style={styles.secondaryButton} onPress={handleCopy}>
            <Text style={styles.secondaryText}>{copied ? "Copied" : "Copy Code"}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f8fafc",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 16,
    color: "#6b7280",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#111827",
    marginBottom: 12,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  primaryButton: {
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0a84ff",
  },
  primaryText: {
    color: "#fff",
    fontWeight: "600",
  },
  secondaryButton: {
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
    marginTop: 12,
  },
  secondaryText: {
    color: "#111827",
    fontWeight: "600",
  },
  codeBox: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    padding: 12,
  },
  code: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
    color: "#111827",
  },
  meta: {
    marginTop: 8,
    color: "#6b7280",
    fontSize: 12,
  },
  error: {
    color: "#b00020",
    marginBottom: 10,
  },
});
