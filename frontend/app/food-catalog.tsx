import { useState, useEffect } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Image, Pressable, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { BASE_URL } from "../src/constants/api";
import { getFoodImage } from "../src/utils/imageMapper";

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
        <Text style={styles.title}>Food Catalog</Text>
        <Text style={styles.subtitle}>
          {filteredFoods.length} of {foods.length} items
        </Text>
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
  errorText: {
    color: "#ef4444",
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  header: {
    padding: 20,
    paddingBottom: 12,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  backArrow: {
    fontSize: 24,
    color: '#10b981',
    fontWeight: 'bold',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
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
    color: '#111827',
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
  listContent: {
    padding: 16,
    gap: 12,
  },
  foodCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 12,
  },
  imageContainer: {
    width: "100%",
    height: 180,
    backgroundColor: "#f3f4f6",
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
    backgroundColor: "#e5e7eb",
  },
  placeholderText: {
    fontSize: 64,
  },
  foodInfo: {
    padding: 16,
  },
  foodName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  nutritionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 16,
  },
  nutritionItem: {
    alignItems: "center",
    flex: 1,
  },
  nutritionLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
    fontWeight: "600",
  },
  nutritionValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#10b981",
    marginBottom: 2,
  },
  nutritionUnit: {
    fontSize: 11,
    color: "#9ca3af",
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 8,
  },
});
