import { View, Text, Pressable, StyleSheet, Modal } from "react-native";
import { colors, spacing, radius, shadow } from "../theme";

type CustomAlertProps = {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  type?: "success" | "error";
};

export default function CustomAlert({ visible, title, message, onClose, type = "success" }: CustomAlertProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.alertContainer}>
          <View style={[styles.header, type === "error" ? styles.errorHeader : styles.successHeader]}>
            <Text style={styles.title}>{title}</Text>
          </View>
          <Text style={styles.message}>{message}</Text>
          <Pressable style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>OK</Text>
          </Pressable>
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
  alertContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    width: "85%",
    maxWidth: 400,
    overflow: "hidden",
    ...shadow.lg,
  },
  header: {
    padding: spacing.lg,
    alignItems: "center",
  },
  successHeader: {
    backgroundColor: colors.success,
  },
  errorHeader: {
    backgroundColor: colors.danger,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.surface,
  },
  message: {
    fontSize: 16,
    color: colors.text,
    padding: spacing.xl,
    textAlign: "center",
  },
  button: {
    backgroundColor: colors.primary,
    padding: 14,
    margin: spacing.lg,
    borderRadius: radius.sm,
    alignItems: "center",
  },
  buttonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "600",
  },
});
