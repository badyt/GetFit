import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, Image } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import useAuthStore from "../src/store/useAuthStore";
import { BASE_URL } from "../src/constants/api";
import { getExerciseImage } from "../src/utils/imageMapper";
import ScreenHeader from "../src/components/ScreenHeader";
import { colors, spacing, radius, shadow } from "../src/theme";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

type Exercise = {
  id: string;
  sets: number;
  reps: number;
  weight: number | null;
  restTime: number | null;
  exercise: {
    id: string;
    name: string;
    description: string | null;
    image: string | null;
  };
};

type WorkoutDay = {
  id: string;
  dayOfWeek: number;
  description: string | null;
  exercises: Exercise[];
};

export default function WorkoutDayDetail() {
  const router = useRouter();
  const { day } = useLocalSearchParams();
  const dayIndex = parseInt(day as string);
  const token = useAuthStore((s) => s.token);
  const [loading, setLoading] = useState(true);
  const [workoutDay, setWorkoutDay] = useState<WorkoutDay | null>(null);

  useEffect(() => {
    fetchWorkoutDay();
  }, []);

  const fetchWorkoutDay = async () => {
    try {
      const response = await fetch(`${BASE_URL}/workout-plans/day/${dayIndex}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const text = await response.text();
        const data = text ? JSON.parse(text) : null;
        setWorkoutDay(data);
      }
    } catch (error) {
      console.error("Error fetching workout day:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading workout details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={DAYS[dayIndex]} onBack={() => router.back()} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {workoutDay?.description && (
          <Text style={styles.dayDescription}>{workoutDay.description}</Text>
        )}
        {!workoutDay || workoutDay.exercises.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏋️</Text>
            <Text style={styles.emptyTitle}>Rest Day</Text>
            <Text style={styles.emptyText}>No workout planned for this day.</Text>
          </View>
        ) : (
          <View style={styles.exercisesContainer}>
            {workoutDay.exercises.map((exercise, index) => (
              <View key={exercise.id} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <Text style={styles.exerciseNumber}>{index + 1}</Text>
                  {exercise.exercise.image && (
                    <Image
                      source={getExerciseImage(exercise.exercise.image)}
                      style={styles.exerciseImage}
                      resizeMode="contain"
                    />
                  )}
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName}>{exercise.exercise.name}</Text>
                    {exercise.exercise.description && (
                      <Text style={styles.exerciseDescription} numberOfLines={2}>
                        {exercise.exercise.description}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.exerciseDetails}>
                  <View style={styles.detailRow}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Sets</Text>
                      <Text style={styles.detailValue}>{exercise.sets}</Text>
                    </View>
                    <View style={styles.detailDivider} />
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Reps</Text>
                      <Text style={styles.detailValue}>{exercise.reps}</Text>
                    </View>
                    {exercise.weight && (
                      <>
                        <View style={styles.detailDivider} />
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>Weight</Text>
                          <Text style={styles.detailValue}>{exercise.weight} kg</Text>
                        </View>
                      </>
                    )}
                    {exercise.restTime && (
                      <>
                        <View style={styles.detailDivider} />
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>Rest</Text>
                          <Text style={styles.detailValue}>{exercise.restTime}s</Text>
                        </View>
                      </>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: 16,
  },
  dayDescription: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  exercisesContainer: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  exerciseCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  exerciseHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  exerciseNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
    width: 28,
  },
  exerciseImage: {
    width: 60,
    height: 60,
    borderRadius: radius.sm,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  exerciseDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  exerciseDetails: {
    backgroundColor: colors.borderLight,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  detailItem: {
    alignItems: "center",
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  detailDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
