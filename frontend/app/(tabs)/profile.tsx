import { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, TextInput, Image, Alert, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from 'expo-image-picker';
import useAuthStore from "../../src/store/useAuthStore";
import { BASE_URL, SERVER_BASE } from "../../src/constants/api";
import { colors, spacing, radius, shadow } from "../../src/theme";

export default function Profile() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const refreshUser = useAuthStore((s) => s.refreshUser);

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.name || "");

  useEffect(() => {
    refreshUser();
  }, []);

  const pickImage = async () => {
    try {
      // For web testing, use a file input instead
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e: any) => {
          const file = e.target.files?.[0];
          if (file) {
            await uploadImageWeb(file);
          }
        };
        input.click();
        return;
      }

      // Mobile: Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload a profile picture.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImageMobile(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadImageWeb = async (file: File) => {
    if (!token) {
      Alert.alert('Error', 'You are not authenticated');
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('profilePicture', file);

      const response = await fetch(`${BASE_URL}/users/profile-picture`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        console.log('Upload successful, profile picture:', data.user?.profilePicture);
        Alert.alert('Success', 'Profile picture updated successfully');
        await refreshUser();
      } else {
        throw new Error(data.error || 'Failed to upload image');
      }
    } catch (error: any) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', error.message || 'Failed to upload profile picture');
    } finally {
      setUploadingImage(false);
    }
  };

  const uploadImageMobile = async (imageUri: string) => {
    if (!token) {
      Alert.alert('Error', 'You are not authenticated');
      return;
    }

    setUploadingImage(true);
    try {
      // Create FormData
      const formData: any = new FormData();
      
      // Get filename and extension
      const uriParts = imageUri.split('/');
      const filename = uriParts[uriParts.length - 1];
      const fileExtension = filename.split('.').pop()?.toLowerCase() || 'jpg';
      
      // Determine MIME type
      const mimeTypes: { [key: string]: string } = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
      };
      const type = mimeTypes[fileExtension] || 'image/jpeg';

      // Append file to FormData with proper structure for React Native
      formData.append('profilePicture', {
        uri: imageUri,
        name: filename,
        type: type,
      });

      const response = await fetch(`${BASE_URL}/users/profile-picture`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          // Don't set Content-Type - let fetch handle it for FormData
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Profile picture updated successfully');
        await refreshUser();
      } else {
        throw new Error(data.error || 'Failed to upload image');
      }
    } catch (error: any) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', error.message || 'Failed to upload profile picture');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeProfilePicture = async () => {
    if (!token) {
      Alert.alert('Error', 'You are not authenticated');
      return;
    }

    Alert.alert(
      'Remove Profile Picture',
      'Are you sure you want to remove your profile picture?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setUploadingImage(true);
            try {
              const response = await fetch(`${BASE_URL}/users/profile-picture`, {
                method: 'DELETE',
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });

              const data = await response.json();

              if (response.ok) {
                Alert.alert('Success', 'Profile picture removed successfully');
                await refreshUser();
              } else {
                throw new Error(data.error || 'Failed to remove image');
              }
            } catch (error: any) {
              console.error('Error removing image:', error);
              Alert.alert('Error', error.message || 'Failed to remove profile picture');
            } finally {
              setUploadingImage(false);
            }
          },
        },
      ]
    );
  };

  const handleUpdateName = async () => {
    if (!newName.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    if (newName.trim() === user?.name) {
      setIsEditingName(false);
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/users/name`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newName.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Name updated successfully');
        await refreshUser();
        setIsEditingName(false);
      } else {
        throw new Error(data.error || 'Failed to update name');
      }
    } catch (error: any) {
      console.error('Error updating name:', error);
      Alert.alert('Error', error.message || 'Failed to update name');
    }
  };

  const handleLogout = () => {
    logout();
    router.replace("/auth");
  };

  const handleJoin = async () => {
    setError(null);
    setSuccess(null);

    if (user?.role !== "TRAINEE") {
      setError("Only trainees can join a trainer.");
      return;
    }

    if (!code.trim()) {
      setError("Please enter an invite code.");
      return;
    }

    if (!token) {
      setError("You are not authenticated.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/trainee/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to join trainer");
      }

      setSuccess("You have successfully joined your trainer!");
      setCode("");
      await refreshUser();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const hasTrainer = user?.trainerId && user?.trainer;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header with Logout */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Profile</Text>
        <Pressable 
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.logoutButtonPressed
          ]}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>

      {user && (
        <>
          {/* Profile Picture Card */}
          <View style={styles.profileCard}>
            <View style={styles.profilePictureContainer}>
              <Pressable onPress={pickImage} disabled={uploadingImage}>
                {uploadingImage ? (
                  <View style={styles.profilePictureLarge}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                  </View>
                ) : user.profilePicture ? (
                  <Image
                    source={{ uri: `${SERVER_BASE}${user.profilePicture}?t=${Date.now()}` }}
                    style={styles.profilePictureLarge}
                    onError={(e) => console.log('Image load error:', e.nativeEvent)}
                  />
                ) : (
                  <View style={styles.profilePictureLarge}>
                    <Text style={styles.profileInitial}>{user.name.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                {/* Camera Icon Overlay */}
                <View style={styles.cameraIconOverlay}>
                  <Text style={styles.cameraIcon}>📷</Text>
                </View>
              </Pressable>
              
              {user.profilePicture && !uploadingImage && (
                <Pressable
                  style={({ pressed }) => [
                    styles.removePhotoButton,
                    pressed && styles.removePhotoButtonPressed
                  ]}
                  onPress={removeProfilePicture}
                >
                  <Text style={styles.removePhotoText}>Remove Photo</Text>
                </Pressable>
              )}
            </View>

            {/* Name Section */}
            <View style={styles.nameSection}>
              {isEditingName ? (
                <View style={styles.nameEditContainer}>
                  <TextInput
                    style={styles.nameInput}
                    value={newName}
                    onChangeText={setNewName}
                    placeholder="Enter your name"
                    autoFocus
                  />
                  <View style={styles.nameEditButtons}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.nameEditButton,
                        styles.saveButton,
                        pressed && styles.buttonPressed
                      ]}
                      onPress={handleUpdateName}
                    >
                      <Text style={styles.saveButtonText}>Save</Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.nameEditButton,
                        styles.cancelButton,
                        pressed && styles.buttonPressed
                      ]}
                      onPress={() => {
                        setNewName(user.name);
                        setIsEditingName(false);
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={styles.nameDisplay}>
                  <Text style={styles.userName}>{user.name}</Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.editNameButton,
                      pressed && styles.editNameButtonPressed
                    ]}
                    onPress={() => setIsEditingName(true)}
                  >
                    <Text style={styles.editIcon}>✏️</Text>
                  </Pressable>
                </View>
              )}
              <Text style={styles.userEmail}>{user.email}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{user.role}</Text>
              </View>
            </View>
          </View>

          {/* Account Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Account Information</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Member Since</Text>
              <Text style={styles.infoValue}>{user.createdAt ? formatDate(user.createdAt) : 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email Status</Text>
              <View style={[styles.statusBadge, user.isEmailVerified ? styles.verifiedBadge : styles.unverifiedBadge]}>
                <Text style={styles.statusBadgeText}>
                  {user.isEmailVerified ? '✓ Verified' : '⚠ Unverified'}
                </Text>
              </View>
            </View>
          </View>

          {/* Trainer Section for Trainees */}
          {user.role === "TRAINEE" && (
            <View style={styles.infoCard}>
              <Text style={styles.cardTitle}>Your Trainer</Text>
              {hasTrainer ? (
                <View style={styles.trainerInfo}>
                  {user.trainer?.profilePicture ? (
                    <Image
                      source={{ uri: `${SERVER_BASE}${user.trainer.profilePicture}` }}
                      style={styles.trainerPhoto}
                    />
                  ) : (
                    <View style={styles.trainerPhotoPlaceholder}>
                      <Text style={styles.trainerInitial}>
                        {user.trainer?.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.trainerDetails}>
                    <Text style={styles.trainerName}>{user.trainer?.name}</Text>
                    <Text style={styles.trainerLabel}>Your Coach</Text>
                  </View>
                </View>
              ) : (
                <View>
                  <Text style={styles.noTrainerText}>You haven't joined a trainer yet</Text>
                  {!isJoining ? (
                    <Pressable
                      style={({ pressed }) => [
                        styles.joinTrainerButton,
                        pressed && styles.buttonPressed
                      ]}
                      onPress={() => setIsJoining(true)}
                    >
                      <Text style={styles.joinTrainerButtonText}>+ Join a Trainer</Text>
                    </Pressable>
                  ) : (
                    <View style={styles.joinForm}>
                      <TextInput
                        style={styles.codeInput}
                        placeholder="Enter invite code"
                        value={code}
                        onChangeText={setCode}
                        autoCapitalize="none"
                      />
                      {error && <Text style={styles.errorText}>{error}</Text>}
                      {success && <Text style={styles.successText}>{success}</Text>}
                      <View style={styles.joinFormButtons}>
                        <Pressable
                          style={({ pressed }) => [
                            styles.formButton,
                            styles.submitButton,
                            loading && styles.disabledButton,
                            pressed && !loading && styles.buttonPressed
                          ]}
                          onPress={handleJoin}
                          disabled={loading}
                        >
                          {loading ? (
                            <ActivityIndicator color="#fff" size="small" />
                          ) : (
                            <Text style={styles.submitButtonText}>Join</Text>
                          )}
                        </Pressable>
                        <Pressable
                          style={({ pressed }) => [
                            styles.formButton,
                            styles.cancelFormButton,
                            pressed && styles.buttonPressed
                          ]}
                          onPress={() => {
                            setIsJoining(false);
                            setCode("");
                            setError(null);
                            setSuccess(null);
                          }}
                        >
                          <Text style={styles.cancelFormButtonText}>Cancel</Text>
                        </Pressable>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : spacing.xl,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
  },
  logoutButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.dangerLight,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  logoutButtonPressed: {
    backgroundColor: "#fecaca",
  },
  logoutText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "600",
  },
  profileCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    borderRadius: radius.lg,
    padding: spacing.xxl,
    alignItems: "center",
    ...shadow.md,
  },
  profilePictureContainer: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  profilePictureLarge: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: colors.surface,
    ...shadow.md,
  },
  profileInitial: {
    fontSize: 56,
    fontWeight: "700",
    color: colors.surface,
  },
  cameraIconOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.surface,
    ...shadow.sm,
  },
  cameraIcon: {
    fontSize: 20,
  },
  removePhotoButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    backgroundColor: colors.dangerLight,
    borderRadius: radius.sm,
  },
  removePhotoButtonPressed: {
    backgroundColor: "#fecaca",
  },
  removePhotoText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "600",
  },
  nameSection: {
    alignItems: "center",
    width: "100%",
  },
  nameEditContainer: {
    width: "100%",
    alignItems: "center",
  },
  nameInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    backgroundColor: colors.borderLight,
    marginBottom: spacing.md,
  },
  nameEditButtons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  nameEditButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    color: colors.surface,
    fontWeight: "600",
    fontSize: 14,
  },
  cancelButton: {
    backgroundColor: colors.borderLight,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontWeight: "600",
    fontSize: 14,
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  nameDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  userName: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
  },
  editNameButton: {
    padding: spacing.xs,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
  },
  editNameButtonPressed: {
    backgroundColor: "#c7d2fe",
  },
  editIcon: {
    fontSize: 16,
  },
  userEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  roleBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "#c7d2fe",
  },
  roleBadgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    padding: spacing.xl,
    ...shadow.md,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  verifiedBadge: {
    backgroundColor: colors.successLight,
  },
  unverifiedBadge: {
    backgroundColor: "#fed7aa",
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  trainerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    backgroundColor: colors.borderLight,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  trainerPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.border,
  },
  trainerPhotoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
  },
  trainerInitial: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.surface,
  },
  trainerDetails: {
    flex: 1,
  },
  trainerName: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 2,
  },
  trainerLabel: {
    fontSize: 13,
    color: colors.success,
    fontWeight: "600",
  },
  noTrainerText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  joinTrainerButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.sm,
    alignItems: "center",
  },
  joinTrainerButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "600",
  },
  joinForm: {
    marginTop: spacing.sm,
  },
  codeInput: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    marginBottom: spacing.md,
  },
  joinFormButtons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  formButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    alignItems: "center",
  },
  submitButton: {
    backgroundColor: colors.success,
  },
  submitButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "600",
  },
  cancelFormButton: {
    backgroundColor: colors.borderLight,
  },
  cancelFormButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  successText: {
    color: colors.success,
    fontSize: 14,
    marginBottom: spacing.md,
    textAlign: "center",
  },
});
