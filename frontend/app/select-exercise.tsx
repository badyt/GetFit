import { View, Text, Pressable, StyleSheet, SectionList, ActivityIndicator, TextInput, Image } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import useAuthStore from "../src/store/useAuthStore";
import { BASE_URL } from "../src/constants/api";
import { getExerciseImage } from "../src/utils/imageMapper";
import ScreenHeader from "../src/components/ScreenHeader";
import { colors, spacing, radius, shadow } from "../src/theme";

type Exercise = {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
};

type Category = {
  id: string;
  name: string;
  exercises: Exercise[];
};

export default function SelectExercise() {
  const router = useRouter();
  const { dayIndex, traineeId, traineeName, returnTo } = useLocalSearchParams();
  const token = useAuthStore((s) => s.token);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    try {
      const response = await fetch(`${BASE_URL}/catalog/exercises`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const result = await response.json();
        const data = result.data || [];
        setCategories(data);
        setFilteredCategories(data);
      }
    } catch (error) {
      console.error("Error fetching exercises:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === "") {
      setFilteredCategories(categories);
    } else {
      const filtered = Array.isArray(categories) ? categories
        .map((category) => ({
          ...category,
          exercises: category.exercises.filter((exercise) =>
            exercise.name.toLowerCase().includes(query.toLowerCase())
          ),
        }))
        .filter((category) => category.exercises.length > 0) : [];
      setFilteredCategories(filtered);
    }
  };

  const selectExercise = (exercise: Exercise) => {
    const params = new URLSearchParams({
      dayIndex: dayIndex as string,
      traineeId: traineeId as string,
      traineeName: traineeName as string,
      selectedExerciseId: exercise.id,
      selectedExerciseName: exercise.name,
    });
    (router.replace as any)(`/${returnTo}?${params.toString()}`);
  };

  const sections = filteredCategories.map((category) => ({
    title: category.name,
    data: category.exercises,
  }));

  const renderExerciseItem = ({ item }: { item: Exercise }) => (
    <Pressable style={styles.exerciseCard} onPress={() => selectExercise(item)}>
      {item.image && (
        <Image source={getExerciseImage(item.image)} style={styles.exerciseImage} resizeMode="contain" />
      )}
      <View style={styles.exerciseInfo}>
        <Text style={styles.exerciseName}>{item.name}</Text>
        {item.description && (
          <Text style={styles.exerciseDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
      </View>
      <Text style={styles.selectIcon}>+</Text>
    </Pressable>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading exercises...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Select Exercise" onBack={() => router.back()} />
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
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={true}
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
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  sectionHeader: {
    backgroundColor: colors.background,
    paddingVertical: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
  },
  exerciseCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    marginBottom: spacing.md,
    ...shadow.sm,
  },
  exerciseImage: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  exerciseDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  selectIcon: {
    fontSize: 22,
    color: colors.primary,
    fontWeight: "700",
  },
});
