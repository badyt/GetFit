import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

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
    padding: 20,
    backgroundColor: "#f8fafc",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 32,
  },
  buttonContainer: {
    gap: 16,
  },
  planButton: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
  },
  mealButton: {
    backgroundColor: "#fef3c7",
  },
  workoutButton: {
    backgroundColor: "#e0e7ff",
  },
  buttonIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  buttonTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  buttonSubtitle: {
    fontSize: 14,
    color: "#6b7280",
  },
});
