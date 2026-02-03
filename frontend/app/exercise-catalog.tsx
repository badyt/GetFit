import { useState, useEffect } from "react";
import { View, Text, SectionList, StyleSheet, ActivityIndicator, Image, Pressable, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { BASE_URL } from "../src/constants/api";
import { getExerciseImage } from "../src/utils/imageMapper";

interface Exercise {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
}

interface Category {
  id: string;
  name: string;
  exercises: Exercise[];
}

export default function ExerciseCatalog() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    try {
      const res = await fetch(`${BASE_URL}/catalog/exercises`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to fetch exercises");
      }

      setCategories(data.data);
      setFilteredCategories(data.data);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.trim() === "") {
      setFilteredCategories(categories);
    } else {
      const filtered = categories.map((category) => ({
        ...category,
        exercises: category.exercises.filter((exercise) =>
          exercise.name.toLowerCase().includes(text.toLowerCase())
        ),
      })).filter((category) => category.exercises.length > 0);
      setFilteredCategories(filtered);
    }
  };

  const renderExerciseItem = ({ item }: { item: Exercise }) => {
    const imageSource = getExerciseImage(item.image);
    
    return (
      <View style={styles.exerciseCard}>
        <View style={styles.imageContainer}>
          {imageSource ? (
            <Image
              source={imageSource}
              style={styles.exerciseImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>💪</Text>
            </View>
          )}
        </View>
        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName}>{item.name}</Text>
          {item.description ? (
            <Text style={styles.exerciseDescription}>{item.description}</Text>
          ) : null}
        </View>
      </View>
    );
  };

  const renderSectionHeader = ({ section }: { section: { name: string } }) => (
    <View style={styles.categoryHeader}>
      <Text style={styles.categoryName}>{section.name}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0a84ff" />
        <Text style={styles.loadingText}>Loading exercises...</Text>
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

  const sections = filteredCategories.map((category) => ({
    id: category.id,
    name: category.name,
    data: category.exercises,
  }));

  const totalExercises = filteredCategories.reduce((sum, cat) => sum + cat.exercises.length, 0);
  const allExercises = categories.reduce((sum, cat) => sum + cat.exercises.length, 0);

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
              placeholder="Search exercises..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={handleSearch}
            />
          </View>
        </View>
        <Text style={styles.title}>Exercise Catalog</Text>
        <Text style={styles.subtitle}>
          {totalExercises} of {allExercises} exercises in {filteredCategories.length} categories
        </Text>
      </View>
      <SectionList
        sections={sections}
        renderItem={renderExerciseItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
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
    color: '#3b82f6',
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
  },
  categoryHeader: {
    backgroundColor: "#0a84ff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
    marginTop: 8,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  exerciseCard: {
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
    height: 200,
    backgroundColor: "#f3f4f6",
  },
  exerciseImage: {
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
    fontSize: 72,
  },
  exerciseInfo: {
    padding: 16,
  },
  exerciseName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  exerciseDescription: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
  },
});
