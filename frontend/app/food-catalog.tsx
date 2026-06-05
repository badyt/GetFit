import { useState, useEffect } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Image, Pressable, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { BASE_URL } from "../src/constants/api";
import { getFoodImage } from "../src/utils/imageMapper";
import ScreenHeader from "../src/components/ScreenHeader";
import { colors, spacing, radius, shadow } from "../src/theme";

interface Food {
  id: string;
  name: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  image: string | null;
}

export default function FoodCatalog() {
  const router = useRouter();
  const [foods, setFoods] = useState<Food[]>([]);
  const [filteredFoods, setFilteredFoods] = useState<Food[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFoods();
  }, []);

  const fetchFoods = async () => {
    try {
      const res = await fetch(`${BASE_URL}/catalog/foods`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to fetch foods");
      }

      setFoods(data.data);
      setFilteredFoods(data.data);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.trim() === "") {
      setFilteredFoods(foods);
    } else {
      const filtered = foods.filter((food) =>
        food.name.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredFoods(filtered);
    }
  };

  const renderFoodItem = ({ item }: { item: Food }) => {
    const imageSource = getFoodImage(item.image);
    
    return (
      <View style={styles.foodCard}>
        <View style={styles.imageContainer}>
          {imageSource ? (
            <Image
              source={imageSource}
              style={styles.foodImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>🍽️</Text>
            </View>
          )}
        </View>
        <View style={styles.foodInfo}>
          <Text style={styles.foodName}>{item.name}</Text>
          <View style={styles.nutritionRow}>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Calories</Text>
              <Text style={styles.nutritionValue}>{item.caloriesPer100g}</Text>
              <Text style={styles.nutritionUnit}>per 100g</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Protein</Text>
              <Text style={styles.nutritionValue}>{item.proteinPer100g}g</Text>
              <Text style={styles.nutritionUnit}>per 100g</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Loading foods...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>❌ {error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={`Food Catalog (${filteredFoods.length})`}
        onBack={() => router.back()}
        accent={colors.success}
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
        contentContainerStyle={styles.listContent}
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
  errorText: {
    color: colors.danger,
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: spacing.xl,
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
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  foodCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: "hidden",
    ...shadow.md,
    marginBottom: spacing.md,
  },
  imageContainer: {
    width: "100%",
    height: 180,
    backgroundColor: colors.borderLight,
  },
  foodImage: {
    width: "100%",
    height: "100%",
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.border,
  },
  placeholderText: {
    fontSize: 56,
  },
  foodInfo: {
    padding: spacing.lg,
  },
  foodName: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.md,
  },
  nutritionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: colors.borderLight,
    borderRadius: radius.sm,
    padding: spacing.lg,
  },
  nutritionItem: {
    alignItems: "center",
    flex: 1,
  },
  nutritionLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: "600",
  },
  nutritionValue: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.success,
    marginBottom: 2,
  },
  nutritionUnit: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
});
