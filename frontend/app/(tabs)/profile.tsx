import { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, TextInput } from "react-native";
import { useRouter } from "expo-router";
import useAuthStore from "../../src/store/useAuthStore";
import { BASE_URL } from "../../src/constants/api";

export default function Profile() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const refreshUser = useAuthStore((s) => s.refreshUser);

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    refreshUser();
  }, []);

  const handleLogout = () => {
    logout();
    router.replace("/auth");
  };

  const handleJoin = async () => {
    setError(null);
    setSuccess(null);

    if (user?.role !== "TRAINEE") {
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
      await refreshUser();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const hasTrainer = user?.trainerId && user?.trainer;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      {user && (
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
        </View>
      )}

      {user?.role === "TRAINEE" && (
        <View style={styles.card}>
          {hasTrainer ? (
            <View style={styles.trainerSection}>
              <Text style={styles.label}>Your Trainer</Text>
              <Text style={styles.trainerName}>{user.trainer?.name}</Text>
            </View>
          ) : (
            <>
              <Text style={styles.label}>Join a Trainer</Text>
              <Text style={styles.subtitle}>Enter the invite code from your trainer</Text>

              <TextInput
                style={styles.input}
                placeholder="XXXX-XXXX-XXXX"
                value={code}
                onChangeText={setCode}
                autoCapitalize="characters"
                editable={!loading}
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}
              {success ? <Text style={styles.success}>{success}</Text> : null}

              <Pressable style={styles.joinButton} onPress={handleJoin} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Join Trainer</Text>}
              </Pressable>
            </>
          )}
        </View>
      )}

      <Pressable style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Logout</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    padding: 24,
    backgroundColor: "#f8fafc",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 24,
    color: "#111827",
  },
  userInfo: {
    width: "100%",
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderRadius: 10,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  userName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#6b7280",
  },
  card: {
    width: "100%",
    marginBottom: 24,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 12,
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
  joinButton: {
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10b981",
  },
  trainerSection: {
    alignItems: "center",
  },
  trainerName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#10b981",
    marginTop: 8,
  },
  button: {
    height: 48,
    minWidth: 180,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ef4444",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  error: {
    color: "#b00020",
    marginBottom: 10,
    fontSize: 14,
  },
  success: {
    color: "#059669",
    marginBottom: 10,
    fontSize: 14,
  },
});
