import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import useAuthStore from "../src/store/useAuthStore";
import { BASE_URL } from "../src/constants/api";
import ScreenHeader from "../src/components/ScreenHeader";
import { colors, spacing, radius, shadow } from "../src/theme";

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
      <ScreenHeader title="Meal Plan" onBack={() => router.back()} accent={colors.secondary} />

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
    color: colors.secondary,
  },
  dayInfo: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  mealCount: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  calories: {
    fontSize: 14,
    color: colors.secondary,
    fontWeight: "600",
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
