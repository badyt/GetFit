import { Tabs } from "expo-router";
import { useEffect, useState } from "react";
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

  const userRole = String(user.role).toUpperCase().trim();
  const isTrainer = userRole === "TRAINER";
  const isTrainee = userRole === "TRAINEE";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "flex" },
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen
        name="invite"
        options={{
          title: "Invite",
          tabBarStyle: { display: isTrainer ? "flex" : "none" },
          href: isTrainer ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="trainees"
        options={{
          title: "Trainees",
          tabBarStyle: { display: isTrainer ? "flex" : "none" },
          href: isTrainer ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="join"
        options={{
          title: "Join",
          tabBarStyle: { display: isTrainee ? "flex" : "none" },
          href: isTrainee ? undefined : null,
        }}
      />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
