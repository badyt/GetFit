import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, Image } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import useAuthStore from "../src/store/useAuthStore";
import { BASE_URL } from "../src/constants/api";
import { getFoodImage } from "../src/utils/imageMapper";

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
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.title}>{DAYS[dayIndex]}</Text>
        <Text style={styles.subtitle}>Meal Plan Details</Text>
      </View>

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
  nutritionSummary: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "space-around",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  nutritionItem: {
    alignItems: "center",
  },
  nutritionValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#f59e0b",
  },
  nutritionLabel: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  nutritionDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#e5e7eb",
  },
  scrollView: {
    flex: 1,
  },
  mealsContainer: {
    padding: 20,
    gap: 24,
  },
  mealGroup: {
    gap: 12,
  },
  mealGroupTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  mealCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 12,
  },
  foodImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  mealInfo: {
    flex: 1,
    justifyContent: "center",
  },
  foodName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  mealDescription: {
    fontSize: 12,
    color: "#6366f1",
    fontStyle: "italic",
  },
  quantity: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4,
  },
  nutritionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nutritionText: {
    fontSize: 13,
    color: "#f59e0b",
  },
  nutritionDot: {
    fontSize: 13,
    color: "#d1d5db",
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
