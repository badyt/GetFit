import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { colors, spacing, radius, shadow } from "../../src/theme";

export default function Progress() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Progress</Text>
      <Text style={styles.subtitle}>Track your fitness journey</Text>

      <View style={styles.buttonContainer}>
        <Pressable
          style={[styles.actionButton, styles.recordButton]}
          onPress={() => router.push("/record-day")}
        >
          <Text style={styles.buttonIcon}>📝</Text>
          <Text style={styles.buttonTitle}>Record Today</Text>
          <Text style={styles.buttonSubtitle}>
            Log your daily measurements
          </Text>
        </Pressable>

        <Pressable
          style={[styles.actionButton, styles.chartButton]}
          onPress={() => router.push("/history-chart")}
        >
          <Text style={styles.buttonIcon}>📊</Text>
          <Text style={styles.buttonTitle}>View History</Text>
          <Text style={styles.buttonSubtitle}>
            Track your progress over time
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.xxxl,
  },
  buttonContainer: {
    gap: spacing.lg,
  },
  actionButton: {
    borderRadius: radius.lg,
    padding: spacing.xxl,
    alignItems: "center",
    ...shadow.md,
  },
  recordButton: {
    backgroundColor: colors.primaryLight,
  },
  chartButton: {
    backgroundColor: "#f3e8ff",
  },
  buttonIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  buttonTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  buttonSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
