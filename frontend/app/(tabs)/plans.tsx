import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { colors, spacing, radius, shadow } from "../../src/theme";

export default function Plans() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Plans</Text>
      <Text style={styles.subtitle}>View your meal and workout plans</Text>

      <View style={styles.buttonContainer}>
        <Pressable
          style={[styles.planButton, styles.mealButton]}
          onPress={() => router.push("/meal-plan")}
        >
          <Text style={styles.buttonIcon}>🍽️</Text>
          <Text style={styles.buttonTitle}>Meal Plan</Text>
          <Text style={styles.buttonSubtitle}>Your weekly nutrition plan</Text>
        </Pressable>

        <Pressable
          style={[styles.planButton, styles.workoutButton]}
          onPress={() => router.push("/workout-plan")}
        >
          <Text style={styles.buttonIcon}>🏋️</Text>
          <Text style={styles.buttonTitle}>Workout Plan</Text>
          <Text style={styles.buttonSubtitle}>Your weekly training schedule</Text>
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
  planButton: {
    borderRadius: radius.lg,
    padding: spacing.xxl,
    alignItems: "center",
    ...shadow.md,
  },
  mealButton: {
    backgroundColor: colors.secondaryLight,
  },
  workoutButton: {
    backgroundColor: colors.primaryLight,
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
