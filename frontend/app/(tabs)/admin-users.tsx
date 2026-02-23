import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  TextInput,
  Image,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import useAuthStore from "../../src/store/useAuthStore";
import { ADMIN_URL, SERVER_BASE } from "../../src/constants/api";
import ConfirmDialog from "../../src/components/ConfirmDialog";
import CustomAlert from "../../src/components/CustomAlert";

type User = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  profilePicture: string | null;
  isEmailVerified: boolean;
  createdAt: string;
  trainerId: string | null;
  trainer: { id: string; name: string } | null;
  _count: { trainees: number };
};

export default function AdminUsers() {
  const token = useAuthStore((s) => s.token);
  const currentUser = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Dialogs
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
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, roleFilter, users]);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${ADMIN_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUsers();
  }, []);

  const filterUsers = () => {
    let filtered = [...users];
    if (roleFilter !== "ALL") {
      filtered = filtered.filter((u) => u.role === roleFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    }
    setFilteredUsers(filtered);
  };

  const handlePromote = (user: User) => {
    setConfirmDialog({
      visible: true,
      title: "Promote to Trainer",
      message: `Are you sure you want to promote "${user.name}" from TRAINEE to TRAINER? This will remove any trainer relationship.`,
      action: async () => {
        setConfirmDialog({ ...confirmDialog, visible: false });
        setActionLoading(user.id);
        try {
          const res = await fetch(`${ADMIN_URL}/users/${user.id}/promote`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (data.success) {
            setAlert({
              visible: true,
              title: "Success",
              message: data.message,
              type: "success",
            });
            fetchUsers();
          } else {
            setAlert({
              visible: true,
              title: "Error",
              message: data.message,
              type: "error",
            });
          }
        } catch {
          setAlert({
            visible: true,
            title: "Error",
            message: "Failed to promote user",
            type: "error",
          });
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const handleDelete = (user: User) => {
    setConfirmDialog({
      visible: true,
      title: "Delete User",
      message: `Are you sure you want to permanently delete "${user.name}" (${user.email})? This action cannot be undone.`,
      action: async () => {
        setConfirmDialog({ ...confirmDialog, visible: false });
        setActionLoading(user.id);
        try {
          const res = await fetch(`${ADMIN_URL}/users/${user.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (data.success) {
            setAlert({
              visible: true,
              title: "Deleted",
              message: data.message,
              type: "success",
            });
            fetchUsers();
          } else {
            setAlert({
              visible: true,
              title: "Error",
              message: data.message,
              type: "error",
            });
          }
        } catch {
          setAlert({
            visible: true,
            title: "Error",
            message: "Failed to delete user",
            type: "error",
          });
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const getRoleBadge = (role: string) => {
    const config: Record<string, { bg: string; text: string; icon: string }> = {
      ADMIN: { bg: "#fef3c7", text: "#92400e", icon: "shield" },
      TRAINER: { bg: "#dbeafe", text: "#1e40af", icon: "medal" },
      TRAINEE: { bg: "#dcfce7", text: "#166534", icon: "person" },
    };
    const c = config[role] || config.TRAINEE;
    return (
      <View style={[styles.badge, { backgroundColor: c.bg }]}>
        <Ionicons name={c.icon as any} size={12} color={c.text} />
        <Text style={[styles.badgeText, { color: c.text }]}>{role}</Text>
      </View>
    );
  };

  const renderUser = ({ item }: { item: User }) => {
    const isCurrentUser = item.id === currentUser?.id;
    const isBeingActedOn = actionLoading === item.id;

    return (
      <View style={styles.userCard}>
        <View style={styles.userHeader}>
          {item.profilePicture ? (
            <Image
              source={{ uri: `${SERVER_BASE}${item.profilePicture}` }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.userName} numberOfLines={1}>
                {item.name}
              </Text>
              {isCurrentUser && (
                <View style={styles.youBadge}>
                  <Text style={styles.youBadgeText}>YOU</Text>
                </View>
              )}
            </View>
            <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
            <View style={styles.metaRow}>
              {getRoleBadge(item.role)}
              {item.isEmailVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Extra info */}
        <View style={styles.detailsRow}>
          {item.phone && (
            <View style={styles.detailItem}>
              <Ionicons name="call-outline" size={14} color="#6b7280" />
              <Text style={styles.detailText}>{item.phone}</Text>
            </View>
          )}
          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={14} color="#6b7280" />
            <Text style={styles.detailText}>
              Joined {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
          {item.role === "TRAINER" && (
            <View style={styles.detailItem}>
              <Ionicons name="people-outline" size={14} color="#6b7280" />
              <Text style={styles.detailText}>
                {item._count.trainees} trainee{item._count.trainees !== 1 ? "s" : ""}
              </Text>
            </View>
          )}
          {item.trainer && (
            <View style={styles.detailItem}>
              <Ionicons name="person-outline" size={14} color="#6b7280" />
              <Text style={styles.detailText}>Trainer: {item.trainer.name}</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        {!isCurrentUser && (
          <View style={styles.actionsRow}>
            {item.role === "TRAINEE" && (
              <Pressable
                style={[styles.actionButton, styles.promoteButton]}
                onPress={() => handlePromote(item)}
                disabled={isBeingActedOn}
              >
                {isBeingActedOn ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="arrow-up-circle" size={16} color="#fff" />
                    <Text style={styles.actionButtonText}>Promote</Text>
                  </>
                )}
              </Pressable>
            )}
            <Pressable
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDelete(item)}
              disabled={isBeingActedOn}
            >
              {isBeingActedOn ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="trash" size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>Delete</Text>
                </>
              )}
            </Pressable>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>User Management</Text>
        <Text style={styles.headerSubtitle}>
          {users.length} user{users.length !== 1 ? "s" : ""} total
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or email..."
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

      {/* Role filter */}
      <View style={styles.filterRow}>
        {["ALL", "TRAINEE", "TRAINER", "ADMIN"].map((role) => (
          <Pressable
            key={role}
            style={[
              styles.filterChip,
              roleFilter === role && styles.filterChipActive,
            ]}
            onPress={() => setRoleFilter(role)}
          >
            <Text
              style={[
                styles.filterChipText,
                roleFilter === role && styles.filterChipTextActive,
              ]}
            >
              {role === "ALL" ? "All" : role.charAt(0) + role.slice(1).toLowerCase()}
              {role !== "ALL" &&
                ` (${users.filter((u) => u.role === role).length})`}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        renderItem={renderUser}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#6366f1"]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color="#9ca3af" />
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        }
      />

      <ConfirmDialog
        visible={confirmDialog.visible}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.action}
        onCancel={() => setConfirmDialog({ ...confirmDialog, visible: false })}
        confirmText="Yes"
        cancelText="Cancel"
      />

      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert({ ...alert, visible: false })}
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 16,
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
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  filterChipActive: {
    backgroundColor: "#6366f1",
    borderColor: "#6366f1",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
  },
  filterChipTextActive: {
    color: "#fff",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  userCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  userHeader: {
    flexDirection: "row",
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    flexShrink: 1,
  },
  youBadge: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  youBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  userEmail: {
    fontSize: 13,
    color: "#6b7280",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  verifiedText: {
    fontSize: 11,
    color: "#10b981",
    fontWeight: "600",
  },
  detailsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: "#6b7280",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 100,
    justifyContent: "center",
  },
  promoteButton: {
    backgroundColor: "#6366f1",
  },
  deleteButton: {
    backgroundColor: "#ef4444",
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
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
});
