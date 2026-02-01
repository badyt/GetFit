import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import useAuthStore from "../src/store/useAuthStore";

export default function Index() {
  const { isAuthenticated, validateToken, isHydrated } = useAuthStore();
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // Wait for store to be hydrated from AsyncStorage
      let attempts = 0;
      while (!useAuthStore.getState().isHydrated && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 50));
        attempts++;
      }
      
      // Then validate the token
      await validateToken();
      setIsValidating(false);
    };

    checkAuth();
  }, []);

  if (!isHydrated || isValidating) {
    return null;
  }

  return <Redirect href={isAuthenticated ? "/home" : "/auth"} />;
}
