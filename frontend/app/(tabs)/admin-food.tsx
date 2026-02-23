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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import useAuthStore from "../../src/store/useAuthStore";
import { ADMIN_URL, SERVER_BASE } from "../../src/constants/api";
import ConfirmDialog from "../../src/components/ConfirmDialog";
import CustomAlert from "../../src/components/CustomAlert";

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
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
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
      if (selectedImage) {
        formData.append("image", selectedImage);
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
        setSelectedImage(null);
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

  const handlePickImage = () => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (e: any) => {
        const file: File | undefined = e.target?.files?.[0];
        if (file) {
          setSelectedImage(file);
          const reader = new FileReader();
          reader.onload = (ev) => setImagePreview(ev.target?.result as string);
          reader.readAsDataURL(file);
        }
      };
      input.click();
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
                  onPress={() => { setSelectedImage(null); setImagePreview(null); }}
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
                  setSelectedImage(null);
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
    fontSize: 16,
    color: "#6b7280",
  },
  header: {
    backgroundColor: "#fff",
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10b981",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 4,
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  foodCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  foodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  foodIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#ecfdf5",
    alignItems: "center",
    justifyContent: "center",
  },
  foodInfo: {
    flex: 1,
    gap: 6,
  },
  foodName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  nutrientsRow: {
    flexDirection: "row",
    gap: 8,
  },
  nutrientBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  nutrientText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#92400e",
  },
  deleteIconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#fef2f2",
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: "#9ca3af",
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
    marginTop: 12,
  },
  formInput: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
  },
  modalFooter: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6b7280",
  },
  submitButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#10b981",
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  imagePickerBox: {
    width: "100%",
    height: 140,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
    overflow: "hidden",
    backgroundColor: "#f9fafb",
    marginBottom: 6,
  },
  imagePreviewFull: {
    width: "100%",
    height: "100%",
  },
  imagePickerPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  imagePickerHint: {
    fontSize: 13,
    color: "#9ca3af",
  },
  removeImageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  removeImageText: {
    fontSize: 13,
    color: "#ef4444",
  },
  formInputError: {
    borderColor: "#ef4444",
    backgroundColor: "#fff5f5",
  },
  fieldError: {
    fontSize: 12,
    color: "#ef4444",
    marginTop: 4,
    marginBottom: 2,
  },
});
