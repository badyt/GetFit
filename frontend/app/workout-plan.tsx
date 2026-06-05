import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import useAuthStore from "../src/store/useAuthStore";
import { BASE_URL } from "../src/constants/api";
import ScreenHeader from "../src/components/ScreenHeader";
import { colors, spacing, radius, shadow } from "../src/theme";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

type WorkoutDayExercise = {
  id: string;
  sets: number;
  reps: number;
  weight: number | null;
  exercise: {
    id: string;
    name: string;
  };
};

type WorkoutDay = {
  id: string;
  dayOfWeek: number;
  description: string | null;
  exercises: WorkoutDayExercise[];
};

type WorkoutPlan = {
  id: string;
  name: string;
  workoutDays: WorkoutDay[];
};

export default function WorkoutPlan() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const [loading, setLoading] = useState(true);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);

  useEffect(() => {
    fetchWorkoutPlan();
  }, []);

  const fetchWorkoutPlan = async () => {
    try {
      const response = await fetch(`${BASE_URL}/workout-plans/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const text = await response.text();
        const data = text ? JSON.parse(text) : null;
        setWorkoutPlan(data);
      }
    } catch (error) {
      console.error("Error fetching workout plan:", error);
    } finally {
      setLoading(false);
    }
  };

  const getWorkoutDayInfo = (dayIndex: number) => {
    const workoutDay = workoutPlan?.workoutDays.find((day) => day.dayOfWeek === dayIndex);
    if (!workoutDay || workoutDay.exercises.length === 0) {
      return { description: null, exerciseCount: 0, isEmpty: true };
    }

    return {
      description: workoutDay.description,
      exerciseCount: workoutDay.exercises.length,
      isEmpty: false,
    };
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading workout plan...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Workout Plan" onBack={() => router.back()} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {!workoutPlan ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏋️</Text>
            <Text style={styles.emptyTitle}>No Workout Plan Yet</Text>
            <Text style={styles.emptyText}>
              Your trainer hasn't assigned a workout plan yet.
            </Text>
          </View>
        ) : (
          <View style={styles.daysContainer}>
            {DAYS.map((day, index) => {
              const { description, exerciseCount, isEmpty } = getWorkoutDayInfo(index);
              return (
                <Pressable
                  key={index}
                  style={[styles.dayCard, isEmpty && styles.dayCardEmpty]}
                  onPress={() => router.push(`/workout-day-detail?day=${index}`)}
                >
                  <View style={styles.dayHeader}>
                    <Text style={styles.dayName}>{day}</Text>
                    {!isEmpty && (
                      <Text style={styles.arrowIcon}>→</Text>
                    )}
                  </View>
                  {isEmpty ? (
                    <Text style={styles.emptyDayText}>Rest day</Text>
                  ) : (
                    <View style={styles.dayInfo}>
                      {description && (
                        <Text style={styles.description}>{description}</Text>
                      )}
                      <Text style={styles.exerciseCount}>
                        {exerciseCount} {exerciseCount === 1 ? "exercise" : "exercises"}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
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
  scrollView: {
    flex: 1,
  },
  daysContainer: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  dayCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  dayCardEmpty: {
    opacity: 0.6,
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  dayName: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  arrowIcon: {
    fontSize: 20,
    color: colors.primary,
  },
  dayInfo: {
    gap: 4,
  },
  description: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: "600",
    marginBottom: 4,
  },
  exerciseCount: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyDayText: {
    fontSize: 14,
    color: colors.textTertiary,
    fontStyle: "italic",
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
