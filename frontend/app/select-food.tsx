import { View, Text, Pressable, StyleSheet, FlatList, ActivityIndicator, TextInput, Image } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import useAuthStore from "../src/store/useAuthStore";
import { BASE_URL } from "../src/constants/api";
import { getFoodImage } from "../src/utils/imageMapper";
import ScreenHeader from "../src/components/ScreenHeader";
import { colors, spacing, radius, shadow } from "../src/theme";

type Food = {
  id: string;
  name: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  image: string | null;
};

export default function SelectFood() {
  const router = useRouter();
  const { dayIndex, traineeId, traineeName, returnTo } = useLocalSearchParams();
  const token = useAuthStore((s) => s.token);
  const [loading, setLoading] = useState(true);
  const [foods, setFoods] = useState<Food[]>([]);
  const [filteredFoods, setFilteredFoods] = useState<Food[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchFoods();
  }, []);

  const fetchFoods = async () => {
    try {
      const response = await fetch(`${BASE_URL}/catalog/foods`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const result = await response.json();
        const data = result.data || [];
        setFoods(data);
        setFilteredFoods(data);
      }
    } catch (error) {
      console.error("Error fetching foods:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === "") {
      setFilteredFoods(foods);
    } else {
      const filtered = Array.isArray(foods) ? foods.filter((food) =>
        food.name.toLowerCase().includes(query.toLowerCase())
      ) : [];
      setFilteredFoods(filtered);
    }
  };

  const selectFood = (food: Food) => {
    const params = new URLSearchParams({
      dayIndex: dayIndex as string,
      traineeId: traineeId as string,
      traineeName: traineeName as string,
      selectedFoodId: food.id,
      selectedFoodName: food.name,
    });
    (router.replace as any)(`/${returnTo}?${params.toString()}`);
  };

  const renderFoodItem = ({ item }: { item: Food }) => (
    <Pressable style={styles.foodCard} onPress={() => selectFood(item)}>
      {item.image && (
        <Image source={getFoodImage(item.image)} style={styles.foodImage} resizeMode="contain" />
      )}
      <View style={styles.foodInfo}>
        <Text style={styles.foodName}>{item.name}</Text>
        <View style={styles.nutritionRow}>
          <Text style={styles.nutritionText}>{item.caloriesPer100g} kcal</Text>
          <Text style={styles.nutritionDot}>•</Text>
          <Text style={styles.nutritionText}>{item.proteinPer100g}g protein</Text>
          <Text style={styles.nutritionSubtext}>(per 100g)</Text>
        </View>
      </View>
      <Text style={styles.selectIcon}>+</Text>
    </Pressable>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.secondary} />
        <Text style={styles.loadingText}>Loading foods...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={`Select Food (${filteredFoods.length})`}
        onBack={() => router.back()}
        accent={colors.secondary}
      />
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search foods..."
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      <FlatList
        data={filteredFoods}
        renderItem={renderFoodItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
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
  searchBar: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    height: 44,
    backgroundColor: colors.borderLight,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    color: colors.text,
  },
  listContainer: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  foodCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    ...shadow.sm,
  },
  foodImage: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  nutritionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  nutritionText: {
    fontSize: 13,
    color: colors.secondary,
  },
  nutritionDot: {
    fontSize: 13,
    color: colors.border,
  },
  nutritionSubtext: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  selectIcon: {
    fontSize: 22,
    color: colors.secondary,
    fontWeight: "700",
  },
});
