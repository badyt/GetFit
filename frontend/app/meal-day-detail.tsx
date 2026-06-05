import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, Image } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import useAuthStore from "../src/store/useAuthStore";
import { BASE_URL } from "../src/constants/api";
import { getFoodImage } from "../src/utils/imageMapper";
import ScreenHeader from "../src/components/ScreenHeader";
import { colors, spacing, radius, shadow } from "../src/theme";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

type Meal = {
  id: string;
  quantity: number;
  mealTime: string;
  description: string | null;
  food: {
    id: string;
    name: string;
    caloriesPer100g: number;
    proteinPer100g: number;
    image: string | null;
  };
};

type MealDay = {
  id: string;
  dayOfWeek: number;
  meals: Meal[];
};

export default function MealDayDetail() {
  const router = useRouter();
  const { day } = useLocalSearchParams();
  const dayIndex = parseInt(day as string);
  const token = useAuthStore((s) => s.token);
  const [loading, setLoading] = useState(true);
  const [mealDay, setMealDay] = useState<MealDay | null>(null);

  useEffect(() => {
    fetchMealDay();
  }, []);

  const fetchMealDay = async () => {
    try {
      const response = await fetch(`${BASE_URL}/meal-plans/day/${dayIndex}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const text = await response.text();
        const data = text ? JSON.parse(text) : null;
        setMealDay(data);
      }
    } catch (error) {
      console.error("Error fetching meal day:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTotalNutrition = () => {
    if (!mealDay || !mealDay.meals) return { calories: 0, protein: 0 };
    
    const totals = mealDay.meals.reduce(
      (acc, meal) => {
        const calories = (meal.food.caloriesPer100g * meal.quantity) / 100;
        const protein = (meal.food.proteinPer100g * meal.quantity) / 100;
        return {
          calories: acc.calories + calories,
          protein: acc.protein + protein,
        };
      },
      { calories: 0, protein: 0 }
    );

    return {
      calories: Math.round(totals.calories),
      protein: Math.round(totals.protein * 10) / 10,
    };
  };

  const groupMealsByTime = () => {
    if (!mealDay || !mealDay.meals) return [];

    const grouped: { [key: string]: Meal[] } = {};
    
    mealDay.meals.forEach((meal) => {
      const key = meal.mealTime || "No time";
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(meal);
    });

    // Sort groups by time (HH:MM format)
    return Object.entries(grouped)
      .sort(([timeA], [timeB]) => {
        if (timeA === "No time") return 1;
        if (timeB === "No time") return -1;
        return timeA.localeCompare(timeB);
      })
      .map(([mealTime, meals]) => ({
        mealTime,
        meals,
      }));
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.loadingText}>Loading meal details...</Text>
      </View>
    );
  }

  const totals = getTotalNutrition();
  const groupedMeals = groupMealsByTime();

  return (
    <View style={styles.container}>
      <ScreenHeader title={DAYS[dayIndex]} onBack={() => router.back()} accent={colors.secondary} />

      <View style={styles.nutritionSummary}>
        <View style={styles.nutritionItem}>
          <Text style={styles.nutritionValue}>{totals.calories}</Text>
          <Text style={styles.nutritionLabel}>kcal</Text>
        </View>
        <View style={styles.nutritionDivider} />
        <View style={styles.nutritionItem}>
          <Text style={styles.nutritionValue}>{totals.protein}g</Text>
          <Text style={styles.nutritionLabel}>protein</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {!mealDay || mealDay.meals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🍽️</Text>
            <Text style={styles.emptyTitle}>No Meals Planned</Text>
            <Text style={styles.emptyText}>This is a rest day for your meal plan.</Text>
          </View>
        ) : (
          <View style={styles.mealsContainer}>
            {groupedMeals.map((group, groupIndex) => (
              <View key={groupIndex} style={styles.mealGroup}>
                <Text style={styles.mealGroupTitle}>🕒 {group.mealTime}</Text>
                {group.meals.map((meal) => {
                  const calories = Math.round((meal.food.caloriesPer100g * meal.quantity) / 100);
                  const protein = Math.round((meal.food.proteinPer100g * meal.quantity) * 10) / 10;
                  
                  return (
                    <View key={meal.id} style={styles.mealCard}>
                      {meal.food.image && (
                        <Image
                          source={getFoodImage(meal.food.image)}
                          style={styles.foodImage}
                          resizeMode="contain"
                        />
                      )}
                      <View style={styles.mealInfo}>
                        <Text style={styles.foodName}>{meal.food.name}</Text>
                        <Text style={styles.quantity}>{meal.quantity}g</Text>
                        <View style={styles.nutritionRow}>
                          <Text style={styles.nutritionText}>{calories} kcal</Text>
                          <Text style={styles.nutritionDot}>•</Text>
                          <Text style={styles.nutritionText}>{protein}g protein</Text>
                          {meal.description && (
                            <>
                              <Text style={styles.nutritionDot}>•</Text>
                              <Text style={styles.mealDescription}>{meal.description}</Text>
                            </>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}
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
  nutritionSummary: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.xl,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "space-around",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  nutritionItem: {
    alignItems: "center",
  },
  nutritionValue: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.secondary,
  },
  nutritionLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  nutritionDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  scrollView: {
    flex: 1,
  },
  mealsContainer: {
    padding: spacing.xl,
    gap: spacing.xxl,
  },
  mealGroup: {
    gap: spacing.md,
  },
  mealGroupTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  mealCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    ...shadow.sm,
  },
  foodImage: {
    width: 60,
    height: 60,
    borderRadius: radius.sm,
  },
  mealInfo: {
    flex: 1,
    justifyContent: "center",
  },
  foodName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  mealDescription: {
    fontSize: 12,
    color: colors.primary,
    fontStyle: "italic",
  },
  quantity: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  nutritionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  nutritionText: {
    fontSize: 13,
    color: colors.secondary,
  },
  nutritionDot: {
    fontSize: 13,
    color: colors.border,
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
