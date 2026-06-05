import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  TextInput,
  RefreshControl,
  Image,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import useAuthStore from "../../src/store/useAuthStore";
import { ADMIN_URL, SERVER_BASE } from "../../src/constants/api";
import ConfirmDialog from "../../src/components/ConfirmDialog";
import CustomAlert from "../../src/components/CustomAlert";
import { colors, spacing, radius, shadow } from "../../src/theme";

type Food = {
  id: string;
  name: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  image: string | null;
};

export default function AdminFood() {
  const token = useAuthStore((s) => s.token);
  const [foods, setFoods] = useState<Food[]>([]);
  const [filteredFoods, setFilteredFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Add form
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [form, setForm] = useState({ name: "", caloriesPer100g: "", proteinPer100g: "" });
  const [formErrors, setFormErrors] = useState({ name: "", caloriesPer100g: "", proteinPer100g: "" });
  type ImageAsset =
    | { platform: 'web'; file: File }
    | { platform: 'mobile'; uri: string; name: string; type: string };
  const [imageAsset, setImageAsset] = useState<ImageAsset | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Action state
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    action: () => void;
  }>({ visible: false, title: "", message: "", action: () => {} });

  const [alert, setAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: "success" | "error";
  }>({ visible: false, title: "", message: "", type: "success" });

  useEffect(() => {
    fetchFoods();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      setFilteredFoods(foods.filter((f) => f.name.toLowerCase().includes(q)));
    } else {
      setFilteredFoods(foods);
    }
  }, [searchQuery, foods]);

  const fetchFoods = async () => {
    try {
      const res = await fetch(`${ADMIN_URL}/foods`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setFoods(data.data);
      }
    } catch (err) {
      console.error("Error fetching foods:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFoods();
  }, []);

  const handleAdd = async () => {
    const { name, caloriesPer100g, proteinPer100g } = form;
    const errors = { name: "", caloriesPer100g: "", proteinPer100g: "" };
    let hasError = false;

    if (!name.trim()) {
      errors.name = "Food name is required";
      hasError = true;
    }
    if (!caloriesPer100g || isNaN(Number(caloriesPer100g)) || Number(caloriesPer100g) < 0) {
      errors.caloriesPer100g = "Please enter valid calories (≥ 0)";
      hasError = true;
    }
    if (!proteinPer100g || isNaN(Number(proteinPer100g)) || Number(proteinPer100g) < 0) {
      errors.proteinPer100g = "Please enter valid protein (≥ 0)";
      hasError = true;
    }
    if (hasError) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({ name: "", caloriesPer100g: "", proteinPer100g: "" });

    setFormLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("caloriesPer100g", caloriesPer100g);
      formData.append("proteinPer100g", proteinPer100g);
      if (imageAsset) {
        if (imageAsset.platform === 'web') {
          formData.append("image", imageAsset.file);
        } else {
          formData.append("image", { uri: imageAsset.uri, name: imageAsset.name, type: imageAsset.type } as any);
        }
      }

      const res = await fetch(`${ADMIN_URL}/foods`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setAlert({ visible: true, title: "Success", message: `"${data.data.name}" added successfully!`, type: "success" });
        setForm({ name: "", caloriesPer100g: "", proteinPer100g: "" });
        setImageAsset(null);
        setImagePreview(null);
        setShowForm(false);
        fetchFoods();
      } else {
        setAlert({ visible: true, title: "Error", message: data.message, type: "error" });
      }
    } catch {
      setAlert({ visible: true, title: "Error", message: "Failed to add food", type: "error" });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = (food: Food) => {
    setConfirmDialog({
      visible: true,
      title: "Delete Food",
      message: `Are you sure you want to delete "${food.name}"? This action cannot be undone.`,
      action: async () => {
        setConfirmDialog((prev) => ({ ...prev, visible: false }));
        setActionLoading(food.id);
        try {
          const res = await fetch(`${ADMIN_URL}/foods/${food.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (data.success) {
            setAlert({ visible: true, title: "Deleted", message: data.message, type: "success" });
            fetchFoods();
          } else {
            setAlert({ visible: true, title: "Error", message: data.message, type: "error" });
          }
        } catch {
          setAlert({ visible: true, title: "Error", message: "Failed to delete food", type: "error" });
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const renderFood = ({ item }: { item: Food }) => {
    const imageUri = item.image?.startsWith("/uploads/") ? `${SERVER_BASE}${item.image}` : null;
    return (
    <View style={styles.foodCard}>
      <View style={styles.foodRow}>
        <View style={styles.foodIconContainer}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={{ width: 40, height: 40, borderRadius: 10 }} resizeMode="cover" />
          ) : (
            <Ionicons name="nutrition" size={24} color="#10b981" />
          )}
        </View>
        <View style={styles.foodInfo}>
          <Text style={styles.foodName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.nutrientsRow}>
            <View style={styles.nutrientBadge}>
              <Ionicons name="flame-outline" size={12} color="#f59e0b" />
              <Text style={styles.nutrientText}>{item.caloriesPer100g} kcal</Text>
            </View>
            <View style={[styles.nutrientBadge, { backgroundColor: "#ede9fe" }]}>
              <Ionicons name="barbell-outline" size={12} color="#6366f1" />
              <Text style={[styles.nutrientText, { color: "#6366f1" }]}>{item.proteinPer100g}g protein</Text>
            </View>
          </View>
        </View>
        <Pressable
          style={styles.deleteIconButton}
          onPress={() => handleDelete(item)}
          disabled={actionLoading === item.id}
        >
          {actionLoading === item.id ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          )}
        </Pressable>
      </View>
    </View>
    );
  };

  const handlePickImage = async () => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (e: any) => {
        const file: File | undefined = e.target?.files?.[0];
        if (file) {
          setImageAsset({ platform: 'web', file });
          const reader = new FileReader();
          reader.onload = (ev) => setImagePreview(ev.target?.result as string);
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Please allow access to your photo library to upload an image.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const uriParts = asset.uri.split("/");
        const filename = uriParts[uriParts.length - 1];
        const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
        const mimeMap: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp" };
        setImageAsset({ platform: 'mobile', uri: asset.uri, name: filename, type: mimeMap[ext] || "image/jpeg" });
        setImagePreview(asset.uri);
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading foods...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Food Database</Text>
          <Text style={styles.headerSubtitle}>
            {foods.length} food item{foods.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <Pressable
          style={styles.addButton}
          onPress={() => setShowForm(true)}
        >
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={styles.addButtonText}>Add Food</Text>
        </Pressable>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search foods..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color="#9ca3af" />
          </Pressable>
        )}
      </View>

      {/* List */}
      <FlatList
        data={filteredFoods}
        keyExtractor={(item) => item.id}
        renderItem={renderFood}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#6366f1"]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="nutrition-outline" size={48} color="#9ca3af" />
            <Text style={styles.emptyText}>
              {searchQuery ? "No foods match your search" : "No foods yet"}
            </Text>
          </View>
        }
      />

      {/* Add Food Modal */}
      <Modal visible={showForm} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Food</Text>
              <Pressable onPress={() => setShowForm(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Image picker */}
              <Text style={styles.inputLabel}>Image (optional)</Text>
              <Pressable style={styles.imagePickerBox} onPress={handlePickImage}>
                {imagePreview ? (
                  <Image source={{ uri: imagePreview }} style={styles.imagePreviewFull} resizeMode="cover" />
                ) : (
                  <View style={styles.imagePickerPlaceholder}>
                    <Ionicons name="camera-outline" size={32} color="#9ca3af" />
                    <Text style={styles.imagePickerHint}>Tap to select image</Text>
                  </View>
                )}
              </Pressable>
              {imagePreview && (
                <Pressable
                  style={styles.removeImageBtn}
                  onPress={() => { setImageAsset(null); setImagePreview(null); }}
                >
                  <Ionicons name="close-circle" size={16} color="#ef4444" />
                  <Text style={styles.removeImageText}>Remove image</Text>
                </Pressable>
              )}

              <Text style={styles.inputLabel}>Food Name *</Text>
              <TextInput
                style={[styles.formInput, !!formErrors.name && styles.formInputError]}
                placeholder="e.g. Chicken Breast"
                placeholderTextColor="#9ca3af"
                value={form.name}
                onChangeText={(t) => { setForm({ ...form, name: t }); setFormErrors((e) => ({ ...e, name: "" })); }}
              />
              {!!formErrors.name && <Text style={styles.fieldError}>{formErrors.name}</Text>}

              <Text style={styles.inputLabel}>Calories per 100g *</Text>
              <TextInput
                style={[styles.formInput, !!formErrors.caloriesPer100g && styles.formInputError]}
                placeholder="e.g. 165"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                value={form.caloriesPer100g}
                onChangeText={(t) => { setForm({ ...form, caloriesPer100g: t }); setFormErrors((e) => ({ ...e, caloriesPer100g: "" })); }}
              />
              {!!formErrors.caloriesPer100g && <Text style={styles.fieldError}>{formErrors.caloriesPer100g}</Text>}

              <Text style={styles.inputLabel}>Protein per 100g (grams) *</Text>
              <TextInput
                style={[styles.formInput, !!formErrors.proteinPer100g && styles.formInputError]}
                placeholder="e.g. 31"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                value={form.proteinPer100g}
                onChangeText={(t) => { setForm({ ...form, proteinPer100g: t }); setFormErrors((e) => ({ ...e, proteinPer100g: "" })); }}
              />
              {!!formErrors.proteinPer100g && <Text style={styles.fieldError}>{formErrors.proteinPer100g}</Text>}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => {
                  setShowForm(false);
                  setFormErrors({ name: "", caloriesPer100g: "", proteinPer100g: "" });
                  setImageAsset(null);
                  setImagePreview(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.submitButton, formLoading && { opacity: 0.7 }]}
                onPress={handleAdd}
                disabled={formLoading}
              >
                {formLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={styles.submitButtonText}>Add Food</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmDialog
        visible={confirmDialog.visible}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.action}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, visible: false }))}
        confirmText="Delete"
        cancelText="Cancel"
      />

      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert((prev) => ({ ...prev, visible: false }))}
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
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    backgroundColor: colors.surface,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.success,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.md,
    gap: 4,
    ...shadow.sm,
  },
  addButtonText: {
    color: colors.surface,
    fontWeight: "700",
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  foodCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  foodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  foodIconContainer: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.successLight,
    alignItems: "center",
    justifyContent: "center",
  },
  foodInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  foodName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  nutrientsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  nutrientBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.secondaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 10,
  },
  nutrientText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#92400e",
  },
  deleteIconButton: {
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.dangerLight,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textTertiary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: spacing.xxl,
    borderTopRightRadius: spacing.xxl,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  modalBody: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  formInput: {
    backgroundColor: colors.borderLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.text,
  },
  modalFooter: {
    flexDirection: "row",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  submitButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: 14,
    borderRadius: radius.md,
    backgroundColor: colors.success,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.surface,
  },
  imagePickerBox: {
    width: "100%",
    height: 140,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: "dashed",
    overflow: "hidden",
    backgroundColor: colors.borderLight,
    marginBottom: spacing.xs,
  },
  imagePreviewFull: {
    width: "100%",
    height: "100%",
  },
  imagePickerPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  imagePickerHint: {
    fontSize: 13,
    color: colors.textTertiary,
  },
  removeImageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  removeImageText: {
    fontSize: 13,
    color: colors.danger,
  },
  formInputError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerLight,
  },
  fieldError: {
    fontSize: 12,
    color: colors.danger,
    marginTop: 4,
    marginBottom: 2,
  },
});
