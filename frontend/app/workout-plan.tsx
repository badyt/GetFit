import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import useAuthStore from "../src/store/useAuthStore";
import { BASE_URL } from "../src/constants/api";

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
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.title}>Workout Plan</Text>
        <Text style={styles.subtitle}>
          {workoutPlan ? workoutPlan.name : "No workout plan assigned"}
        </Text>
      </View>

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
    backgroundColor: "#f8fafc",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    marginTop: 12,
    color: "#6b7280",
    fontSize: 16,
  },
  header: {
    padding: 20,
    paddingBottom: 12,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  backArrow: {
    fontSize: 24,
    color: "#6366f1",
    fontWeight: "bold",
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
  scrollView: {
    flex: 1,
  },
  daysContainer: {
    padding: 20,
    gap: 12,
  },
  dayCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  dayCardEmpty: {
    opacity: 0.6,
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  dayName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  arrowIcon: {
    fontSize: 20,
    color: "#6366f1",
  },
  dayInfo: {
    gap: 4,
  },
  description: {
    fontSize: 16,
    color: "#6366f1",
    fontWeight: "600",
    marginBottom: 4,
  },
  exerciseCount: {
    fontSize: 14,
    color: "#6b7280",
  },
  emptyDayText: {
    fontSize: 14,
    color: "#9ca3af",
    fontStyle: "italic",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
  },
});
