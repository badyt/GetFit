import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

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
  actionButton: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  recordButton: {
    backgroundColor: "#dbeafe",
  },
  chartButton: {
    backgroundColor: "#f3e8ff",
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
