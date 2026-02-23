import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import useAuthStore from "../../src/store/useAuthStore";
import { BASE_URL, SERVER_BASE } from "../../src/constants/api";

type DashboardStats = {
  totalTrainees: number;
  traineesWithPlans: number;
  traineesNeedingPlans: number;
  recentActivity: Array<{
    traineeId: string;
    traineeName: string;
    profilePicture?: string;
    lastUpdate: string;
  }>;
};

type TodaysPlan = {
  mealPlan?: {
    name: string;
    meals: Array<{
      foodName: string;
      quantity: number;
      mealTime: string;
    }>;
  };
  workoutPlan?: {
    name: string;
    exercises: Array<{
      exerciseName: string;
      sets: number;
      reps: number;
    }>;
  };
};

type ProgressSummary = {
  latestWeight?: number;
  latestDate?: string;
  totalRecords: number;
  thisWeekRecords: number;
};

export default function Home() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const [loading, setLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [todaysPlan, setTodaysPlan] = useState<TodaysPlan | null>(null);
  const [progressSummary, setProgressSummary] = useState<ProgressSummary | null>(null);
  const [topTrainees, setTopTrainees] = useState<any[]>([]);

  const isTrainer = user?.role === "TRAINER";
  const isTrainee = user?.role === "TRAINEE";
  const isAdmin = user?.role === "ADMIN";

  // ── Admin state ──
  const [adminStats, setAdminStats] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      if (isTrainer) {
        await Promise.all([loadTrainerStats(), loadTopTrainees()]);
      } else if (isTrainee) {
        await Promise.all([loadTodaysPlan(), loadProgressSummary()]);
      } else if (isAdmin) {
        await loadAdminStats();
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAdminStats = async () => {
    try {
      const res = await fetch(`${BASE_URL}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setAdminStats(data.data);
      }
    } catch (error) {
      console.error("Error loading admin stats:", error);
    }
  };

  const loadTrainerStats = async () => {
    try {
      const res = await fetch(`${BASE_URL}/trainer/trainees`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.trainees) {
        const trainees = data.trainees;
        const stats: DashboardStats = {
          totalTrainees: trainees.length,
          traineesWithPlans: 0,
          traineesNeedingPlans: 0,
          recentActivity: [],
        };

        // Get plan counts
        for (const trainee of trainees) {
          const planRes = await fetch(`${BASE_URL}/trainer/trainee/${trainee.id}/plans`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const planData = await planRes.json();
          if (planData.mealPlan || planData.workoutPlan) {
            stats.traineesWithPlans++;
          } else {
            stats.traineesNeedingPlans++;
          }
        }

        setDashboardStats(stats);
      }
    } catch (error) {
      console.error("Error loading trainer stats:", error);
    }
  };

  const loadTopTrainees = async () => {
    try {
      const res = await fetch(`${BASE_URL}/trainer/trainees`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.trainees) {
        setTopTrainees(data.trainees.slice(0, 5));
      }
    } catch (error) {
      console.error("Error loading trainees:", error);
    }
  };

  const loadTodaysPlan = async () => {
    try {
      const dayOfWeek = new Date().getDay(); // 0 = Sunday, need to convert to 0 = Monday
      const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

      const [mealRes, workoutRes] = await Promise.all([
        fetch(`${BASE_URL}/plans/meal`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${BASE_URL}/plans/workout`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const plan: TodaysPlan = {};

      if (mealRes.ok) {
        const mealData = await mealRes.json();
        const todayMeals = mealData.mealDays?.find((d: any) => d.dayOfWeek === adjustedDay);
        if (todayMeals?.meals?.length > 0) {
          plan.mealPlan = {
            name: mealData.name,
            meals: todayMeals.meals.map((m: any) => ({
              foodName: m.food.name,
              quantity: m.quantity,
              mealTime: m.mealTime || "Anytime",
            })),
          };
        }
      }

      if (workoutRes.ok) {
        const workoutData = await workoutRes.json();
        const todayWorkout = workoutData.workoutDays?.find((d: any) => d.dayOfWeek === adjustedDay);
        if (todayWorkout?.exercises?.length > 0) {
          plan.workoutPlan = {
            name: workoutData.name,
            exercises: todayWorkout.exercises.map((e: any) => ({
              exerciseName: e.exercise.name,
              sets: e.sets,
              reps: e.reps,
            })),
          };
        }
      }

      setTodaysPlan(plan);
    } catch (error) {
      console.error("Error loading today's plan:", error);
    }
  };

  const loadProgressSummary = async () => {
    try {
      const endDate = new Date().toISOString().split("T")[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const res = await fetch(
        `${BASE_URL}/history/range/dates?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        const data = await res.json();
        const records = data.history || [];
        
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const thisWeekRecords = records.filter((r: any) => new Date(r.date) >= weekAgo);

        const latest = records.length > 0 ? records[records.length - 1] : null;

        setProgressSummary({
          latestWeight: latest?.weight,
          latestDate: latest?.date,
          totalRecords: records.length,
          thisWeekRecords: thisWeekRecords.length,
        });
      }
    } catch (error) {
      console.error("Error loading progress:", error);
    }
  };

  const getDayName = () => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[new Date().getDay()];
  };

  const getCurrentDayIndex = () => {
    const dayOfWeek = new Date().getDay(); // 0 = Sunday
    return dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to 0 = Monday
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          {user?.profilePicture ? (
            <Image
              source={{ uri: `${SERVER_BASE}${user.profilePicture}` }}
              style={styles.profilePic}
            />
          ) : (
            <View style={styles.profilePicPlaceholder}>
              <Text style={styles.profilePicText}>{user?.name?.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.headerText}>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name}</Text>
          </View>
        </View>
        <Pressable
          style={styles.profileButton}
          onPress={() => router.push("/(tabs)/profile")}
        >
          <Ionicons name="settings-outline" size={24} color="#6b7280" />
        </Pressable>
      </View>

      {/* Trainee Dashboard */}
      {isTrainee && (
        <View style={styles.content}>
          {/* Today's Focus */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📅 Today's Focus - {getDayName()}</Text>
            
            {todaysPlan?.workoutPlan ? (
              <Pressable
                style={styles.planCard}
                onPress={() => router.push(`/workout-day-detail?day=${getCurrentDayIndex()}`)}
              >
                <View style={styles.planCardHeader}>
                  <Ionicons name="barbell" size={24} color="#6366f1" />
                  <View style={styles.planCardHeaderText}>
                    <Text style={styles.planCardTitle}>Today's Workout</Text>
                    <Text style={styles.planCardSubtitle}>{todaysPlan.workoutPlan.name}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </View>
                <View style={styles.planCardContent}>
                  {todaysPlan.workoutPlan.exercises.slice(0, 3).map((ex, idx) => (
                    <Text key={idx} style={styles.planItem}>
                      • {ex.exerciseName} - {ex.sets}x{ex.reps}
                    </Text>
                  ))}
                  {todaysPlan.workoutPlan.exercises.length > 3 && (
                    <Text style={styles.planItemMore}>
                      +{todaysPlan.workoutPlan.exercises.length - 3} more exercises
                    </Text>
                  )}
                </View>
              </Pressable>
            ) : (
              <View style={styles.emptyCard}>
                <Ionicons name="barbell-outline" size={32} color="#9ca3af" />
                <Text style={styles.emptyCardText}>No workout scheduled for today</Text>
              </View>
            )}

            {todaysPlan?.mealPlan ? (
              <Pressable
                style={styles.planCard}
                onPress={() => router.push(`/meal-day-detail?day=${getCurrentDayIndex()}`)}
              >
                <View style={styles.planCardHeader}>
                  <Ionicons name="restaurant" size={24} color="#10b981" />
                  <View style={styles.planCardHeaderText}>
                    <Text style={styles.planCardTitle}>Today's Meals</Text>
                    <Text style={styles.planCardSubtitle}>{todaysPlan.mealPlan.name}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </View>
                <View style={styles.planCardContent}>
                  {todaysPlan.mealPlan.meals.slice(0, 3).map((meal, idx) => (
                    <Text key={idx} style={styles.planItem}>
                      • {meal.foodName} - {meal.quantity}g ({meal.mealTime})
                    </Text>
                  ))}
                  {todaysPlan.mealPlan.meals.length > 3 && (
                    <Text style={styles.planItemMore}>
                      +{todaysPlan.mealPlan.meals.length - 3} more meals
                    </Text>
                  )}
                </View>
              </Pressable>
            ) : (
              <View style={styles.emptyCard}>
                <Ionicons name="restaurant-outline" size={32} color="#9ca3af" />
                <Text style={styles.emptyCardText}>No meals planned for today</Text>
              </View>
            )}
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              <Pressable
                style={[styles.quickActionCard, { backgroundColor: "#eef2ff" }]}
                onPress={() => router.push("/record-day")}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: "#6366f1" }]}>
                  <Ionicons name="create" size={24} color="#fff" />
                </View>
                <Text style={styles.quickActionTitle}>Record Day</Text>
                <Text style={styles.quickActionSubtitle}>Log measurements</Text>
              </Pressable>

              <Pressable
                style={[styles.quickActionCard, { backgroundColor: "#f0fdf4" }]}
                onPress={() => router.push("/history-chart")}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: "#10b981" }]}>
                  <Ionicons name="analytics" size={24} color="#fff" />
                </View>
                <Text style={styles.quickActionTitle}>View Progress</Text>
                <Text style={styles.quickActionSubtitle}>Charts & graphs</Text>
              </Pressable>

              <Pressable
                style={[styles.quickActionCard, { backgroundColor: "#fef3c7" }]}
                onPress={() => router.push("/(tabs)/plans")}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: "#f59e0b" }]}>
                  <Ionicons name="restaurant" size={24} color="#fff" />
                </View>
                <Text style={styles.quickActionTitle}>Meal Plan</Text>
                <Text style={styles.quickActionSubtitle}>View full plan</Text>
              </Pressable>

              <Pressable
                style={[styles.quickActionCard, { backgroundColor: "#fee2e2" }]}
                onPress={() => router.push("/(tabs)/plans")}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: "#ef4444" }]}>
                  <Ionicons name="barbell" size={24} color="#fff" />
                </View>
                <Text style={styles.quickActionTitle}>Workout Plan</Text>
                <Text style={styles.quickActionSubtitle}>View full plan</Text>
              </Pressable>
            </View>
          </View>

          {/* Progress Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Progress Summary</Text>
            <View style={styles.statsCard}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {progressSummary?.latestWeight?.toFixed(1) || "N/A"}
                </Text>
                <Text style={styles.statLabel}>Current Weight (kg)</Text>
                {progressSummary?.latestDate && (
                  <Text style={styles.statDate}>
                    {new Date(progressSummary.latestDate).toLocaleDateString()}
                  </Text>
                )}
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{progressSummary?.thisWeekRecords || 0}</Text>
                <Text style={styles.statLabel}>Logged This Week</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{progressSummary?.totalRecords || 0}</Text>
                <Text style={styles.statLabel}>Total Records</Text>
              </View>
            </View>
          </View>

          {/* Trainer Info */}
          {user?.trainer && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>👨‍🏫 Your Trainer</Text>
              <View style={styles.trainerCard}>
                {user.trainer.profilePicture ? (
                  <Image
                    source={{ uri: `${SERVER_BASE}${user.trainer.profilePicture}` }}
                    style={styles.trainerPic}
                  />
                ) : (
                  <View style={styles.trainerPicPlaceholder}>
                    <Text style={styles.trainerPicText}>
                      {user.trainer.name?.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.trainerInfo}>
                  <Text style={styles.trainerName}>{user.trainer.name}</Text>
                  <Text style={styles.trainerLabel}>Personal Trainer</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Trainer Dashboard */}
      {isTrainer && (
        <View style={styles.content}>
          {/* Overview Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📈 Overview</Text>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: "#eef2ff" }]}>
                <Ionicons name="people" size={32} color="#6366f1" />
                <Text style={styles.statCardValue}>{dashboardStats?.totalTrainees || 0}</Text>
                <Text style={styles.statCardLabel}>Total Trainees</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: "#f0fdf4" }]}>
                <Ionicons name="checkmark-circle" size={32} color="#10b981" />
                <Text style={styles.statCardValue}>{dashboardStats?.traineesWithPlans || 0}</Text>
                <Text style={styles.statCardLabel}>With Plans</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: "#fef3c7" }]}>
                <Ionicons name="alert-circle" size={32} color="#f59e0b" />
                <Text style={styles.statCardValue}>{dashboardStats?.traineesNeedingPlans || 0}</Text>
                <Text style={styles.statCardLabel}>Need Plans</Text>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              <Pressable
                style={[styles.quickActionCard, { backgroundColor: "#eef2ff" }]}
                onPress={() => router.push("/(tabs)/invite")}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: "#6366f1" }]}>
                  <Ionicons name="person-add" size={24} color="#fff" />
                </View>
                <Text style={styles.quickActionTitle}>Invite Trainee</Text>
                <Text style={styles.quickActionSubtitle}>Send invitation</Text>
              </Pressable>

              <Pressable
                style={[styles.quickActionCard, { backgroundColor: "#f0fdf4" }]}
                onPress={() => router.push("/(tabs)/trainees")}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: "#10b981" }]}>
                  <Ionicons name="people" size={24} color="#fff" />
                </View>
                <Text style={styles.quickActionTitle}>All Trainees</Text>
                <Text style={styles.quickActionSubtitle}>Manage trainees</Text>
              </Pressable>

              <Pressable
                style={[styles.quickActionCard, { backgroundColor: "#fef3c7" }]}
                onPress={() => router.push("/(tabs)/catalog")}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: "#f59e0b" }]}>
                  <Ionicons name="grid" size={24} color="#fff" />
                </View>
                <Text style={styles.quickActionTitle}>Catalog</Text>
                <Text style={styles.quickActionSubtitle}>Browse exercises</Text>
              </Pressable>

              <Pressable
                style={[styles.quickActionCard, { backgroundColor: "#fee2e2" }]}
                onPress={() => router.push("/(tabs)/profile")}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: "#ef4444" }]}>
                  <Ionicons name="settings" size={24} color="#fff" />
                </View>
                <Text style={styles.quickActionTitle}>Settings</Text>
                <Text style={styles.quickActionSubtitle}>Manage profile</Text>
              </Pressable>
            </View>
          </View>

          {/* Recent Trainees */}
          {topTrainees.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>👥 Your Trainees</Text>
                <Pressable onPress={() => router.push("/(tabs)/trainees")}>
                  <Text style={styles.viewAllText}>View All →</Text>
                </Pressable>
              </View>
              <View style={styles.traineesList}>
                {topTrainees.map((trainee) => (
                  <Pressable
                    key={trainee.id}
                    style={styles.traineeItem}
                    onPress={() =>
                      router.push(
                        `/trainee-detail?id=${trainee.id}&name=${encodeURIComponent(
                          trainee.name
                        )}&profilePicture=${encodeURIComponent(trainee.profilePicture || "")}`
                      )
                    }
                  >
                    {trainee.profilePicture ? (
                      <Image
                        source={{ uri: `${SERVER_BASE}${trainee.profilePicture}` }}
                        style={styles.traineeItemPic}
                      />
                    ) : (
                      <View style={styles.traineeItemPicPlaceholder}>
                        <Text style={styles.traineeItemPicText}>
                          {trainee.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.traineeItemInfo}>
                      <Text style={styles.traineeItemName}>{trainee.name}</Text>
                      <Text style={styles.traineeItemEmail}>{trainee.email}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Admin Dashboard */}
      {isAdmin && (
        <View style={styles.content}>
          {/* Overview Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🛡️ Admin Overview</Text>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: "#eef2ff" }]}>
                <Ionicons name="people" size={32} color="#6366f1" />
                <Text style={styles.statCardValue}>{adminStats?.totalUsers || 0}</Text>
                <Text style={styles.statCardLabel}>Total Users</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: "#f0fdf4" }]}>
                <Ionicons name="shield-checkmark" size={32} color="#10b981" />
                <Text style={styles.statCardValue}>{adminStats?.trainers || 0}</Text>
                <Text style={styles.statCardLabel}>Trainers</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: "#fef3c7" }]}>
                <Ionicons name="fitness" size={32} color="#f59e0b" />
                <Text style={styles.statCardValue}>{adminStats?.trainees || 0}</Text>
                <Text style={styles.statCardLabel}>Trainees</Text>
              </View>
            </View>
          </View>

          {/* Content Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📦 Content</Text>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: "#fce7f3" }]}>
                <Ionicons name="nutrition" size={32} color="#ec4899" />
                <Text style={styles.statCardValue}>{adminStats?.foods || 0}</Text>
                <Text style={styles.statCardLabel}>Foods</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: "#e0e7ff" }]}>
                <Ionicons name="barbell" size={32} color="#6366f1" />
                <Text style={styles.statCardValue}>{adminStats?.exercises || 0}</Text>
                <Text style={styles.statCardLabel}>Exercises</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: "#f0fdf4" }]}>
                <Ionicons name="folder" size={32} color="#10b981" />
                <Text style={styles.statCardValue}>{adminStats?.categories || 0}</Text>
                <Text style={styles.statCardLabel}>Categories</Text>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              <Pressable
                style={[styles.quickActionCard, { backgroundColor: "#eef2ff" }]}
                onPress={() => router.push("/(tabs)/admin-users" as any)}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: "#6366f1" }]}>
                  <Ionicons name="people-circle" size={24} color="#fff" />
                </View>
                <Text style={styles.quickActionTitle}>Manage Users</Text>
                <Text style={styles.quickActionSubtitle}>View & edit roles</Text>
              </Pressable>

              <Pressable
                style={[styles.quickActionCard, { backgroundColor: "#fce7f3" }]}
                onPress={() => router.push("/(tabs)/admin-food" as any)}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: "#ec4899" }]}>
                  <Ionicons name="nutrition" size={24} color="#fff" />
                </View>
                <Text style={styles.quickActionTitle}>Add Food</Text>
                <Text style={styles.quickActionSubtitle}>Manage catalog</Text>
              </Pressable>

              <Pressable
                style={[styles.quickActionCard, { backgroundColor: "#e0e7ff" }]}
                onPress={() => router.push("/(tabs)/admin-exercises" as any)}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: "#6366f1" }]}>
                  <Ionicons name="barbell" size={24} color="#fff" />
                </View>
                <Text style={styles.quickActionTitle}>Add Exercise</Text>
                <Text style={styles.quickActionSubtitle}>Manage catalog</Text>
              </Pressable>

              <Pressable
                style={[styles.quickActionCard, { backgroundColor: "#fee2e2" }]}
                onPress={() => router.push("/(tabs)/profile")}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: "#ef4444" }]}>
                  <Ionicons name="settings" size={24} color="#fff" />
                </View>
                <Text style={styles.quickActionTitle}>Settings</Text>
                <Text style={styles.quickActionSubtitle}>Manage profile</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
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
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  profilePic: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  profilePicPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
  },
  profilePicText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
  },
  headerText: {
    gap: 2,
  },
  greeting: {
    fontSize: 14,
    color: "#6b7280",
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  profileButton: {
    padding: 8,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    color: "#6366f1",
    fontWeight: "600",
  },
  planCard: {
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
  planCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  planCardHeaderText: {
    flex: 1,
  },
  planCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  planCardSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },
  planCardContent: {
    gap: 6,
  },
  planItem: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  planItemMore: {
    fontSize: 13,
    color: "#6b7280",
    fontStyle: "italic",
    marginTop: 4,
  },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 12,
  },
  emptyCardText: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 8,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickActionCard: {
    width: "48%",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    minHeight: 120,
    justifyContent: "center",
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginTop: 4,
    textAlign: "center",
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
    textAlign: "center",
  },
  statsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#6366f1",
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
    textAlign: "center",
  },
  statDate: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 8,
  },
  trainerCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  trainerPic: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  trainerPicPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
  },
  trainerPicText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
  },
  trainerInfo: {
    flex: 1,
  },
  trainerName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  trainerLabel: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  statCardValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#111827",
  },
  statCardLabel: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
  },
  traineesList: {
    gap: 8,
  },
  traineeItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  traineeItemPic: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  traineeItemPicPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
  },
  traineeItemPicText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  traineeItemInfo: {
    flex: 1,
  },
  traineeItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  traineeItemEmail: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },
  bottomPadding: {
    height: 20,
  },
});