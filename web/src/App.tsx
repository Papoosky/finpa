import { RouterProvider } from "@tanstack/react-router";
import { useAuth } from "./auth/AuthProvider";
import { LoadingScreen } from "./components/LoadingScreen";
import { LoginPage } from "./pages/LoginPage";
import { router } from "./router";

export function App() {
  const { status } = useAuth();
  if (status === "loading") return <LoadingScreen />;
  if (status === "anonymous") return <LoginPage />;
  return <RouterProvider router={router} />;
}
