import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import useAuthStore from "../src/store/useAuthStore";
import { HISTORY_URL } from "../src/constants/api";
import CustomAlert from "../src/components/CustomAlert";

export default function RecordDay() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [weight, setWeight] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth());
  const [alert, setAlert] = useState<{
    visible: boolean;
    type: "success" | "error";
    message: string;
  }>({ visible: false, type: "success", message: "" });

  // Fetch data for the selected date
  useEffect(() => {
    fetchDayData();
  }, [selectedDate]);

  const fetchDayData = async () => {
    try {
      setFetching(true);
      const response = await fetch(`${HISTORY_URL}/${selectedDate}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const text = await response.text();
        const data = text ? JSON.parse(text) : null;
        if (data && Object.keys(data).length > 0) {
          setWeight(data.weight?.toString() || "");
          setCalories(data.calorieIntake?.toString() || "");
          setProtein(data.proteinIntake?.toString() || "");
        } else {
          setWeight("");
          setCalories("");
          setProtein("");
        }
      } else {
        // Non-ok response (e.g. 404) — just clear the fields silently
        setWeight("");
        setCalories("");
        setProtein("");
      }
    } catch (error) {
      // Silently clear fields — this is expected on dates with no data
      setWeight("");
      setCalories("");
      setProtein("");
    } finally {
      setFetching(false);
    }
  };

  const isValidDecimal = (value: string) => {
    if (!value) return true;
    // Check for valid decimal format: no leading dot, no trailing dot, no multiple dots
    if (value.startsWith('.') || value.endsWith('.')) return false;
    const dotCount = (value.match(/\./g) || []).length;
    if (dotCount > 1) return false;
    return /^\d+(\.\d+)?$/.test(value);
  };

  const isValidInteger = (value: string) => {
    if (!value) return true;
    return /^\d+$/.test(value);
  };

  const handleWeightChange = (text: string) => {
    // Allow only numbers and single dot
    const filtered = text.replace(/[^0-9.]/g, '');
    // Prevent multiple dots
    const dotCount = (filtered.match(/\./g) || []).length;
    if (dotCount > 1) return;
    setWeight(filtered);
  };

  const handleCaloriesChange = (text: string) => {
    // Allow only numbers (no decimals)
    const filtered = text.replace(/[^0-9]/g, '');
    setCalories(filtered);
  };

  const handleProteinChange = (text: string) => {
    // Allow only numbers (no decimals)
    const filtered = text.replace(/[^0-9]/g, '');
    setProtein(filtered);
  };

  const handleSave = async () => {
    // Validate at least one field is filled
    if (!weight && !calories && !protein) {
      setAlert({
        visible: true,
        type: "error",
        message: "Please enter at least one measurement",
      });
      return;
    }

    // Validate weight format and range
    if (weight) {
      if (!isValidDecimal(weight)) {
        setAlert({
          visible: true,
          type: "error",
          message: "Weight must be a valid number (e.g., 75 or 75.5)",
        });
        return;
      }
      const weightNum = Number(weight);
      if (isNaN(weightNum) || weightNum < 30 || weightNum > 300) {
        setAlert({
          visible: true,
          type: "error",
          message: "Weight must be between 30 and 300 kg",
        });
        return;
      }
    }

    // Validate calories format and range
    if (calories) {
      if (!isValidInteger(calories)) {
        setAlert({
          visible: true,
          type: "error",
          message: "Calories must be a whole number",
        });
        return;
      }
      const caloriesNum = Number(calories);
      if (isNaN(caloriesNum) || caloriesNum < 0 || caloriesNum > 15000) {
        setAlert({
          visible: true,
          type: "error",
          message: "Calories must be between 0 and 15000",
        });
        return;
      }
    }

    // Validate protein format and range
    if (protein) {
      if (!isValidInteger(protein)) {
        setAlert({
          visible: true,
          type: "error",
          message: "Protein must be a whole number",
        });
        return;
      }
      const proteinNum = Number(protein);
      if (isNaN(proteinNum) || proteinNum < 0 || proteinNum > 400) {
        setAlert({
          visible: true,
          type: "error",
          message: "Protein must be between 0 and 400 grams",
        });
        return;
      }
    }

    try {
      setLoading(true);

      const body: any = { date: selectedDate };
      if (weight) body.weight = Number(weight);
      if (calories) body.calorieIntake = Number(calories);
      if (protein) body.proteinIntake = Number(protein);

      const response = await fetch(HISTORY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setAlert({
          visible: true,
          type: "success",
          message: "Measurements saved successfully!",
        });
      } else {
        const error = await response.json();
        setAlert({
          visible: true,
          type: "error",
          message: error.error || "Failed to save measurements",
        });
      }
    } catch (error) {
      console.error("Error saving measurements:", error);
      setAlert({
        visible: true,
        type: "error",
        message: "Network error. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);

    // Don't allow future dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (newDate <= today) {
      setSelectedDate(newDate.toISOString().split("T")[0]);
    }
  };

  const isToday = selectedDate === new Date().toISOString().split("T")[0];
  const canGoForward =
    selectedDate < new Date().toISOString().split("T")[0];

  const handleDateSelect = (day: number) => {
    const date = new Date(pickerYear, pickerMonth, day);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    if (date <= today) {
      setSelectedDate(date.toISOString().split("T")[0]);
      setShowDatePicker(false);
    }
  };

  const changePickerMonth = (delta: number) => {
    let newMonth = pickerMonth + delta;
    let newYear = pickerYear;
    
    if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    } else if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    }
    
    setPickerMonth(newMonth);
    setPickerYear(newYear);
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const isDateInFuture = (year: number, month: number, day: number) => {
    const date = new Date(year, month, day);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return date > today;
  };

  const canGoToNextMonth = () => {
    const today = new Date();
    return pickerYear < today.getFullYear() || 
           (pickerYear === today.getFullYear() && pickerMonth < today.getMonth());
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Pressable 
          onPress={() => router.back()} 
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed
          ]}
        >
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Record Measurements</Text>
      </View>

      {/* Date Picker */}
      <View style={styles.dateContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.dateButton,
            pressed && styles.dateButtonPressed
          ]}
          onPress={() => handleDateChange(-1)}
        >
          <Text style={styles.dateButtonText}>←</Text>
        </Pressable>

        <View style={{ flex: 1, alignItems: "center" }}>
          <Pressable 
            style={styles.dateDisplay}
            onPress={() => {
              const currentDate = new Date(selectedDate);
              setPickerYear(currentDate.getFullYear());
              setPickerMonth(currentDate.getMonth());
              setShowDatePicker(true);
            }}
          >
            <Text style={styles.dateText}>{selectedDate}</Text>
            {isToday && <Text style={styles.todayBadge}>Today</Text>}
            <Text style={styles.tapToSelect}>Tap to select date</Text>
          </Pressable>
          
          {!isToday && (
            <Pressable
              style={styles.todayButton}
              onPress={() => setSelectedDate(new Date().toISOString().split("T")[0])}
            >
              <Text style={styles.todayButtonText}>Jump to Today</Text>
            </Pressable>
          )}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.dateButton,
            !canGoForward && styles.dateButtonDisabled,
            pressed && canGoForward && styles.dateButtonPressed
          ]}
          onPress={() => handleDateChange(1)}
          disabled={!canGoForward}
        >
          <Text
            style={[
              styles.dateButtonText,
              !canGoForward && styles.dateButtonTextDisabled,
            ]}
          >
            →
          </Text>
        </Pressable>
      </View>

      {fetching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <View style={styles.form}>
          {/* Weight Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Weight (kg)</Text>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={handleWeightChange}
              placeholder="Enter weight (30-300)"
              keyboardType="decimal-pad"
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* Calories Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Calorie Intake (kcal)</Text>
            <TextInput
              style={styles.input}
              value={calories}
              onChangeText={handleCaloriesChange}
              placeholder="Enter calories (0-15000)"
              keyboardType="number-pad"
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* Protein Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Protein Intake (g)</Text>
            <TextInput
              style={styles.input}
              value={protein}
              onChangeText={handleProteinChange}
              placeholder="Enter protein (0-400)"
              keyboardType="number-pad"
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* Save Button */}
          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              loading && styles.saveButtonDisabled,
              pressed && !loading && styles.saveButtonPressed
            ]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Measurements</Text>
            )}
          </Pressable>
        </View>
      )}

      {/* Date Picker Modal */}
      <View
        style={[
          styles.modalOverlay,
          { display: showDatePicker ? "flex" : "none" },
        ]}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowDatePicker(false)}
        />
        <View style={styles.datePickerModal}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => changePickerMonth(-1)}>
              <Text style={styles.modalNavButton}>←</Text>
            </Pressable>
            <Text style={styles.modalTitle}>
              {monthNames[pickerMonth]} {pickerYear}
            </Text>
            <Pressable 
              onPress={() => changePickerMonth(1)}
              disabled={!canGoToNextMonth()}
            >
              <Text style={[
                styles.modalNavButton,
                !canGoToNextMonth() && styles.modalNavButtonDisabled
              ]}>→</Text>
            </Pressable>
          </View>
          
          <Pressable
            style={styles.jumpToTodayButton}
            onPress={() => {
              const today = new Date();
              setPickerYear(today.getFullYear());
              setPickerMonth(today.getMonth());
            }}
          >
            <Text style={styles.jumpToTodayText}>📅 Jump to Current Month</Text>
          </Pressable>
          
          <View style={styles.calendarGrid}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <Text key={day} style={styles.weekdayLabel}>
                {day}
              </Text>
            ))}
            
            {Array.from({ length: getFirstDayOfMonth(pickerYear, pickerMonth) }).map(
              (_, i) => (
                <View key={`empty-${i}`} style={styles.calendarDay} />
              )
            )}
            
            {Array.from({ length: getDaysInMonth(pickerYear, pickerMonth) }).map(
              (_, i) => {
                const day = i + 1;
                const isFuture = isDateInFuture(pickerYear, pickerMonth, day);
                const date = new Date(pickerYear, pickerMonth, day);
                const dateStr = date.toISOString().split("T")[0];
                const isSelected = dateStr === selectedDate;
                
                return (
                  <Pressable
                    key={day}
                    style={[
                      styles.calendarDay,
                      isSelected && styles.calendarDaySelected,
                      isFuture && styles.calendarDayDisabled,
                    ]}
                    onPress={() => handleDateSelect(day)}
                    disabled={isFuture}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        isSelected && styles.calendarDayTextSelected,
                        isFuture && styles.calendarDayTextDisabled,
                      ]}
                    >
                      {day}
                    </Text>
                  </Pressable>
                );
              }
            )}
          </View>
          
          <Pressable
            style={styles.modalCloseButton}
            onPress={() => setShowDatePicker(false)}
          >
            <Text style={styles.modalCloseText}>Close</Text>
          </Pressable>
        </View>
      </View>

      <CustomAlert
        visible={alert.visible}
        type={alert.type}
        title={alert.type === "success" ? "Success" : "Error"}
        message={alert.message}
        onClose={() => setAlert({ ...alert, visible: false })}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    padding: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backButton: {
    marginBottom: 12,
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#eff6ff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  backButtonPressed: {
    backgroundColor: "#dbeafe",
    borderColor: "#93c5fd",
  },
  backText: {
    fontSize: 16,
    color: "#3b82f6",
    fontWeight: "600",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    backgroundColor: "#fff",
    marginVertical: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dateButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#2563eb",
  },
  dateButtonPressed: {
    backgroundColor: "#2563eb",
    transform: [{ scale: 0.95 }],
  },
  dateButtonDisabled: {
    backgroundColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    borderColor: "#d1d5db",
  },
  dateButtonText: {
    fontSize: 22,
    color: "#fff",
    fontWeight: "700",
  },
  dateButtonTextDisabled: {
    color: "#9ca3af",
  },
  dateDisplay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  dateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  tapToSelect: {
    fontSize: 11,
    color: "#3b82f6",
    marginTop: 2,
  },
  todayBadge: {
    fontSize: 12,
    color: "#3b82f6",
    fontWeight: "600",
    backgroundColor: "#dbeafe",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  todayButton: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#dbeafe",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#93c5fd",
  },
  todayButtonText: {
    fontSize: 12,
    color: "#3b82f6",
    fontWeight: "600",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6b7280",
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#111827",
  },
  saveButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonPressed: {
    backgroundColor: "#2563eb",
    transform: [{ scale: 0.98 }],
  },
  saveButtonDisabled: {
    backgroundColor: "#93c5fd",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  datePickerModal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "90%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  modalNavButton: {
    fontSize: 28,
    fontWeight: "700",
    color: "#3b82f6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#eff6ff",
    borderRadius: 8,
    overflow: "hidden",
  },
  modalNavButtonDisabled: {
    color: "#cbd5e1",
    backgroundColor: "#f9fafb",
  },
  jumpToTodayButton: {
    backgroundColor: "#dbeafe",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#93c5fd",
  },
  jumpToTodayText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3b82f6",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  weekdayLabel: {
    width: "14.28%",
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 8,
  },
  calendarDay: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 4,
  },
  calendarDaySelected: {
    backgroundColor: "#3b82f6",
    borderRadius: 8,
  },
  calendarDayDisabled: {
    opacity: 0.3,
  },
  calendarDayText: {
    fontSize: 14,
    color: "#111827",
  },
  calendarDayTextSelected: {
    color: "#fff",
    fontWeight: "700",
  },
  calendarDayTextDisabled: {
    color: "#cbd5e1",
  },
  modalCloseButton: {
    marginTop: 20,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
});
