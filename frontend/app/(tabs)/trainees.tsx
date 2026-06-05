import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView, Image } from "react-native";
import { useRouter } from "expo-router";
import useAuthStore from "../../src/store/useAuthStore";
import { BASE_URL, SERVER_BASE } from "../../src/constants/api";
import { colors, spacing, radius, shadow } from "../../src/theme";

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
      if (!res.ok) {
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
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    color: colors.textSecondary,
  },
  refreshButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
  },
  refreshText: {
    color: colors.primary,
    fontWeight: "600",
  },
  center: {
    paddingVertical: spacing.xl,
  },
  list: {
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: spacing.md,
  },
  avatarText: {
    color: colors.surface,
    fontSize: 20,
    fontWeight: "700",
  },
  cardInfo: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 2,
  },
  email: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  arrowIcon: {
    fontSize: 20,
    color: colors.primary,
  },
  cardFooter: {
    gap: spacing.sm,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  infoIcon: {
    fontSize: 14,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.md,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  emptyText: {
    marginTop: 4,
    color: colors.textSecondary,
  },
});
