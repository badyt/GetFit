import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import useAuthStore from "../src/store/useAuthStore";
import usePlanStore from "../src/store/usePlanStore";
import ConfirmDialog from "../src/components/ConfirmDialog";
import CustomAlert from "../src/components/CustomAlert";
import { BASE_URL } from "../src/constants/api";

type PlanSummary = {
  mealPlan: {
    id: string;
    name: string;
    daysCount: number;
  } | null;
  workoutPlan: {
    id: string;
    name: string;
    daysCount: number;
  } | null;
};

export default function TraineeDetail() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams();
  const traineeId = id as string;
  const traineeName = decodeURIComponent(name as string);
  const token = useAuthStore((s) => s.token);
  const setMealPlanName = usePlanStore((s) => s.setMealPlanName);
  const setMealDays = usePlanStore((s) => s.setMealDays);
  const setWorkoutPlanName = usePlanStore((s) => s.setWorkoutPlanName);
  const setWorkoutDays = usePlanStore((s) => s.setWorkoutDays);
  const clearMealPlan = usePlanStore((s) => s.clearMealPlan);
  const clearWorkoutPlan = usePlanStore((s) => s.clearWorkoutPlan);
  const [loading, setLoading] = useState(true);
  const [planSummary, setPlanSummary] = useState<PlanSummary | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    visible: boolean;
    type: "meal" | "workout" | null;
  }>({ visible: false, type: null });
  const [alert, setAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: "success" | "error";
    onClose: () => void;
  }>({ visible: false, title: "", message: "", type: "success", onClose: () => {} });

  useEffect(() => {
    fetchPlanSummary();
  }, []);

  const fetchPlanSummary = async () => {
    try {
      const response = await fetch(`${BASE_URL}/trainer/trainee/${traineeId}/plans`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPlanSummary(data);
      }
    } catch (error) {
      console.error("Error fetching plan summary:", error);
    } finally {
      setLoading(false);
    }
  };

  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const loadMealPlanToStore = async () => {
    try {
      const response = await fetch(`${BASE_URL}/trainer/trainee/${traineeId}/meal-plan`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setMealPlanName(data.name || "");
        const days = DAYS.map((_, index) => {
          const dayData = data.mealDays?.find((d: any) => d.dayOfWeek === index);
          return {
            dayOfWeek: index,
            meals: dayData?.meals.map((m: any) => ({
              id: m.id,
              foodId: m.foodId,
              foodName: m.food.name,
              quantity: m.quantity,
              mealTime: m.mealTime || "",
              description: m.description || "",
            })) || [],
          };
        });
        setMealDays(days);
      }
    } catch (error) {
      console.error("Error loading meal plan:", error);
    }
  };

  const loadWorkoutPlanToStore = async () => {
    try {
      const response = await fetch(`${BASE_URL}/trainer/trainee/${traineeId}/workout-plan`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setWorkoutPlanName(data.name || "");
        const days = DAYS.map((_, index) => {
          const dayData = data.workoutDays?.find((d: any) => d.dayOfWeek === index);
          return {
            dayOfWeek: index,
            description: dayData?.description || "",
            exercises: dayData?.exercises.map((e: any) => ({
              id: e.id,
              exerciseId: e.exerciseId,
              exerciseName: e.exercise.name,
              sets: e.sets,
              reps: e.reps,
              weight: e.weight || 0,
              restTime: e.restTime || 60,
            })) || [],
          };
        });
        setWorkoutDays(days);
      }
    } catch (error) {
      console.error("Error loading workout plan:", error);
    }
  };

  const handleDeleteMealPlan = async () => {
    setDeleteDialog({ visible: false, type: null });
    try {
      const response = await fetch(`${BASE_URL}/trainer/trainee/${traineeId}/meal-plan`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setAlert({
          visible: true,
          title: "Success",
          message: "Meal plan deleted successfully",
          type: "success",
          onClose: () => {
            setAlert(prev => ({ ...prev, visible: false }));
            fetchPlanSummary();
          }
        });
      } else {
        const error = await response.json();
        setAlert({
          visible: true,
          title: "Error",
          message: error.error || "Failed to delete meal plan",
          type: "error",
          onClose: () => setAlert(prev => ({ ...prev, visible: false }))
        });
      }
    } catch (error) {
      console.error("Error deleting meal plan:", error);
      setAlert({
        visible: true,
        title: "Error",
        message: "Failed to delete meal plan",
        type: "error",
        onClose: () => setAlert(prev => ({ ...prev, visible: false }))
      });
    }
  };

  const handleDeleteWorkoutPlan = async () => {
    setDeleteDialog({ visible: false, type: null });
    try {
      const response = await fetch(`${BASE_URL}/trainer/trainee/${traineeId}/workout-plan`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setAlert({
          visible: true,
          title: "Success",
          message: "Workout plan deleted successfully",
          type: "success",
          onClose: () => {
            setAlert(prev => ({ ...prev, visible: false }));
            fetchPlanSummary();
          }
        });
      } else {
        const error = await response.json();
        setAlert({
          visible: true,
          title: "Error",
          message: error.error || "Failed to delete workout plan",
          type: "error",
          onClose: () => setAlert(prev => ({ ...prev, visible: false }))
        });
      }
    } catch (error) {
      console.error("Error deleting workout plan:", error);
      setAlert({
        visible: true,
        title: "Error",
        message: "Failed to delete workout plan",
        type: "error",
        onClose: () => setAlert(prev => ({ ...prev, visible: false }))
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading trainee details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.push('/(tabs)/trainees')}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <View style={styles.traineeHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{traineeName.charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.title}>{traineeName}</Text>
            <Text style={styles.subtitle}>Manage Plans</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.plansContainer}>
          {/* Meal Plan Card */}
          <View style={styles.planCard}>
            <View style={styles.planHeader}>
              <Text style={styles.planIcon}>🍽️</Text>
              <View style={styles.planHeaderInfo}>
                <Text style={styles.planTitle}>Meal Plan</Text>
                {planSummary?.mealPlan ? (
                  <Text style={styles.planSubtitle}>
                    {planSummary.mealPlan.name} • {planSummary.mealPlan.daysCount} days
                  </Text>
                ) : (
                  <Text style={styles.planSubtitleEmpty}>No plan assigned</Text>
                )}
              </View>
            </View>
            
            <View style={styles.buttonRow}>
              {planSummary?.mealPlan ? (
                <>
                  <Pressable
                    style={[styles.actionButton, styles.editButton]}
                    onPress={async () => {
                      await loadMealPlanToStore();
                      router.push(
                        `/edit-meal-plan?traineeId=${traineeId}&traineeName=${encodeURIComponent(traineeName)}`
                      );
                    }}
                  >
                    <Text style={styles.editButtonText}>✏️ Edit Plan</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => setDeleteDialog({ visible: true, type: "meal" })}
                  >
                    <Text style={styles.deleteButtonText}>🗑️</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  style={[styles.actionButton, styles.createButton]}
                  onPress={() => {
                    clearMealPlan();
                    router.push(
                      `/create-meal-plan?traineeId=${traineeId}&traineeName=${encodeURIComponent(traineeName)}`
                    );
                  }}
                >
                  <Text style={styles.createButtonText}>+ Create Meal Plan</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Workout Plan Card */}
          <View style={styles.planCard}>
            <View style={styles.planHeader}>
              <Text style={styles.planIcon}>🏋️</Text>
              <View style={styles.planHeaderInfo}>
                <Text style={styles.planTitle}>Workout Plan</Text>
                {planSummary?.workoutPlan ? (
                  <Text style={styles.planSubtitle}>
                    {planSummary.workoutPlan.name} • {planSummary.workoutPlan.daysCount} days
                  </Text>
                ) : (
                  <Text style={styles.planSubtitleEmpty}>No plan assigned</Text>
                )}
              </View>
            </View>
            
            <View style={styles.buttonRow}>
              {planSummary?.workoutPlan ? (
                <>
                  <Pressable
                    style={[styles.actionButton, styles.editButton]}
                    onPress={async () => {
                      await loadWorkoutPlanToStore();
                      router.push(
                        `/edit-workout-plan?traineeId=${traineeId}&traineeName=${encodeURIComponent(traineeName)}`
                      );
                    }}
                  >
                    <Text style={styles.editButtonText}>✏️ Edit Plan</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => setDeleteDialog({ visible: true, type: "workout" })}
                  >
                    <Text style={styles.deleteButtonText}>🗑️</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  style={[styles.actionButton, styles.createButton]}
                  onPress={() => {
                    clearWorkoutPlan();
                    router.push(
                      `/create-workout-plan?traineeId=${traineeId}&traineeName=${encodeURIComponent(traineeName)}`
                    );
                  }}
                >
                  <Text style={styles.createButtonText}>+ Create Workout Plan</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={deleteDialog.visible}
        title="Delete Plan"
        message={`Are you sure you want to delete this ${deleteDialog.type === "meal" ? "meal" : "workout"} plan? This action cannot be undone.`}
        onConfirm={deleteDialog.type === "meal" ? handleDeleteMealPlan : handleDeleteWorkoutPlan}
        onCancel={() => setDeleteDialog({ visible: false, type: null })}
        confirmText="Yes"
        cancelText="No"
      />

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
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
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
  traineeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  plansContainer: {
    padding: 20,
    gap: 16,
  },
  planCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  planIcon: {
    fontSize: 32,
  },
  planHeaderInfo: {
    flex: 1,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  planSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
  },
  planSubtitleEmpty: {
    fontSize: 14,
    color: "#9ca3af",
    fontStyle: "italic",
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  createButton: {
    backgroundColor: "#6366f1",
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  editButton: {
    backgroundColor: "#eef2ff",
    flex: 2,
  },
  editButtonText: {
    color: "#4f46e5",
    fontSize: 16,
    fontWeight: "600",
  },
  deleteButton: {
    backgroundColor: "#fee2e2",
    flex: 0.5,
  },
  deleteButtonText: {
    fontSize: 18,
  },
});
