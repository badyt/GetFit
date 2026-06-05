import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import useAuthStore from "../src/store/useAuthStore";
import ProgressHistoryChart from "../src/components/ProgressHistoryChart";
import ScreenHeader from "../src/components/ScreenHeader";
import { colors } from "../src/theme";

export default function HistoryChart() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  return (
    <View style={styles.container}>
      <ScreenHeader title="My Progress" onBack={() => router.back()} accent={colors.info} />
      <ProgressHistoryChart userId={user?.id?.toString() || ""} userName="Your" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
