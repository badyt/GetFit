import { View, Text, Pressable, StyleSheet, Modal } from "react-native";

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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  alertContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    width: "85%",
    maxWidth: 400,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    padding: 16,
    alignItems: "center",
  },
  successHeader: {
    backgroundColor: "#10b981",
  },
  errorHeader: {
    backgroundColor: "#ef4444",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  message: {
    fontSize: 16,
    color: "#374151",
    padding: 20,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#6366f1",
    padding: 14,
    margin: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
