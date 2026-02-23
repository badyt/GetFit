import { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    SectionList,
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

type Category = {
    id: string;
    name: string;
    _count: { exercises: number };
};

type Exercise = {
    id: string;
    name: string;
    description: string | null;
    image: string | null;
    categoryId: string;
    category: { id: string; name: string };
};

type Section = {
    title: string;
    data: Exercise[];
};

export default function AdminExercises() {
    const token = useAuthStore((s) => s.token);
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Add form
    const [showForm, setShowForm] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [form, setForm] = useState({
        name: "",
        description: "",
        categoryName: "",
        categoryId: ""
    });
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [formErrors, setFormErrors] = useState({ name: "", categoryName: "" });

    // Action state
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const [confirmDialog, setConfirmDialog] = useState<{
        visible: boolean;
        title: string;
        message: string;
        action: () => void;
    }>({ visible: false, title: "", message: "", action: () => { } });

    const [alert, setAlert] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type: "success" | "error";
    }>({ visible: false, title: "", message: "", type: "success" });

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        buildSections();
    }, [exercises, searchQuery]);

    const loadData = async () => {
        try {
            const [exRes, catRes] = await Promise.all([
                fetch(`${ADMIN_URL}/exercises`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${ADMIN_URL}/categories`, { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            const exData = await exRes.json();
            const catData = await catRes.json();
            if (exData.success) setExercises(exData.data);
            if (catData.success) setCategories(catData.data);
        } catch (err) {
            console.error("Error loading exercises:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadData();
    }, []);

    const buildSections = () => {
        let filtered = exercises;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = exercises.filter(
                (e) =>
                    e.name.toLowerCase().includes(q) ||
                    e.category?.name.toLowerCase().includes(q)
            );
        }

        const grouped: Record<string, Exercise[]> = {};
        filtered.forEach((e) => {
            const cat = e.category?.name || "Uncategorized";
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(e);
        });

        const sectionArray = Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([title, data]) => ({ title, data }));

        setSections(sectionArray);
    };

    const handleAdd = async () => {
        const { name, description, categoryName, categoryId } = form;
        const errors = { name: "", categoryName: "" };
        let hasError = false;

        if (!name.trim()) {
            errors.name = "Exercise name is required";
            hasError = true;
        }
        if (!categoryName.trim()) {
            errors.categoryName = "Category is required";
            hasError = true;
        }
        if (hasError) {
            setFormErrors(errors);
            return;
        }
        setFormErrors({ name: "", categoryName: "" });

        setFormLoading(true);
        try {
            const formData = new FormData();
            formData.append("name", name.trim());
            if (description.trim()) formData.append("description", description.trim());
            formData.append("categoryName", categoryName.trim());
            if (categoryId) formData.append("categoryId", categoryId);
            if (selectedImage) formData.append("image", selectedImage);
            
            formData.forEach((value, key) => {
                console.log("FormData entry:", key, value);
            });
            const res = await fetch(`${ADMIN_URL}/exercises`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
            const data = await res.json();
            if (data.success) {
                setAlert({
                    visible: true,
                    title: "Success",
                    message: `"${data.data.name}" added to ${data.data.category?.name || categoryName}!`,
                    type: "success",
                });
                setForm({ name: "", description: "", categoryName: "", categoryId: "" });
                setSelectedImage(null);
                setImagePreview(null);
                setShowForm(false);
                loadData();
            } else {
                setAlert({ visible: true, title: "Error", message: data.message, type: "error" });
            }
        } catch {
            setAlert({ visible: true, title: "Error", message: "Failed to add exercise", type: "error" });
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = (exercise: Exercise) => {
        setConfirmDialog({
            visible: true,
            title: "Delete Exercise",
            message: `Are you sure you want to delete "${exercise.name}"?`,
            action: async () => {
                setConfirmDialog((prev) => ({ ...prev, visible: false }));
                setActionLoading(exercise.id);
                try {
                    const res = await fetch(`${ADMIN_URL}/exercises/${exercise.id}`, {
                        method: "DELETE",
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    const data = await res.json();
                    if (data.success) {
                        setAlert({ visible: true, title: "Deleted", message: data.message, type: "success" });
                        loadData();
                    } else {
                        setAlert({ visible: true, title: "Error", message: data.message, type: "error" });
                    }
                } catch {
                    setAlert({ visible: true, title: "Error", message: "Failed to delete exercise", type: "error" });
                } finally {
                    setActionLoading(null);
                }
            },
        });
    };

    const renderExercise = ({ item }: { item: Exercise }) => {
        const imageUri = item.image?.startsWith("/uploads/") ? `${SERVER_BASE}${item.image}` : null;
        return (
            <View style={styles.exerciseCard}>
                <View style={styles.exerciseRow}>
                    <View style={styles.exerciseIconContainer}>
                        {imageUri ? (
                            <Image source={{ uri: imageUri }} style={{ width: 36, height: 36, borderRadius: 8 }} resizeMode="cover" />
                        ) : (
                            <Ionicons name="barbell" size={20} color="#6366f1" />
                        )}
                    </View>
                    <View style={styles.exerciseInfo}>
                        <Text style={styles.exerciseName} numberOfLines={1}>{item.name}</Text>
                        {item.description && (
                            <Text style={styles.exerciseDesc} numberOfLines={2}>
                                {item.description}
                            </Text>
                        )}
                    </View>
                    <Pressable
                        style={styles.deleteIconButton}
                        onPress={() => handleDelete(item)}
                        disabled={actionLoading === item.id}
                    >
                        {actionLoading === item.id ? (
                            <ActivityIndicator size="small" color="#ef4444" />
                        ) : (
                            <Ionicons name="trash-outline" size={18} color="#ef4444" />
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

    const renderSectionHeader = ({ section }: { section: Section }) => (
        <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
                <Ionicons name="folder-open" size={16} color="#6366f1" />
                <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            <View style={styles.sectionCountBadge}>
                <Text style={styles.sectionCount}>{section.data.length}</Text>
            </View>
        </View>
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
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Exercise Database</Text>
                    <Text style={styles.headerSubtitle}>
                        {exercises.length} exercise{exercises.length !== 1 ? "s" : ""} in{" "}
                        {categories.length} categories
                    </Text>
                </View>
                <Pressable style={styles.addButton} onPress={() => setShowForm(true)}>
                    <Ionicons name="add" size={22} color="#fff" />
                    <Text style={styles.addButtonText}>Add Exercise</Text>
                </Pressable>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search exercises or categories..."
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

            {/* Grouped List */}
            <SectionList
                sections={sections}
                keyExtractor={(item) => item.id}
                renderItem={renderExercise}
                renderSectionHeader={renderSectionHeader}
                stickySectionHeadersEnabled={false}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#6366f1"]} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="barbell-outline" size={48} color="#9ca3af" />
                        <Text style={styles.emptyText}>
                            {searchQuery ? "No exercises match your search" : "No exercises yet"}
                        </Text>
                    </View>
                }
            />

            {/* Add Exercise Modal */}
            <Modal visible={showForm} transparent animationType="slide">
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add New Exercise</Text>
                            <Pressable onPress={() => { setShowForm(false); setShowCategoryPicker(false); setSelectedImage(null); setImagePreview(null); setFormErrors({ name: "", categoryName: "" }); }}>
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

                            <Text style={styles.inputLabel}>Exercise Name *</Text>
                            <TextInput
                                style={[styles.formInput, !!formErrors.name && styles.formInputError]}
                                placeholder="e.g. Barbell Bench Press"
                                placeholderTextColor="#9ca3af"
                                value={form.name}
                                onChangeText={(t) => { setForm({ ...form, name: t }); setFormErrors((e) => ({ ...e, name: "" })); }}
                            />
                            {!!formErrors.name && <Text style={styles.fieldError}>{formErrors.name}</Text>}

                            <Text style={styles.inputLabel}>Description</Text>
                            <TextInput
                                style={[styles.formInput, { minHeight: 80, textAlignVertical: "top" }]}
                                placeholder="Optional description..."
                                placeholderTextColor="#9ca3af"
                                multiline
                                value={form.description}
                                onChangeText={(t) => setForm({ ...form, description: t })}
                            />

                            <Text style={styles.inputLabel}>Category *</Text>
                            <Pressable
                                style={[styles.formInput, !!formErrors.categoryName && styles.formInputError]}
                                onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                            >
                                <View style={styles.categoryPickerRow}>
                                    <Text
                                        style={[
                                            styles.categoryPickerText,
                                            !form.categoryName && { color: "#9ca3af" },
                                        ]}
                                    >
                                        {form.categoryName || "Select or type a category"}
                                    </Text>
                                    <Ionicons
                                        name={showCategoryPicker ? "chevron-up" : "chevron-down"}
                                        size={18}
                                        color="#6b7280"
                                    />
                                </View>
                            </Pressable>
                            {!!formErrors.categoryName && <Text style={styles.fieldError}>{formErrors.categoryName}</Text>}

                            {showCategoryPicker && (
                                <View style={styles.categoryDropdown}>
                                    <TextInput
                                        style={styles.categorySearchInput}
                                        placeholder="Type new category or search..."
                                        placeholderTextColor="#9ca3af"
                                        value={form.categoryName}
                                        onChangeText={(t) => setForm({ ...form, categoryName: t })}
                                        autoFocus
                                    />
                                    <ScrollView style={styles.categoryList} nestedScrollEnabled>
                                        {categories
                                            .filter((c) =>
                                                !form.categoryName ||
                                                c.name.toLowerCase().includes(form.categoryName.toLowerCase())
                                            )
                                            .map((cat) => (
                                                <Pressable
                                                    key={cat.id}
                                                    style={[
                                                        styles.categoryItem,
                                                        form.categoryName === cat.name && styles.categoryItemActive,
                                                    ]}
                                                    onPress={() => {
                                                        setForm({ ...form, categoryName: cat.name, categoryId: cat.id });
                                                        setShowCategoryPicker(false);
                                                    }}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.categoryItemText,
                                                            form.categoryName === cat.name &&
                                                            styles.categoryItemTextActive,
                                                        ]}
                                                    >
                                                        {cat.name}
                                                    </Text>
                                                    <Text style={styles.categoryItemCount}>
                                                        {cat._count.exercises}
                                                    </Text>
                                                </Pressable>
                                            ))}
                                        {form.categoryName.trim() &&
                                            !categories.some(
                                                (c) => c.name.toLowerCase() === form.categoryName.toLowerCase()
                                            ) && (
                                                <View style={styles.newCategoryHint}>
                                                    <Ionicons name="add-circle-outline" size={16} color="#10b981" />
                                                    <Text style={styles.newCategoryHintText}>
                                                        "{form.categoryName}" will be created as a new category
                                                    </Text>
                                                </View>
                                            )}
                                    </ScrollView>
                                </View>
                            )}
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <Pressable
                                style={styles.cancelButton}
                                onPress={() => { setShowForm(false); setShowCategoryPicker(false); setSelectedImage(null); setImagePreview(null); setFormErrors({ name: "", categoryName: "" }); }}
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
                                        <Text style={styles.submitButtonText}>Add Exercise</Text>
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
        backgroundColor: "#6366f1",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        gap: 4,
        shadowColor: "#6366f1",
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
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 10,
        paddingHorizontal: 4,
        marginTop: 8,
    },
    sectionHeaderLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#111827",
    },
    sectionCountBadge: {
        backgroundColor: "#eef2ff",
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 12,
    },
    sectionCount: {
        fontSize: 12,
        fontWeight: "700",
        color: "#6366f1",
    },
    exerciseCard: {
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 14,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    exerciseRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    exerciseIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: "#eef2ff",
        alignItems: "center",
        justifyContent: "center",
    },
    exerciseInfo: {
        flex: 1,
        gap: 3,
    },
    exerciseName: {
        fontSize: 15,
        fontWeight: "600",
        color: "#111827",
    },
    exerciseDesc: {
        fontSize: 12,
        color: "#6b7280",
        lineHeight: 16,
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
        maxHeight: "85%",
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
    categoryPickerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    categoryPickerText: {
        fontSize: 15,
        color: "#111827",
    },
    categoryDropdown: {
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 12,
        marginTop: 8,
        overflow: "hidden",
    },
    categorySearchInput: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 14,
        color: "#111827",
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
    },
    categoryList: {
        maxHeight: 160,
    },
    categoryItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#f9fafb",
    },
    categoryItemActive: {
        backgroundColor: "#eef2ff",
    },
    categoryItemText: {
        fontSize: 14,
        color: "#374151",
    },
    categoryItemTextActive: {
        color: "#6366f1",
        fontWeight: "600",
    },
    categoryItemCount: {
        fontSize: 12,
        color: "#9ca3af",
    },
    newCategoryHint: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: "#ecfdf5",
    },
    newCategoryHintText: {
        fontSize: 13,
        color: "#10b981",
        flex: 1,
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
        backgroundColor: "#6366f1",
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
