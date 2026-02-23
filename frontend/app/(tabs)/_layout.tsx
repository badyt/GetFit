import { Tabs } from "expo-router";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import useAuthStore from "../../src/store/useAuthStore";

export default function TabsLayout() {
  const user = useAuthStore((s) => s.user);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !user) {
    return null;
  }

  const userRole = String(user.role || "").toUpperCase().trim();
  const isTrainer = userRole === "TRAINER";
  const isTrainee = userRole === "TRAINEE";
  const isAdmin = userRole === "ADMIN";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#6366f1",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 1,
          borderTopColor: "#e5e7eb",
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
        tabBarIconStyle: {
          marginBottom: -4,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="catalog"
        options={{
          title: "Catalog",
          tabBarStyle: { display: !isAdmin ? "flex" : "none" },
          href: !isAdmin ? undefined : null,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "grid" : "grid-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="plans"
        options={{
          title: "Plans",
          tabBarStyle: { display: isTrainee ? "flex" : "none" },
          href: isTrainee ? undefined : null,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "calendar" : "calendar-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "Progress",
          tabBarStyle: { display: isTrainee ? "flex" : "none" },
          href: isTrainee ? undefined : null,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "stats-chart" : "stats-chart-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="invite"
        options={{
          title: "Invite",
          tabBarStyle: { display: isTrainer ? "flex" : "none" },
          href: isTrainer ? undefined : null,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "mail" : "mail-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="trainees"
        options={{
          title: "Trainees",
          tabBarStyle: { display: isTrainer ? "flex" : "none" },
          href: isTrainer ? undefined : null,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "people" : "people-outline"} size={size} color={color} />
          ),
        }}
      />
      {/* ── Admin-only tabs ── */}
      <Tabs.Screen
        name="admin-users"
        options={{
          title: "Users",
          tabBarStyle: { display: isAdmin ? "flex" : "none" },
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "people-circle" : "people-circle-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="admin-food"
        options={{
          title: "Food",
          tabBarStyle: { display: isAdmin ? "flex" : "none" },
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "nutrition" : "nutrition-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="admin-exercises"
        options={{
          title: "Exercises",
          tabBarStyle: { display: isAdmin ? "flex" : "none" },
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "barbell" : "barbell-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
