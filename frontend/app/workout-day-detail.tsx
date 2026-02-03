import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, Image } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import useAuthStore from "../src/store/useAuthStore";
import { BASE_URL } from "../src/constants/api";
import { getExerciseImage } from "../src/utils/imageMapper";

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
      const response = await fetch(`${BASE_URL}/plans/workout/day/${dayIndex}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
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
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading workout details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.title}>{DAYS[dayIndex]}</Text>
        {workoutDay?.description && (
          <Text style={styles.dayDescription}>{workoutDay.description}</Text>
        )}
        <Text style={styles.subtitle}>
          {workoutDay && workoutDay.exercises.length > 0
            ? `${workoutDay.exercises.length} ${workoutDay.exercises.length === 1 ? "exercise" : "exercises"}`
            : "No exercises planned"}
        </Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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
    paddingBottom: 16,
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
  dayDescription: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6366f1",
    marginTop: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  exercisesContainer: {
    padding: 20,
    gap: 16,
  },
  exerciseCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  exerciseHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  exerciseNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: "#6366f1",
    width: 28,
  },
  exerciseImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  exerciseDescription: {
    fontSize: 13,
    color: "#6b7280",
  },
  exerciseDetails: {
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 12,
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
    color: "#6b7280",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  detailDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#e5e7eb",
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
