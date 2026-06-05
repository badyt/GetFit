import { View, Text, Pressable, StyleSheet, Modal } from "react-native";
import { colors, spacing, radius, shadow } from "../theme";

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
};

export default function ConfirmDialog({ 
  visible, 
  title, 
  message, 
  onConfirm, 
  onCancel,
  confirmText = "Yes",
  cancelText = "No"
}: ConfirmDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.dialogContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttonRow}>
            <Pressable style={[styles.button, styles.cancelButton]} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>{cancelText}</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.confirmButton]} onPress={onConfirm}>
              <Text style={styles.confirmButtonText}>{confirmText}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
  },
  dialogContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    width: "85%",
    maxWidth: 400,
    padding: spacing.xxl,
    ...shadow.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: spacing.md,
  },
  message: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.xxl,
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: radius.sm,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: colors.borderLight,
  },
  confirmButton: {
    backgroundColor: colors.danger,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "600",
  },
});
