import { useState, useEffect } from "react";
import { View, Text, SectionList, StyleSheet, ActivityIndicator, Image, Pressable, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { BASE_URL } from "../src/constants/api";
import { getExerciseImage } from "../src/utils/imageMapper";
import ScreenHeader from "../src/components/ScreenHeader";
import { colors, spacing, radius, shadow } from "../src/theme";

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
            <Image source={imageSource} style={styles.exerciseImage} resizeMode="contain" />
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
        <ActivityIndicator size="large" color={colors.primary} />
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

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={`Exercise Catalog (${totalExercises})`}
        onBack={() => router.back()}
      />
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises..."
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={handleSearch}
        />
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
  },
  categoryHeader: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.surface,
  },
  exerciseCard: {
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
  exerciseImage: {
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
  exerciseInfo: {
    padding: spacing.lg,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  exerciseDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
