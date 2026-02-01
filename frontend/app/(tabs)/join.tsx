import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import useAuthStore from "../../src/store/useAuthStore";
import { BASE_URL } from "../../src/constants/api";

export default function Join() {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.user?.role);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleJoin = async () => {
    setError(null);
    setSuccess(null);

    if (role !== "TRAINEE") {
      setError("Only trainees can join a trainer.");
      return;
    }

    if (!code.trim()) {
      setError("Please enter an invite code.");
      return;
    }

    if (!token) {
      setError("You are not authenticated.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/trainee/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to join trainer");
      }

      setSuccess("You have successfully joined your trainer!");
      setCode("");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter Invite Code</Text>
      <Text style={styles.subtitle}>Paste the code from your trainer to join.</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Invite Code</Text>
        <TextInput
          style={styles.input}
          placeholder="XXXX-XXXX-XXXX"
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>{success}</Text> : null}

        <Pressable style={styles.primaryButton} onPress={handleJoin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Join Trainer</Text>}
        </Pressable>
      </View>
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
  primaryButton: {
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10b981",
  },
  primaryText: {
    color: "#fff",
    fontWeight: "600",
  },
  error: {
    color: "#b00020",
    marginBottom: 10,
  },
  success: {
    color: "#059669",
    marginBottom: 10,
  },
});
