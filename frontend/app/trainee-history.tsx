import { View, Text, Pressable, StyleSheet, ScrollView, Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import ProgressHistoryChart from "../src/components/ProgressHistoryChart";

export default function TraineeHistory() {
  const router = useRouter();
  const { traineeId, traineeName } = useLocalSearchParams();
  const decodedName = traineeName ? decodeURIComponent(traineeName as string) : "Trainee";

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Pressable 
          onPress={() => router.back()} 
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed
          ]}
        >
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Progress History</Text>
        <Text style={styles.subtitle}>{decodedName}</Text>
      </View>

      <ProgressHistoryChart userId={traineeId as string} userName={decodedName} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    padding: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backButton: {
    marginBottom: 12,
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#eff6ff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  backButtonPressed: {
    backgroundColor: "#dbeafe",
    borderColor: "#93c5fd",
  },
  backText: {
    fontSize: 16,
    color: "#3b82f6",
    fontWeight: "600",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    marginTop: 4,
  },
});
