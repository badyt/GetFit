import { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import useAuthStore from "../store/useAuthStore";
import { HISTORY_URL } from "../constants/api";
import CustomAlert from "./CustomAlert";

interface HistoryData {
  id: string;
  date: string;
  weight: number | null;
  calorieIntake: number | null;
  proteinIntake: number | null;
}

interface ProgressHistoryChartProps {
  userId?: string; // If provided, fetch data for this user; otherwise use authenticated user
  userName?: string; // Optional name to display in title
}

export default function ProgressHistoryChart({ userId, userName }: ProgressHistoryChartProps) {
  const token = useAuthStore((s) => s.token);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const targetUserId = userId || currentUserId;

  const getDefaultDates = () => {
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    return {
      start: lastMonth.toISOString().split("T")[0],
      end: today.toISOString().split("T")[0],
    };
  };

  const defaultDates = getDefaultDates();
  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);
  const [historyData, setHistoryData] = useState<HistoryData[]>([]);
  const [loading, setLoading] = useState(false);

  const [showWeight, setShowWeight] = useState(true);
  const [showCalories, setShowCalories] = useState(false);
  const [showProtein, setShowProtein] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState<"start" | "end" | null>(null);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth());

  const [alert, setAlert] = useState<{
    visible: boolean;
    type: "success" | "error";
    message: string;
  }>({ visible: false, type: "success", message: "" });

  useEffect(() => {
    fetchHistoryData();
  }, [targetUserId]);

  const fetchHistoryData = async () => {
    if (!startDate || !endDate) {
      setAlert({
        visible: true,
        type: "error",
        message: "Please select both start and end dates",
      });
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setAlert({
        visible: true,
        type: "error",
        message: "Start date must be before end date",
      });
      return;
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (new Date(startDate) > today || new Date(endDate) > today) {
      setAlert({
        visible: true,
        type: "error",
        message: "Cannot select future dates",
      });
      return;
    }

    try {
      setLoading(true);
      // Trainer viewing a trainee uses a different route than a trainee viewing their own history
      const isViewingOtherUser = userId && userId !== currentUserId?.toString();
      const url = isViewingOtherUser
        ? `${HISTORY_URL}/trainee/${userId}/range?startDate=${startDate}&endDate=${endDate}`
        : `${HISTORY_URL}/range?startDate=${startDate}&endDate=${endDate}`;
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setHistoryData(Array.isArray(data) ? data : []);
      } else {
        const text = await response.text();
        const error = text ? JSON.parse(text) : {};
        setAlert({
          visible: true,
          type: "error",
          message: error.message || error.error || "Failed to fetch history",
        });
      }
    } catch (error) {
      console.error("Error fetching history:", error);
      setAlert({
        visible: true,
        type: "error",
        message: "Network error. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (type: "start" | "end", days: number) => {
    const currentDate = type === "start" ? startDate : endDate;
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (newDate <= today) {
      const dateString = newDate.toISOString().split("T")[0];
      if (type === "start") {
        setStartDate(dateString);
      } else {
        setEndDate(dateString);
      }
    }
  };

  const canGoForwardStart = startDate < new Date().toISOString().split("T")[0];
  const canGoForwardEnd = endDate < new Date().toISOString().split("T")[0];

  const handleDateSelect = (day: number) => {
    const date = new Date(pickerYear, pickerMonth, day);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    if (date <= today) {
      const dateString = date.toISOString().split("T")[0];
      if (showDatePicker === "start") {
        setStartDate(dateString);
      } else if (showDatePicker === "end") {
        setEndDate(dateString);
      }
      setShowDatePicker(null);
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

  const getChartData = () => {
    const datasets = [];

    if (showWeight) {
      datasets.push({
        label: "Weight (kg)",
        data: historyData.map((d) => d.weight),
        color: "#3b82f6",
      });
    }

    if (showCalories) {
      datasets.push({
        label: "Calories (kcal)",
        data: historyData.map((d) => d.calorieIntake),
        color: "#10b981",
      });
    }

    if (showProtein) {
      datasets.push({
        label: "Protein (g)",
        data: historyData.map((d) => d.proteinIntake),
        color: "#f59e0b",
      });
    }

    return datasets;
  };

  const renderChart = () => {
    const datasets = getChartData();
    const screenWidth = Dimensions.get("window").width;
    const chartWidth = screenWidth - 40;
    const chartHeight = 300;
    const padding = { top: 20, right: 10, bottom: 40, left: 50 };
    const graphWidth = chartWidth - padding.left - padding.right;
    const graphHeight = chartHeight - padding.top - padding.bottom;

    if (datasets.length === 0) {
      return (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyText}>Select at least one metric to display</Text>
        </View>
      );
    }

    if (historyData.length === 0) {
      return (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyText}>No data available for the selected period</Text>
        </View>
      );
    }

    let allValues: number[] = [];
    datasets.forEach(dataset => {
      allValues = allValues.concat(dataset.data.filter(v => v !== null) as number[]);
    });

    if (allValues.length === 0) {
      return (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyText}>No recorded data for selected metrics</Text>
        </View>
      );
    }

    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const valueRange = maxValue - minValue || 1;
    const padding5Percent = valueRange * 0.1;
    const yMin = Math.max(0, minValue - padding5Percent);
    const yMax = maxValue + padding5Percent;
    const yRange = yMax - yMin;

    const getX = (index: number) => {
      return padding.left + (index / (historyData.length - 1 || 1)) * graphWidth;
    };

    const getY = (value: number | null) => {
      if (value === null) return null;
      return padding.top + graphHeight - ((value - yMin) / yRange) * graphHeight;
    };

    const yAxisLabels = [];
    const labelCount = 5;
    for (let i = 0; i <= labelCount; i++) {
      const value = yMin + (yRange * i / labelCount);
      const y = padding.top + graphHeight - (i / labelCount) * graphHeight;
      yAxisLabels.push({ value, y });
    }

    return (
      <View style={styles.chartContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View style={[styles.chart, { width: Math.max(chartWidth, historyData.length * 50) }]}>
            <View style={{ position: 'relative', height: chartHeight }}>
              
              {yAxisLabels.map((label, idx) => (
                <View
                  key={idx}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: label.y - 8,
                    width: padding.left - 5,
                    alignItems: 'flex-end',
                  }}
                >
                  <Text style={styles.axisLabel}>{label.value.toFixed(0)}</Text>
                </View>
              ))}

              {yAxisLabels.map((label, idx) => (
                <View
                  key={`grid-${idx}`}
                  style={{
                    position: 'absolute',
                    left: padding.left,
                    top: label.y,
                    width: Math.max(graphWidth, historyData.length * 50 - padding.left - padding.right),
                    height: 1,
                    backgroundColor: '#e5e7eb',
                  }}
                />
              ))}

              {datasets.map((dataset, datasetIdx) => {
                const points: { x: number; y: number; index: number; value: number }[] = [];
                
                dataset.data.forEach((value, index) => {
                  if (value !== null) {
                    const x = getX(index);
                    const y = getY(value);
                    if (y !== null) {
                      points.push({ x, y, index, value });
                    }
                  }
                });

                return (
                  <View key={datasetIdx}>
                    {points.map((point, idx) => {
                      if (idx === 0) return null;
                      const prevPoint = points[idx - 1];
                      
                      const gap = point.index - prevPoint.index;
                      if (gap > 3) return null;

                      const angle = Math.atan2(point.y - prevPoint.y, point.x - prevPoint.x);
                      const length = Math.sqrt(
                        Math.pow(point.x - prevPoint.x, 2) + 
                        Math.pow(point.y - prevPoint.y, 2)
                      );

                      return (
                        <View
                          key={`line-${datasetIdx}-${idx}`}
                          style={{
                            position: 'absolute',
                            left: prevPoint.x,
                            top: prevPoint.y,
                            width: length,
                            height: 3,
                            backgroundColor: dataset.color,
                            transform: [{ rotate: `${angle}rad` }],
                            transformOrigin: 'left center',
                          }}
                        />
                      );
                    })}

                    {points.map((point, idx) => (
                      <View key={`point-${datasetIdx}-${idx}`}>
                        <View
                          style={{
                            position: 'absolute',
                            left: point.x - 5,
                            top: point.y - 5,
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: dataset.color,
                            borderWidth: 2,
                            borderColor: '#fff',
                          }}
                        />
                        <View
                          style={{
                            position: 'absolute',
                            left: point.x - 20,
                            top: point.y - 25,
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 4,
                          }}
                        >
                          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>
                            {point.value.toFixed(1)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                );
              })}

              {historyData.map((data, index) => {
                const showEvery = Math.ceil(historyData.length / 7);
                if (index % showEvery !== 0 && index !== historyData.length - 1) return null;

                const date = new Date(data.date);
                const day = date.getDate();
                const month = date.getMonth() + 1;
                const x = getX(index);

                return (
                  <View
                    key={`xlabel-${index}`}
                    style={{
                      position: 'absolute',
                      left: x - 20,
                      top: padding.top + graphHeight + 10,
                      width: 40,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={styles.axisLabel}>{month}/{day}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>

        <View style={styles.legend}>
          {datasets.map((dataset, idx) => (
            <View key={idx} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: dataset.color }]} />
              <Text style={styles.legendText}>{dataset.label}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Date Range Selectors */}
      <View style={styles.dateSection}>
        <Text style={styles.sectionTitle}>
          {userName ? `${userName} Progress` : "Select Date Range"}
        </Text>

        <View style={styles.dateRow}>
          <View style={styles.dateLabelRow}>
            <Text style={styles.dateLabel}>From:</Text>
            {startDate !== defaultDates.start && (
              <Pressable
                style={styles.resetButton}
                onPress={() => setStartDate(defaultDates.start)}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.dateControlsWrapper}>
            <View style={styles.dateControls}>
              <Pressable
                style={({ pressed }) => [
                  styles.dateButton,
                  pressed && styles.dateButtonPressed
                ]}
                onPress={() => handleDateChange("start", -1)}
              >
                <Text style={styles.dateButtonText}>←</Text>
              </Pressable>
              <Pressable
                style={styles.dateValueButton}
                onPress={() => {
                  const currentDate = new Date(startDate);
                  setPickerYear(currentDate.getFullYear());
                  setPickerMonth(currentDate.getMonth());
                  setShowDatePicker("start");
                }}
              >
                <Text style={styles.dateValue}>{startDate}</Text>
                <Text style={styles.tapToSelect}>Tap to select</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.dateButton,
                  !canGoForwardStart && styles.dateButtonDisabled,
                  pressed && canGoForwardStart && styles.dateButtonPressed
                ]}
                onPress={() => handleDateChange("start", 1)}
                disabled={!canGoForwardStart}
              >
                <Text
                  style={[
                    styles.dateButtonText,
                    !canGoForwardStart && styles.dateButtonTextDisabled,
                  ]}
                >
                  →
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.dateRow}>
          <View style={styles.dateLabelRow}>
            <Text style={styles.dateLabel}>To:</Text>
            {endDate !== new Date().toISOString().split("T")[0] && (
              <Pressable
                style={styles.resetButton}
                onPress={() => setEndDate(new Date().toISOString().split("T")[0])}
              >
                <Text style={styles.resetButtonText}>Today</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.dateControlsWrapper}>
            <View style={styles.dateControls}>
              <Pressable
                style={({ pressed }) => [
                  styles.dateButton,
                  pressed && styles.dateButtonPressed
                ]}
                onPress={() => handleDateChange("end", -1)}
              >
                <Text style={styles.dateButtonText}>←</Text>
              </Pressable>
              <Pressable
                style={styles.dateValueButton}
                onPress={() => {
                  const currentDate = new Date(endDate);
                  setPickerYear(currentDate.getFullYear());
                  setPickerMonth(currentDate.getMonth());
                  setShowDatePicker("end");
                }}
              >
                <Text style={styles.dateValue}>{endDate}</Text>
                <Text style={styles.tapToSelect}>Tap to select</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.dateButton,
                  !canGoForwardEnd && styles.dateButtonDisabled,
                  pressed && canGoForwardEnd && styles.dateButtonPressed
                ]}
                onPress={() => handleDateChange("end", 1)}
                disabled={!canGoForwardEnd}
              >
                <Text
                  style={[
                    styles.dateButtonText,
                    !canGoForwardEnd && styles.dateButtonTextDisabled,
                  ]}
                >
                  →
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.fetchButton,
            loading && styles.fetchButtonDisabled,
            pressed && !loading && styles.fetchButtonPressed
          ]}
          onPress={fetchHistoryData}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.fetchButtonText}>Load Data</Text>
          )}
        </Pressable>
      </View>

      {/* Metric Checkboxes */}
      <View style={styles.checkboxSection}>
        <Text style={styles.sectionTitle}>Select Metrics</Text>

        <Pressable
          style={styles.checkboxRow}
          onPress={() => setShowWeight(!showWeight)}
        >
          <View
            style={[styles.checkbox, showWeight && styles.checkboxChecked]}
          >
            {showWeight && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>Weight (kg)</Text>
          <View style={[styles.colorDot, { backgroundColor: "#3b82f6" }]} />
        </Pressable>

        <Pressable
          style={styles.checkboxRow}
          onPress={() => setShowCalories(!showCalories)}
        >
          <View
            style={[styles.checkbox, showCalories && styles.checkboxChecked]}
          >
            {showCalories && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>Calorie Intake (kcal)</Text>
          <View style={[styles.colorDot, { backgroundColor: "#10b981" }]} />
        </Pressable>

        <Pressable
          style={styles.checkboxRow}
          onPress={() => setShowProtein(!showProtein)}
        >
          <View
            style={[styles.checkbox, showProtein && styles.checkboxChecked]}
          >
            {showProtein && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>Protein Intake (g)</Text>
          <View style={[styles.colorDot, { backgroundColor: "#f59e0b" }]} />
        </Pressable>
      </View>

      {/* Chart */}
      {!loading && renderChart()}

      {/* Date Picker Modal */}
      <View
        style={[
          styles.modalOverlay,
          { display: showDatePicker ? "flex" : "none" },
        ]}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowDatePicker(null)}
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
                const isSelected = dateStr === (showDatePicker === "start" ? startDate : endDate);
                
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
            onPress={() => setShowDatePicker(null)}
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  dateSection: {
    padding: 20,
    backgroundColor: "#fff",
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dateRow: {
    marginBottom: 20,
  },
  dateLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
  },
  resetButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: "#dbeafe",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#93c5fd",
  },
  resetButtonText: {
    fontSize: 12,
    color: "#3b82f6",
    fontWeight: "600",
  },
  dateControlsWrapper: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  dateControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    fontSize: 20,
    color: "#fff",
    fontWeight: "700",
  },
  dateButtonTextDisabled: {
    color: "#9ca3af",
  },
  dateValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  dateValueButton: {
    flex: 1,
    alignItems: "center",
  },
  tapToSelect: {
    fontSize: 10,
    color: "#3b82f6",
    marginTop: 2,
  },
  fetchButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  fetchButtonPressed: {
    backgroundColor: "#2563eb",
    transform: [{ scale: 0.98 }],
  },
  fetchButtonDisabled: {
    backgroundColor: "#93c5fd",
  },
  fetchButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  checkboxSection: {
    padding: 20,
    backgroundColor: "#fff",
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: "#d1d5db",
    borderRadius: 6,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  checkmark: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  checkboxLabel: {
    fontSize: 16,
    color: "#374151",
    flex: 1,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  chartContainer: {
    padding: 20,
    backgroundColor: "#fff",
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 32,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chart: {
    minHeight: 300,
  },
  axisLabel: {
    fontSize: 10,
    color: "#6b7280",
    fontWeight: "600",
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 16,
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
  },
  emptyChart: {
    padding: 40,
    alignItems: "center",
    backgroundColor: "#fff",
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
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
