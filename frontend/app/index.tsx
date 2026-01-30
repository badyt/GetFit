import { Redirect } from "expo-router";
import useAuthStore from "../src/store/useAuthStore";

export default function Index() {
  const { isAuthenticated } = useAuthStore();
  return <Redirect href={isAuthenticated ? "/home" : "/auth"} />;
}
