import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { colors, spacing, radius, shadow } from "../../src/theme";

export default function Catalog() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Catalog</Text>
      <Text style={styles.subtitle}>Browse our food and exercise database</Text>

      <View style={styles.buttonContainer}>
        <Pressable
          style={[styles.catalogButton, styles.foodButton]}
          onPress={() => router.push("/food-catalog")}
        >
          <Text style={styles.buttonIcon}>🍎</Text>
          <Text style={styles.buttonTitle}>Food Catalog</Text>
          <Text style={styles.buttonSubtitle}>Browse nutritional information</Text>
        </Pressable>

        <Pressable
          style={[styles.catalogButton, styles.exerciseButton]}
          onPress={() => router.push("/exercise-catalog")}
        >
          <Text style={styles.buttonIcon}>💪</Text>
          <Text style={styles.buttonTitle}>Exercise Catalog</Text>
          <Text style={styles.buttonSubtitle}>Explore workout exercises</Text>
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
  catalogButton: {
    borderRadius: radius.lg,
    padding: spacing.xxl,
    alignItems: "center",
    ...shadow.md,
  },
  foodButton: {
    backgroundColor: colors.successLight,
  },
  exerciseButton: {
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
