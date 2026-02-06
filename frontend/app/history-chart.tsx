import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import useAuthStore from "../src/store/useAuthStore";
import ProgressHistoryChart from "../src/components/ProgressHistoryChart";

export default function HistoryChart() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>My Progress History</Text>
      </View>

      {/* Reusable Chart Component */}
      <ProgressHistoryChart userId={user?.id?.toString() || ""} userName="Your" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  backButton: {
    marginRight: 12,
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: "#3b82f6",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
  },
});
