import { View, Text, Pressable, StyleSheet, ScrollView, TextInput, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useEffect, useRef } from "react";
import useAuthStore from "../src/store/useAuthStore";
import usePlanStore from "../src/store/usePlanStore";
import CustomAlert from "../src/components/CustomAlert";
import ScreenHeader from "../src/components/ScreenHeader";
import { colors, spacing, radius, shadow } from "../src/theme";
import { BASE_URL } from "../src/constants/api";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

type WorkoutExercise = {
  id?: string;
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: number;
  weight: number;
  restTime: number;
};

type WorkoutDay = {
  dayOfWeek: number;
  description: string;
  exercises: WorkoutExercise[];
};

export default function EditWorkoutPlan() {
  const router = useRouter();
  const { traineeId, traineeName, selectedExerciseId, selectedExerciseName, dayIndex: selectedDayIndex } = useLocalSearchParams();
  const token = useAuthStore((s) => s.token);
  const workoutPlanName = usePlanStore((s) => s.workoutPlanName);
  const workoutDays = usePlanStore((s) => s.workoutDays);
  const setWorkoutPlanName = usePlanStore((s) => s.setWorkoutPlanName);
  const setWorkoutDays = usePlanStore((s) => s.setWorkoutDays);
  const addExerciseToDay = usePlanStore((s) => s.addExerciseToDay);
  const removeExerciseFromDay = usePlanStore((s) => s.removeExerciseFromDay);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const lastProcessedExerciseId = useRef<string | null>(null);
  const [alert, setAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: "success" | "error";
    onClose: () => void;
  }>({ visible: false, title: "", message: "", type: "success", onClose: () => {} });
  const [pendingExercise, setPendingExercise] = useState<{
    dayIndex: number;
    exerciseId: string;
    exerciseName: string;
    sets: number;
    reps: number;
    weight: number;
    restTime: number;
  } | null>(null);

  // Data is already loaded into store from trainee-detail page
  // No need to fetch again on mount
  useEffect(() => {
    setLoading(false);
  }, []);

  // Handle exercise selection from select-exercise page
  useEffect(() => {
    if (selectedExerciseId && selectedExerciseName && selectedDayIndex !== undefined && workoutDays.length > 0) {
      // Prevent processing the same selection multiple times
      if (lastProcessedExerciseId.current === selectedExerciseId) {
        return;
      }
      
      lastProcessedExerciseId.current = selectedExerciseId as string;
      const dayIdx = parseInt(selectedDayIndex as string);
      
      // Set pending exercise instead of immediately adding
      setPendingExercise({
        dayIndex: dayIdx,
        exerciseId: selectedExerciseId as string,
        exerciseName: selectedExerciseName as string,
        sets: 3,
        reps: 10,
        weight: 0,
        restTime: 60,
      });
      setExpandedDay(dayIdx);
    }
  }, [selectedExerciseId, selectedExerciseName, selectedDayIndex, workoutDays.length]);

  const savePlan = async () => {
    if (!workoutPlanName.trim()) {
      setAlert({
        visible: true,
        title: "Error",
        message: "Please enter a plan name",
        type: "error",
        onClose: () => setAlert(prev => ({ ...prev, visible: false }))
      });
      return;
    }

    const daysWithExercises = workoutDays.filter((day) => day.exercises.length > 0);
    if (daysWithExercises.length === 0) {
      setAlert({
        visible: true,
        title: "Error",
        message: "Please add at least one exercise to the plan",
        type: "error",
        onClose: () => setAlert(prev => ({ ...prev, visible: false }))
      });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${BASE_URL}/trainer/trainees/${traineeId}/workout-plan`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: workoutPlanName,
          workoutDays: daysWithExercises.map((day: any) => ({
            dayOfWeek: day.dayOfWeek,
            ...(day.description ? { description: day.description } : {}),
            exercises: day.exercises.map(({ exerciseId, sets, reps, weight, restTime }: any) => ({
              exerciseId,
              sets,
              reps,
              ...(weight !== undefined ? { weight } : {}),
              ...(restTime !== undefined ? { restTime } : {}),
            })),
          })),
        }),
      });

      if (response.ok) {
        setAlert({
          visible: true,
          title: "Success",
          message: "Workout plan saved successfully",
          type: "success",
          onClose: () => {
            setAlert(prev => ({ ...prev, visible: false }));
            router.push(`/trainee-detail?id=${traineeId}&name=${traineeName}`);
          }
        });
      } else {
        const error = await response.json();
        setAlert({
          visible: true,
          title: "Error",
          message: error.error || "Failed to save workout plan",
          type: "error",
          onClose: () => setAlert(prev => ({ ...prev, visible: false }))
        });
      }
    } catch (error) {
      console.error("Error saving workout plan:", error);
      setAlert({
        visible: true,
        title: "Error",
        message: "Failed to save workout plan",
        type: "error",
        onClose: () => setAlert(prev => ({ ...prev, visible: false }))
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (dayIndex: number) => {
    setExpandedDay(expandedDay === dayIndex ? null : dayIndex);
  };

  const addExercise = (dayIndex: number) => {
    // Reset the ref to allow adding a new exercise
    lastProcessedExerciseId.current = null;
    router.push(
      `/select-exercise?dayIndex=${dayIndex}&traineeId=${traineeId}&traineeName=${traineeName}&returnTo=edit-workout-plan`
    );
  };
  const savePendingExercise = () => {
    if (!pendingExercise) return;
    
    if (pendingExercise.sets <= 0) {
      setAlert({
        visible: true,
        title: "Error",
        message: "Please enter a valid number of sets (greater than 0)",
        type: "error",
        onClose: () => setAlert(prev => ({ ...prev, visible: false }))
      });
      return;
    }

    if (pendingExercise.reps <= 0) {
      setAlert({
        visible: true,
        title: "Error",
        message: "Please enter a valid number of reps (greater than 0)",
        type: "error",
        onClose: () => setAlert(prev => ({ ...prev, visible: false }))
      });
      return;
    }
    
    addExerciseToDay(pendingExercise.dayIndex, {
      exerciseId: pendingExercise.exerciseId,
      exerciseName: pendingExercise.exerciseName,
      sets: pendingExercise.sets,
      reps: pendingExercise.reps,
      weight: pendingExercise.weight,
      restTime: pendingExercise.restTime,
    });
    setPendingExercise(null);
  };

  const cancelPendingExercise = () => {
    setPendingExercise(null);
  };

  const updatePendingField = (field: "sets" | "reps" | "weight" | "restTime", value: string) => {
    if (!pendingExercise) return;
    const numValue = parseFloat(value) || 0;
    setPendingExercise({ ...pendingExercise, [field]: numValue });
  };
  const removeExercise = (dayIndex: number, exerciseIndex: number) => {
    removeExerciseFromDay(dayIndex, exerciseIndex);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Edit Workout Plan"
        onBack={() => router.push(`/trainee-detail?id=${traineeId}&name=${traineeName}`)}
      />

      <View style={styles.planNameContainer}>
        <Text style={styles.label}>Plan Name *</Text>
        <TextInput
          style={styles.input}
          value={workoutPlanName}
          onChangeText={setWorkoutPlanName}
          placeholder="e.g., Strength Training"
          placeholderTextColor="#9ca3af"
        />
      </View>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.daysContainer}>
          {DAYS.map((dayName, dayIndex) => {
            const day = workoutDays[dayIndex];
            const isExpanded = expandedDay === dayIndex;
            const exerciseCount = day?.exercises.length || 0;

            return (
              <View key={dayIndex} style={styles.dayCard}>
                <Pressable style={styles.dayHeader} onPress={() => toggleDay(dayIndex)}>
                  <View style={styles.dayHeaderLeft}>
                    <Text style={styles.dayName}>{dayName}</Text>
                    {day.description && <Text style={styles.dayDescription}>{day.description}</Text>}
                    <Text style={styles.exerciseCount}>
                      {exerciseCount} {exerciseCount === 1 ? "exercise" : "exercises"}
                    </Text>
                  </View>
                  <Text style={styles.expandIcon}>{isExpanded ? "▼" : "▶"}</Text>
                </Pressable>
                {isExpanded && (
                  <View style={styles.dayContent}>
                    <TextInput
                      style={styles.descriptionInput}
                      value={day.description}
                      onChangeText={(text) => {
                        const newDays = workoutDays.map((d, i) => 
                          i === dayIndex ? { ...d, description: text } : d
                        );
                        usePlanStore.setState({ workoutDays: newDays });
                      }}
                      placeholder="e.g., Chest Day, Leg Day..."
                      placeholderTextColor="#9ca3af"
                    />
                    {pendingExercise && pendingExercise.dayIndex === dayIndex && (
                      <View style={styles.pendingExerciseCard}>
                        <View style={styles.pendingHeader}>
                          <Text style={styles.pendingTitle}>Adding: {pendingExercise.exerciseName}</Text>
                          <Pressable style={styles.cancelButton} onPress={cancelPendingExercise}>
                            <Text style={styles.cancelText}>✕</Text>
                          </Pressable>
                        </View>
                        <View style={styles.exerciseInputsRow}>
                          <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Sets</Text>
                            <TextInput
                              style={styles.smallInput}
                              value={pendingExercise.sets.toString()}
                              onChangeText={(text) => updatePendingField("sets", text)}
                              keyboardType="numeric"
                              placeholder="3"
                              placeholderTextColor="#9ca3af"
                            />
                          </View>
                          <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Reps</Text>
                            <TextInput
                              style={styles.smallInput}
                              value={pendingExercise.reps.toString()}
                              onChangeText={(text) => updatePendingField("reps", text)}
                              keyboardType="numeric"
                              placeholder="10"
                              placeholderTextColor="#9ca3af"
                            />
                          </View>
                          <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Weight (kg)</Text>
                            <TextInput
                              style={styles.smallInput}
                              value={pendingExercise.weight.toString()}
                              onChangeText={(text) => updatePendingField("weight", text)}
                              keyboardType="numeric"
                              placeholder="0"
                              placeholderTextColor="#9ca3af"
                            />
                          </View>
                          <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Rest (s)</Text>
                            <TextInput
                              style={styles.smallInput}
                              value={pendingExercise.restTime.toString()}
                              onChangeText={(text) => updatePendingField("restTime", text)}
                              keyboardType="numeric"
                              placeholder="60"
                              placeholderTextColor="#9ca3af"
                            />
                          </View>
                        </View>
                        <Pressable style={styles.saveExerciseButton} onPress={savePendingExercise}>
                          <Text style={styles.saveExerciseButtonText}>✓ Add to Day</Text>
                        </Pressable>
                      </View>
                    )}
                    {day.exercises.map((exercise, exerciseIndex) => (
                      <View key={exerciseIndex} style={styles.savedExerciseItem}>
                        <View style={styles.savedExerciseHeader}>
                          <Text style={styles.savedExerciseName}>{exercise.exerciseName}</Text>
                          <Pressable
                            style={styles.removeButton}
                            onPress={() => removeExercise(dayIndex, exerciseIndex)}
                          >
                            <Text style={styles.removeText}>✕</Text>
                          </Pressable>
                        </View>
                        <View style={styles.savedExerciseDetails}>
                          <Text style={styles.savedDetailText}>🔁 {exercise.sets} sets × {exercise.reps} reps</Text>
                          {exercise.weight > 0 && (
                            <Text style={styles.savedDetailText}>⚖️ {exercise.weight} kg</Text>
                          )}
                          {exercise.restTime > 0 && (
                            <Text style={styles.savedDetailText}>⏱️ {exercise.restTime}s rest</Text>
                          )}
                        </View>
                      </View>
                    ))}
                    <Pressable style={styles.addButton} onPress={() => addExercise(dayIndex)}>
                      <Text style={styles.addButtonText}>+ Add Exercise</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={savePlan}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Plan</Text>
          )}
        </Pressable>
      </View>

      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={alert.onClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  planNameContainer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.borderLight,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scrollView: {
    flex: 1,
  },
  daysContainer: {
    padding: spacing.xl,
  },
  dayCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: spacing.md,
    ...shadow.sm,
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
  },
  dayHeaderLeft: {
    flex: 1,
  },
  dayName: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  dayDescription: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "600",
    marginTop: 2,
  },
  exerciseCount: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  expandIcon: {
    fontSize: 16,
    color: colors.primary,
  },
  dayContent: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  descriptionInput: {
    backgroundColor: colors.borderLight,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  exerciseItem: {
    backgroundColor: colors.borderLight,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  savedExerciseItem: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: spacing.sm,
  },
  savedExerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  savedExerciseName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    flex: 1,
  },
  savedExerciseDetails: {
    marginTop: 4,
  },
  savedDetailText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    flex: 1,
  },
  removeButton: {
    padding: 4,
  },
  removeText: {
    fontSize: 18,
    color: colors.danger,
  },
  exerciseInputsRow: {
    flexDirection: "row",
  },
  inputGroup: {
    flex: 1,
    marginRight: spacing.sm,
  },
  inputLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  smallInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.sm,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: "center",
  },
  addButton: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
    padding: spacing.md,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  addButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  pendingExerciseCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    marginBottom: spacing.md,
  },
  pendingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  cancelButton: {
    padding: 4,
  },
  cancelText: {
    fontSize: 20,
    color: colors.textSecondary,
    fontWeight: "bold",
  },
  saveExerciseButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    padding: spacing.md,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  saveExerciseButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "700",
  },
});
