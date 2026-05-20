import { View, Text, Pressable, StyleSheet, ScrollView, TextInput, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useEffect, useRef } from "react";
import useAuthStore from "../src/store/useAuthStore";
import usePlanStore from "../src/store/usePlanStore";
import CustomAlert from "../src/components/CustomAlert";
import { BASE_URL } from "../src/constants/api";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

type MealDayFood = {
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

export default function CreateMealPlan() {
  const router = useRouter();
  const { traineeId, traineeName, selectedFoodId, selectedFoodName, dayIndex: selectedDayIndex } = useLocalSearchParams();
  const token = useAuthStore((s) => s.token);
  const mealPlanName = usePlanStore((s) => s.mealPlanName);
  const mealDays = usePlanStore((s) => s.mealDays);
  const setMealPlanName = usePlanStore((s) => s.setMealPlanName);
  const addMealToDay = usePlanStore((s) => s.addMealToDay);
  const removeMealFromDay = usePlanStore((s) => s.removeMealFromDay);
  const clearMealPlan = usePlanStore((s) => s.clearMealPlan);
  const [saving, setSaving] = useState(false);
  const [expandedDay, setExpandedDay] = useState<number | null>(0);
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

  // Handle food selection from select-food page
  useEffect(() => {
    if (selectedFoodId && selectedFoodName && selectedDayIndex !== undefined) {
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
  }, [selectedFoodId, selectedFoodName, selectedDayIndex]);

  const savePlan = async () => {
    console.log('savePlan called');
    console.log('mealPlanName:', mealPlanName);
    
    if (!mealPlanName.trim()) {
      console.log('Showing error: plan name empty');
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
    console.log('daysWithMeals:', daysWithMeals.length);
    
    if (daysWithMeals.length === 0) {
      console.log('Showing error: no meals');
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
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: mealPlanName,
          mealDays: daysWithMeals.map((day) => ({
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
        console.log('Success! Clearing plan and showing alert');
        clearMealPlan();
        setAlert({
          visible: true,
          title: "Success",
          message: "Meal plan created successfully",
          type: "success",
          onClose: () => {
            setAlert(prev => ({ ...prev, visible: false }));
            console.log('Navigating back to trainee detail');
            router.push(`/trainee-detail?id=${traineeId}&name=${traineeName}`);
          }
        });
      } else {
        const error = await response.json();
        console.log('Error from server:', error);
        setAlert({
          visible: true,
          title: "Error",
          message: error.error || "Failed to create meal plan",
          type: "error",
          onClose: () => setAlert(prev => ({ ...prev, visible: false }))
        });
      }
    } catch (error) {
      console.error("Error creating meal plan:", error);
      setAlert({
        visible: true,
        title: "Error",
        message: "Failed to create meal plan",
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
      `/select-food?dayIndex=${dayIndex}&traineeId=${traineeId}&traineeName=${traineeName}&returnTo=create-meal-plan`
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable 
          style={styles.backButton} 
          onPress={() => router.push(`/trainee-detail?id=${traineeId}&name=${traineeName}`)}
        >
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.title}>Create Meal Plan</Text>
        <Text style={styles.subtitle}>{decodeURIComponent(traineeName as string)}</Text>
      </View>

      <View style={styles.planNameContainer}>
        <Text style={styles.label}>Plan Name *</Text>
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
            <Text style={styles.saveButtonText}>Create Plan</Text>
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
    backgroundColor: "#f8fafc",
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
    color: "#f59e0b",
    fontWeight: "bold",
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
  planNameContainer: {
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  scrollView: {
    flex: 1,
  },
  daysContainer: {
    padding: 20,
    gap: 12,
  },
  dayCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  dayHeaderLeft: {
    flex: 1,
  },
  dayName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  mealCount: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },
  expandIcon: {
    fontSize: 16,
    color: "#f59e0b",
  },
  dayContent: {
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  mealItem: {
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  savedMealItem: {
    backgroundColor: "#d1fae5",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#10b981",
  },
  savedMealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  savedFoodName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#065f46",
    flex: 1,
  },
  savedMealDetails: {
    gap: 4,
  },
  savedDetailText: {
    fontSize: 14,
    color: "#047857",
  },
  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  foodName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
  },
  removeButton: {
    padding: 4,
  },
  removeText: {
    fontSize: 18,
    color: "#ef4444",
  },
  mealInput: {
    backgroundColor: "#fff",
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  quantityLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  quantityInput: {
    backgroundColor: "#fff",
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    flex: 1,
  },
  addButton: {
    backgroundColor: "#fef3c7",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  addButtonText: {
    color: "#d97706",
    fontSize: 14,
    fontWeight: "600",
  },
  pendingFoodCard: {
    backgroundColor: "#fef3c7",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#f59e0b",
    marginBottom: 12,
  },
  pendingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  timeRow: {
    marginBottom: 12,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#92400e",
    marginBottom: 6,
  },
  timeInput: {
    backgroundColor: "#fff",
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#f59e0b",
  },
  pendingTitle: {
    fontSize: 16,
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
    backgroundColor: "#f59e0b",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    marginTop: 8,
  },
  saveFoodButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    padding: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  saveButton: {
    backgroundColor: "#f59e0b",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
