import { View, Text, Pressable, StyleSheet, SectionList, ActivityIndicator, TextInput, Image } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import useAuthStore from "../src/store/useAuthStore";
import { BASE_URL } from "../src/constants/api";
import { getExerciseImage } from "../src/utils/imageMapper";

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
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading exercises...</Text>
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
              placeholder="Search exercises..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={handleSearch}
            />
          </View>
        </View>
        <Text style={styles.title}>Select Exercise</Text>
        <Text style={styles.subtitle}>{filteredCategories.length} categories</Text>
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
    backgroundColor: "#f8fafc",
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
    color: "#6366f1",
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
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionHeader: {
    backgroundColor: "#f8fafc",
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#6366f1",
  },
  exerciseCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 12,
    marginBottom: 12,
  },
  exerciseImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  exerciseDescription: {
    fontSize: 13,
    color: "#6b7280",
  },
  selectIcon: {
    fontSize: 24,
    color: "#6366f1",
    fontWeight: "700",
  },
});
