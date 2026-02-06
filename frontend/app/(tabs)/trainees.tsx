import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView, Image } from "react-native";
import { useRouter } from "expo-router";
import useAuthStore from "../../src/store/useAuthStore";
import { BASE_URL, SERVER_BASE } from "../../src/constants/api";

type Trainee = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  createdAt: string;
  profilePicture?: string | null;
};

export default function Trainees() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.user?.role);
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTrainees = async () => {
    setError(null);

    if (role !== "TRAINER") {
      setError("Only trainers can view trainees.");
      return;
    }

    if (!token) {
      setError("You are not authenticated.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/trainer/trainees`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load trainees");
      }

      setTrainees(data.trainees || []);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrainees();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>My Trainees</Text>
        <Pressable style={styles.refreshButton} onPress={loadTrainees}>
          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>Manage and view your active trainees.</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!loading && trainees.length === 0 && !error ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No trainees yet</Text>
          <Text style={styles.emptyText}>Send an invite to get your first trainee.</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.list}>
        {trainees.map((t) => (
          <Pressable
            key={t.id}
            style={styles.card}
            onPress={() => router.push(`/trainee-detail?id=${t.id}&name=${encodeURIComponent(t.name)}&profilePicture=${encodeURIComponent(t.profilePicture || '')}`)}
          >
            <View style={styles.cardHeader}>
              {t.profilePicture ? (
                <Image
                  source={{ uri: `${SERVER_BASE}${t.profilePicture}` }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{t.name.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={styles.cardInfo}>
                <Text style={styles.name}>{t.name}</Text>
                <Text style={styles.email}>{t.email}</Text>
              </View>
              <Text style={styles.arrowIcon}>→</Text>
            </View>
            <View style={styles.cardFooter}>
              {t.phone && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoIcon}>📱</Text>
                  <Text style={styles.infoText}>{t.phone}</Text>
                </View>
              )}
              <View style={styles.infoItem}>
                <Text style={styles.infoIcon}>📅</Text>
                <Text style={styles.infoText}>
                  Joined {new Date(t.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f8fafc",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#eef2ff",
  },
  refreshText: {
    color: "#3730a3",
    fontWeight: "600",
  },
  center: {
    paddingVertical: 20,
  },
  list: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  cardInfo: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  email: {
    fontSize: 14,
    color: "#6b7280",
  },
  arrowIcon: {
    fontSize: 20,
    color: "#6366f1",
  },
  cardFooter: {
    gap: 8,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoIcon: {
    fontSize: 14,
  },
  infoText: {
    fontSize: 13,
    color: "#6b7280",
  },
  error: {
    color: "#b00020",
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  emptyText: {
    marginTop: 4,
    color: "#6b7280",
  },
});
