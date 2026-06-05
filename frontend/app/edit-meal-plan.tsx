import { View, Text, Pressable, StyleSheet, ScrollView, TextInput, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useEffect, useRef } from "react";
import useAuthStore from "../src/store/useAuthStore";
import usePlanStore from "../src/store/usePlanStore";
import CustomAlert from "../src/components/CustomAlert";
import ScreenHeader from "../src/components/ScreenHeader";
import { BASE_URL } from "../src/constants/api";
import { colors, spacing, radius, shadow } from "../src/theme";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

type MealDayFood = {
  id?: string;
  foodId: string;
  foodName: string;
  quantity: number;
  mealTime: string;
  description: string;
};

type MealDay = {
  dayOfWeek: number;
  meals: MealDayFood[];
};

export default function EditMealPlan() {
  const router = useRouter();
  const { traineeId, traineeName, selectedFoodId, selectedFoodName, dayIndex: selectedDayIndex } = useLocalSearchParams();
  const token = useAuthStore((s) => s.token);
  const mealPlanName = usePlanStore((s) => s.mealPlanName);
  const mealDays = usePlanStore((s) => s.mealDays);
  const setMealPlanName = usePlanStore((s) => s.setMealPlanName);
  const setMealDays = usePlanStore((s) => s.setMealDays);
  const addMealToDay = usePlanStore((s) => s.addMealToDay);
  const removeMealFromDay = usePlanStore((s) => s.removeMealFromDay);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const lastProcessedFoodId = useRef<string | null>(null);
  const [alert, setAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: "success" | "error";
    onClose: () => void;
  }>({ visible: false, title: "", message: "", type: "success", onClose: () => {} });
  const [pendingFood, setPendingFood] = useState<{
    dayIndex: number;
    foodId: string;
    foodName: string;
    quantity: number;
    mealTime: string;
    description: string;
  } | null>(null);

  // Data is already loaded into store from trainee-detail page
  // No need to fetch again on mount
  useEffect(() => {
    setLoading(false);
  }, []);

  // Handle food selection from select-food page
  useEffect(() => {
    if (selectedFoodId && selectedFoodName && selectedDayIndex !== undefined && mealDays.length > 0) {
      // Prevent processing the same selection multiple times
      if (lastProcessedFoodId.current === selectedFoodId) {
        return;
      }
      
      lastProcessedFoodId.current = selectedFoodId as string;
      const dayIdx = parseInt(selectedDayIndex as string);
      
      // Set pending food instead of immediately adding
      setPendingFood({
        dayIndex: dayIdx,
        foodId: selectedFoodId as string,
        foodName: selectedFoodName as string,
        quantity: 100,
        mealTime: "",
        description: "",
      });
      setExpandedDay(dayIdx);
    }
  }, [selectedFoodId, selectedFoodName, selectedDayIndex, mealDays.length]);

  const savePlan = async () => {
    if (!mealPlanName.trim()) {
      setAlert({
        visible: true,
        title: "Error",
        message: "Please enter a plan name",
        type: "error",
        onClose: () => setAlert(prev => ({ ...prev, visible: false }))
      });
      return;
    }

    const daysWithMeals = mealDays.filter((day) => day.meals.length > 0);
    if (daysWithMeals.length === 0) {
      setAlert({
        visible: true,
        title: "Error",
        message: "Please add at least one meal to the plan",
        type: "error",
        onClose: () => setAlert(prev => ({ ...prev, visible: false }))
      });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${BASE_URL}/trainer/trainees/${traineeId}/meal-plan`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: mealPlanName,
          mealDays: daysWithMeals.map((day: any) => ({
            dayOfWeek: day.dayOfWeek,
            meals: day.meals.map(({ foodId, quantity, mealTime, description }: any) => ({
              foodId,
              quantity,
              mealTime,
              ...(description ? { description } : {}),
            })),
          })),
        }),
      });

      if (response.ok) {
        setAlert({
          visible: true,
          title: "Success",
          message: "Meal plan saved successfully",
          type: "success",
          onClose: () => {
            setAlert(prev => ({ ...prev, visible: false }));
            router.push(`/trainee-detail?id=${traineeId}&name=${traineeName}`);
          }
        });
      } else {
        setAlert({
          visible: true,
          title: "Error",
          message: "Failed to save meal plan",
          type: "error",
          onClose: () => setAlert(prev => ({ ...prev, visible: false }))
        });
      }
    } catch (error) {
      console.error("Error saving meal plan:", error);
      setAlert({
        visible: true,
        title: "Error",
        message: "Failed to save meal plan",
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

  const addMeal = (dayIndex: number) => {
    // Reset the ref to allow adding a new food
    lastProcessedFoodId.current = null;
    router.push(
      `/select-food?dayIndex=${dayIndex}&traineeId=${traineeId}&traineeName=${traineeName}&returnTo=edit-meal-plan`
    );
  };

  const savePendingFood = () => {
    if (!pendingFood) return;
    
    if (pendingFood.quantity <= 0) {
      setAlert({
        visible: true,
        title: "Error",
        message: "Please enter a valid quantity (greater than 0)",
        type: "error",
        onClose: () => setAlert(prev => ({ ...prev, visible: false }))
      });
      return;
    }
    
    if (!pendingFood.mealTime.trim()) {
      setAlert({
        visible: true,
        title: "Error",
        message: "Please select a meal time",
        type: "error",
        onClose: () => setAlert(prev => ({ ...prev, visible: false }))
      });
      return;
    }
    
    if (!validateTime(pendingFood.mealTime)) {
      setAlert({
        visible: true,
        title: "Invalid Time",
        message: "Please enter a valid time (00:00 - 23:59)",
        type: "error",
        onClose: () => setAlert(prev => ({ ...prev, visible: false }))
      });
      return;
    }
    
    addMealToDay(pendingFood.dayIndex, {
      foodId: pendingFood.foodId,
      foodName: pendingFood.foodName,
      quantity: pendingFood.quantity,
      mealTime: pendingFood.mealTime,
      description: pendingFood.description,
    });
    setPendingFood(null);
  };

  const cancelPendingFood = () => {
    setPendingFood(null);
  };

  const updatePendingQuantity = (quantity: string) => {
    if (!pendingFood) return;
    setPendingFood({ ...pendingFood, quantity: parseFloat(quantity) || 0 });
  };

  const updatePendingDescription = (description: string) => {
    if (!pendingFood) return;
    setPendingFood({ ...pendingFood, description });
  };

  const updatePendingMealTime = (input: string) => {
    if (!pendingFood) return;
    
    // Remove all non-digit characters
    const digitsOnly = input.replace(/\D/g, "");
    
    // Limit to 4 digits (HHMM)
    const limited = digitsOnly.slice(0, 4);
    
    // Format as HH:MM
    let formatted = "";
    if (limited.length >= 2) {
      formatted = limited.slice(0, 2) + ":" + limited.slice(2);
    } else {
      formatted = limited;
    }
    
    setPendingFood({ ...pendingFood, mealTime: formatted });
  };

  const validateTime = (time: string): boolean => {
    // Check format HH:MM
    const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
    return timeRegex.test(time);
  };

  const removeMeal = (dayIndex: number, mealIndex: number) => {
    removeMealFromDay(dayIndex, mealIndex);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.loadingText}>Loading meal plan...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Edit Meal Plan"
        onBack={() => router.push(`/trainee-detail?id=${traineeId}&name=${traineeName}`)}
        accent={colors.secondary}
      />

      <View style={styles.planNameContainer}>
        <Text style={styles.label}>Plan Name</Text>
        <TextInput
          style={styles.input}
          value={mealPlanName}
          onChangeText={setMealPlanName}
          placeholder="e.g., Muscle Building Plan"
          placeholderTextColor="#9ca3af"
        />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.daysContainer}>
          {DAYS.map((dayName, dayIndex) => {
            const day = mealDays[dayIndex];
            const isExpanded = expandedDay === dayIndex;
            const mealCount = day?.meals.length || 0;

            return (
              <View key={dayIndex} style={styles.dayCard}>
                <Pressable style={styles.dayHeader} onPress={() => toggleDay(dayIndex)}>
                  <View style={styles.dayHeaderLeft}>
                    <Text style={styles.dayName}>{dayName}</Text>
                    <Text style={styles.mealCount}>
                      {mealCount} {mealCount === 1 ? "meal" : "meals"}
                    </Text>
                  </View>
                  <Text style={styles.expandIcon}>{isExpanded ? "▼" : "▶"}</Text>
                </Pressable>

                {isExpanded && (
                  <View style={styles.dayContent}>
                    {pendingFood && pendingFood.dayIndex === dayIndex && (
                      <View style={styles.pendingFoodCard}>
                        <View style={styles.pendingHeader}>
                          <Text style={styles.pendingTitle}>Adding: {pendingFood.foodName}</Text>
                          <Pressable style={styles.cancelButton} onPress={cancelPendingFood}>
                            <Text style={styles.cancelText}>✕</Text>
                          </Pressable>
                        </View>
                        <View style={styles.timeRow}>
                          <Text style={styles.timeLabel}>Meal Time *</Text>
                          <TextInput
                            style={styles.timeInput}
                            value={pendingFood.mealTime}
                            onChangeText={updatePendingMealTime}
                            placeholder="HH:MM"
                            placeholderTextColor="#9ca3af"
                            keyboardType="numeric"
                            maxLength={5}
                          />
                        </View>
                        <TextInput
                          style={styles.mealInput}
                          value={pendingFood.description}
                          onChangeText={updatePendingDescription}
                          placeholder="e.g., Breakfast, Lunch..."
                          placeholderTextColor="#9ca3af"
                        />
                        <View style={styles.quantityRow}>
                          <Text style={styles.quantityLabel}>Quantity (g):</Text>
                          <TextInput
                            style={styles.quantityInput}
                            value={pendingFood.quantity.toString()}
                            onChangeText={updatePendingQuantity}
                            keyboardType="numeric"
                            placeholder="100"
                            placeholderTextColor="#9ca3af"
                          />
                        </View>
                        <Pressable style={styles.saveFoodButton} onPress={savePendingFood}>
                          <Text style={styles.saveFoodButtonText}>✓ Add to Day</Text>
                        </Pressable>
                      </View>
                    )}
                    {day.meals.map((meal, mealIndex) => (
                      <View key={mealIndex} style={styles.savedMealItem}>
                        <View style={styles.savedMealHeader}>
                          <Text style={styles.savedFoodName}>{meal.foodName}</Text>
                          <Pressable
                            style={styles.removeButton}
                            onPress={() => removeMeal(dayIndex, mealIndex)}
                          >
                            <Text style={styles.removeText}>✕</Text>
                          </Pressable>
                        </View>
                        <View style={styles.savedMealDetails}>
                          <Text style={styles.savedDetailText}>🕒 {meal.mealTime}</Text>
                          {meal.description && (
                            <Text style={styles.savedDetailText}>🍽️ {meal.description}</Text>
                          )}
                          <Text style={styles.savedDetailText}>⚖️ {meal.quantity}g</Text>
                        </View>
                      </View>
                    ))}
                    <Pressable style={styles.addButton} onPress={() => addMeal(dayIndex)}>
                      <Text style={styles.addButtonText}>+ Add Meal</Text>
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
  planNameContainer: {
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
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
    gap: spacing.md,
  },
  dayCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
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
    fontSize: 17,
    fontWeight: "600",
    color: colors.text,
  },
  mealCount: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  expandIcon: {
    fontSize: 16,
    color: colors.secondary,
  },
  dayContent: {
    padding: spacing.lg,
    paddingTop: 0,
    gap: spacing.md,
  },
  pendingFoodCard: {
    backgroundColor: colors.secondaryLight,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.secondary,
    marginBottom: spacing.md,
  },
  pendingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  timeRow: {
    marginBottom: spacing.md,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#92400e",
    marginBottom: spacing.sm,
  },
  timeInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  pendingTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#92400e",
  },
  cancelButton: {
    padding: 4,
  },
  cancelText: {
    fontSize: 20,
    color: "#92400e",
    fontWeight: "bold",
  },
  saveFoodButton: {
    backgroundColor: colors.secondary,
    borderRadius: radius.sm,
    padding: spacing.md,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  saveFoodButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "600",
  },
  mealItem: {
    backgroundColor: colors.borderLight,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: spacing.sm,
  },
  savedMealItem: {
    backgroundColor: colors.successLight,
    borderRadius: radius.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.success,
  },
  savedMealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  savedFoodName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#065f46",
    flex: 1,
  },
  savedMealDetails: {
    gap: 4,
  },
  savedDetailText: {
    fontSize: 13,
    color: "#047857",
  },
  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  foodName: {
    fontSize: 15,
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
  mealInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.sm,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  quantityLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  quantityInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.sm,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    flex: 1,
  },
  addButton: {
    backgroundColor: colors.secondaryLight,
    borderRadius: radius.sm,
    padding: spacing.md,
    alignItems: "center",
  },
  addButtonText: {
    color: "#d97706",
    fontSize: 14,
    fontWeight: "600",
  },
  footer: {
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveButton: {
    backgroundColor: colors.secondary,
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
