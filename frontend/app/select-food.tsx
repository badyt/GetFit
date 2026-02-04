import { View, Text, Pressable, StyleSheet, FlatList, ActivityIndicator, TextInput, Image } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import useAuthStore from "../src/store/useAuthStore";
import { BASE_URL } from "../src/constants/api";
import { getFoodImage } from "../src/utils/imageMapper";

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
    // Navigate back with the selected food data
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
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.loadingText}>Loading foods...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.topBar}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backArrow}>←</Text>
          </Pressable>
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search foods..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={handleSearch}
            />
          </View>
        </View>
        <Text style={styles.title}>Select Food</Text>
        <Text style={styles.subtitle}>{filteredFoods.length} foods available</Text>
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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
  },
  backArrow: {
    fontSize: 24,
    color: "#f59e0b",
    fontWeight: "bold",
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  listContainer: {
    padding: 20,
    gap: 12,
  },
  foodCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 12,
  },
  foodImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  nutritionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  nutritionText: {
    fontSize: 13,
    color: "#f59e0b",
  },
  nutritionDot: {
    fontSize: 13,
    color: "#d1d5db",
  },
  nutritionSubtext: {
    fontSize: 12,
    color: "#9ca3af",
  },
  selectIcon: {
    fontSize: 24,
    color: "#f59e0b",
    fontWeight: "700",
  },
});
