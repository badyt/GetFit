import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

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
  catalogButton: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
  },
  foodButton: {
    backgroundColor: "#dcfce7",
  },
  exerciseButton: {
    backgroundColor: "#dbeafe",
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
