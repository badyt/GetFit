import { View, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import ProgressHistoryChart from "../src/components/ProgressHistoryChart";
import ScreenHeader from "../src/components/ScreenHeader";
import { colors } from "../src/theme";

export default function TraineeHistory() {
  const router = useRouter();
  const { traineeId, traineeName } = useLocalSearchParams();
  const decodedName = traineeName ? decodeURIComponent(traineeName as string) : "Trainee";

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={`${decodedName}'s Progress`}
        onBack={() => router.back()}
        accent={colors.info}
      />
      <ProgressHistoryChart userId={traineeId as string} userName={decodedName} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
