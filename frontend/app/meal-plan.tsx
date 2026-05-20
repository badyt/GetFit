import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import useAuthStore from "../src/store/useAuthStore";
import { BASE_URL } from "../src/constants/api";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

type MealDay = {
  id: string;
  dayOfWeek: number;
  meals: {
    id: string;
    quantity: number;
    description: string | null;
    food: {
      id: string;
      name: string;
      caloriesPer100g: number;
      proteinPer100g: number;
    };
  }[];
};

type MealPlan = {
  id: string;
  name: string;
  mealDays: MealDay[];
};

export default function MealPlan() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const [loading, setLoading] = useState(true);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);

  useEffect(() => {
    fetchMealPlan();
  }, []);

  const fetchMealPlan = async () => {
    try {
      const response = await fetch(`${BASE_URL}/meal-plans/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const text = await response.text();
        const data = text ? JSON.parse(text) : null;
        setMealPlan(data);
      }
    } catch (error) {
      console.error("Error fetching meal plan:", error);
    } finally {
      setLoading(false);
    }
  };

  const getMealDayInfo = (dayIndex: number) => {
    const mealDay = mealPlan?.mealDays.find((day) => day.dayOfWeek === dayIndex);
    if (!mealDay || mealDay.meals.length === 0) {
      return { totalCalories: 0, mealCount: 0, isEmpty: true };
    }

    const totalCalories = mealDay.meals.reduce((sum, meal) => {
      return sum + (meal.food.caloriesPer100g * meal.quantity) / 100;
    }, 0);

    return { totalCalories: Math.round(totalCalories), mealCount: mealDay.meals.length, isEmpty: false };
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
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.title}>Meal Plan</Text>
        <Text style={styles.subtitle}>
          {mealPlan ? mealPlan.name : "No meal plan assigned"}
        </Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {!mealPlan ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🍽️</Text>
            <Text style={styles.emptyTitle}>No Meal Plan Yet</Text>
            <Text style={styles.emptyText}>
              Your trainer hasn't assigned a meal plan yet.
            </Text>
          </View>
        ) : (
          <View style={styles.daysContainer}>
            {DAYS.map((day, index) => {
              const { totalCalories, mealCount, isEmpty } = getMealDayInfo(index);
              return (
                <Pressable
                  key={index}
                  style={[styles.dayCard, isEmpty && styles.dayCardEmpty]}
                  onPress={() => router.push(`/meal-day-detail?day=${index}`)}
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
                      <Text style={styles.mealCount}>{mealCount} meals</Text>
                      <Text style={styles.calories}>{totalCalories} kcal</Text>
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
    color: "#f59e0b",
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
    color: "#f59e0b",
  },
  dayInfo: {
    flexDirection: "row",
    gap: 16,
  },
  mealCount: {
    fontSize: 14,
    color: "#6b7280",
  },
  calories: {
    fontSize: 14,
    color: "#f59e0b",
    fontWeight: "600",
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
